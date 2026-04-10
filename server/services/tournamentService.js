const crypto = require("crypto");
const Razorpay = require("razorpay");
const Tournament = require("../models/Tournament");
const TournamentRegistration = require("../models/TournamentRegistration");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { TOURNAMENT_DEFAULTS, TOURNAMENT_MODES } = require("../config/constants");
const matchService = require("./matchService");
const bracketService = require("./bracketService");
const walletService = require("./walletService");

const TOURNAMENT_SELECT =
  "_id title game mode type entryFee prizePool maxPlayers maxTeams playersPerTeam maxSlots filledSlots joinedPlayers status startTime tournamentStartTime name dateTime participants registrationStartTime registrationEndTime isRegistrationClosed createdAt";
const MAX_LIMIT = TOURNAMENT_DEFAULTS.MAX_QUERY_LIMIT;
const LIVE_WINDOW_MINUTES = Number(
  process.env.TOURNAMENT_LIVE_WINDOW_MINUTES || TOURNAMENT_DEFAULTS.LIVE_WINDOW_MINUTES
);
const LIVE_WINDOW_MS = LIVE_WINDOW_MINUTES * 60 * 1000;
const RAZORPAY_CURRENCY = process.env.RAZORPAY_CURRENCY || "INR";
const TYPE_PLAYERS_MAP = Object.freeze({
  solo: 1,
  duo: 2,
  squad: 4
});

let razorpayClient = null;

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, MAX_LIMIT);
};

const normalizeText = (value) => String(value || "").trim();

const normalizeTournamentType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "solo" || normalized === "duo" || normalized === "squad") {
    return normalized;
  }

  return "squad";
};

const resolvePlayersPerTeam = (tournament) => {
  const normalizedType = normalizeTournamentType(tournament?.type);
  return TYPE_PLAYERS_MAP[normalizedType] || 4;
};

const resolveMaxTeams = (tournament) => {
  const playersPerTeam = resolvePlayersPerTeam(tournament);
  const parsedMaxTeams = Number.parseInt(tournament?.maxTeams, 10);
  if (Number.isFinite(parsedMaxTeams) && parsedMaxTeams > 0) {
    return parsedMaxTeams;
  }

  const parsedMaxSlots = Number.parseInt(tournament?.maxSlots, 10);
  if (Number.isFinite(parsedMaxSlots) && parsedMaxSlots > 0) {
    return parsedMaxSlots;
  }

  const parsedMaxPlayers = Number.parseInt(tournament?.maxPlayers, 10);
  if (Number.isFinite(parsedMaxPlayers) && parsedMaxPlayers > 0) {
    return Math.max(1, Math.ceil(parsedMaxPlayers / playersPerTeam));
  }

  return Math.max(1, Math.ceil(TOURNAMENT_DEFAULTS.MAX_PLAYERS / playersPerTeam));
};

const resolveMaxSlots = (tournament) => {
  const parsedMaxSlots = Number.parseInt(tournament?.maxSlots, 10);
  if (Number.isFinite(parsedMaxSlots) && parsedMaxSlots > 0) {
    return parsedMaxSlots;
  }

  return resolveMaxTeams(tournament);
};

const resolveFilledSlots = (tournament) => {
  const joinedPlayers = Array.isArray(tournament?.joinedPlayers)
    ? tournament.joinedPlayers
    : Array.isArray(tournament?.participants)
      ? tournament.participants
      : [];

  const joinedCount = joinedPlayers.length;
  const parsedFilledSlots = Number.parseInt(tournament?.filledSlots, 10);
  if (Number.isFinite(parsedFilledSlots) && parsedFilledSlots >= joinedCount) {
    return parsedFilledSlots;
  }

  return joinedCount;
};

const normalizeAmount = (amount) => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError("Amount must be valid", 400);
  }

  return Number(parsed.toFixed(2));
};

const toPaisa = (amount) => Math.round(normalizeAmount(amount) * 100);

const createReference = (prefix) => {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new AppError("Razorpay credentials are not configured", 500);
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }

  return razorpayClient;
};

const resolveTournamentStatus = (tournament, nowMs = Date.now()) => {
  if (tournament.status === "completed") {
    return "completed";
  }

  const startTimeValue = tournament.tournamentStartTime || tournament.startTime || tournament.dateTime;
  const startTimeMs = new Date(startTimeValue).getTime();
  if (Number.isNaN(startTimeMs)) {
    return tournament.status || "upcoming";
  }

  if (startTimeMs > nowMs) {
    return "upcoming";
  }

  if (nowMs - startTimeMs <= LIVE_WINDOW_MS) {
    return "live";
  }

  return "completed";
};

const toTimestampOrNull = (value) => {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const resolveRegistrationWindow = (tournament) => {
  const registrationStartMs = toTimestampOrNull(
    tournament.registrationStartTime || tournament.createdAt
  );
  const registrationEndMs = toTimestampOrNull(
    tournament.registrationEndTime || tournament.tournamentStartTime || tournament.startTime || tournament.dateTime
  );

  return {
    registrationStartMs,
    registrationEndMs
  };
};

const resolveRegistrationGate = (tournament, nowMs = Date.now()) => {
  const { registrationStartMs, registrationEndMs } = resolveRegistrationWindow(tournament);
  const maxSlots = resolveMaxSlots(tournament);
  const filledSlots = resolveFilledSlots(tournament);

  if (registrationStartMs !== null && nowMs < registrationStartMs) {
    return {
      code: "not_started",
      message: "Registration not started",
      shouldAutoClose: false
    };
  }

  if (registrationEndMs !== null && nowMs > registrationEndMs) {
    return {
      code: "closed",
      message: "Registration closed",
      shouldAutoClose: true
    };
  }

  if (maxSlots > 0 && filledSlots >= maxSlots) {
    return {
      code: "full",
      message: "Tournament full",
      shouldAutoClose: true
    };
  }

  if (Boolean(tournament?.isRegistrationClosed)) {
    return {
      code: "closed_by_admin",
      message: "Closed by admin",
      shouldAutoClose: false
    };
  }

  return {
    code: "open",
    message: "open",
    shouldAutoClose: false
  };
};

const resolveRegistrationStatus = (tournament, nowMs = Date.now()) => resolveRegistrationGate(tournament, nowMs).code;

const assertRegistrationWindowOpen = async (tournament, nowMs = Date.now()) => {
  const gate = resolveRegistrationGate(tournament, nowMs);

  if (gate.shouldAutoClose && !Boolean(tournament?.isRegistrationClosed) && tournament?._id) {
    await Tournament.updateOne(
      {
        _id: tournament._id,
        isRegistrationClosed: { $ne: true }
      },
      {
        $set: {
          isRegistrationClosed: true
        }
      }
    );
  }

  if (gate.code !== "open") {
    throw new AppError(gate.message, 400);
  }
};

const serializeTournament = (tournament, nowMs = Date.now()) => {
  const type = normalizeTournamentType(tournament?.type);
  const playersPerTeam = resolvePlayersPerTeam(tournament);
  const maxTeams = resolveMaxTeams(tournament);
  const maxSlots = resolveMaxSlots(tournament);
  const maxPlayers = Math.max(1, maxTeams * playersPerTeam);
  const { registrationStartMs, registrationEndMs } = resolveRegistrationWindow(tournament);
  const joinedPlayers = Array.isArray(tournament.joinedPlayers)
    ? tournament.joinedPlayers
    : Array.isArray(tournament.participants)
      ? tournament.participants
      : [];
  const filledSlots = resolveFilledSlots(tournament);
  const registrationGate = resolveRegistrationGate(
    {
      ...tournament,
      maxSlots,
      filledSlots
    },
    nowMs
  );
  const percentage = maxSlots > 0 ? Math.min(100, Math.round((filledSlots / maxSlots) * 100)) : 0;

  return {
    _id: tournament._id,
    title: tournament.title || tournament.name || "Tournament",
    game: tournament.game || TOURNAMENT_DEFAULTS.GAME,
    mode: tournament.mode || "BR",
    type,
    entryFee: Number(tournament.entryFee || 0),
    prizePool: Number(tournament.prizePool || 0),
    maxTeams,
    playersPerTeam,
    maxPlayers,
    maxSlots,
    filledSlots,
    percentage,
    availableSlots: Math.max(0, maxSlots - filledSlots),
    joinedPlayers,
    status: resolveTournamentStatus(tournament, nowMs),
    tournamentStartTime:
      tournament.tournamentStartTime || tournament.startTime || tournament.dateTime || null,
    startTime: tournament.startTime || tournament.tournamentStartTime || tournament.dateTime || null,
    registrationStartTime: registrationStartMs !== null ? new Date(registrationStartMs) : null,
    registrationEndTime: registrationEndMs !== null ? new Date(registrationEndMs) : null,
    isRegistrationClosed: Boolean(tournament.isRegistrationClosed || registrationGate.shouldAutoClose),
    registrationStatus: registrationGate.code
  };
};

const fetchTournamentList = async ({ filter = {}, sort = { startTime: 1 }, limit = 0 }) => {
  let query = Tournament.find(filter).select(TOURNAMENT_SELECT).sort(sort).lean();

  if (limit) {
    query = query.limit(limit);
  }

  const tournaments = await query;
  const nowMs = Date.now();
  const autoCloseIds = [];

  const serialized = tournaments.map((tournament) => {
    const gate = resolveRegistrationGate(tournament, nowMs);
    if (gate.shouldAutoClose && !Boolean(tournament.isRegistrationClosed) && tournament?._id) {
      autoCloseIds.push(tournament._id);
    }

    return serializeTournament(tournament, nowMs);
  });

  if (autoCloseIds.length) {
    await Tournament.updateMany(
      {
        _id: { $in: autoCloseIds },
        isRegistrationClosed: { $ne: true }
      },
      {
        $set: {
          isRegistrationClosed: true
        }
      }
    );
  }

  return serialized;
};

const buildAtomicJoinFilter = (tournamentId, userId) => ({
  _id: tournamentId,
  status: { $ne: "completed" },
  joinedPlayers: { $ne: userId },
  $expr: {
    $and: [
      { $lt: [{ $size: { $ifNull: ["$joinedPlayers", []] } }, "$maxPlayers"] },
      { $lt: [{ $ifNull: ["$filledSlots", 0] }, { $ifNull: ["$maxSlots", "$maxPlayers"] }] }
    ]
  }
});

const syncTournamentSlotCounters = async (tournamentId) => {
  const tournament = await Tournament.findById(tournamentId).select(
    "_id type maxPlayers maxTeams playersPerTeam maxSlots filledSlots joinedPlayers participants isRegistrationClosed"
  );

  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  const joinedPlayers = Array.isArray(tournament.joinedPlayers)
    ? tournament.joinedPlayers
    : Array.isArray(tournament.participants)
      ? tournament.participants
      : [];
  const joinedCount = joinedPlayers.length;

  const normalizedType = normalizeTournamentType(tournament.type);
  const normalizedPlayersPerTeam = TYPE_PLAYERS_MAP[normalizedType] || 4;
  const normalizedMaxTeams = Math.max(1, resolveMaxTeams(tournament));
  const normalizedMaxSlots = Math.max(1, resolveMaxSlots(tournament));
  const normalizedMaxPlayers = Math.max(1, normalizedMaxTeams * normalizedPlayersPerTeam);
  const currentFilled = Number.isFinite(Number(tournament.filledSlots))
    ? Number(tournament.filledSlots)
    : 0;
  const normalizedFilled = Math.max(currentFilled, joinedCount);
  const shouldCloseRegistration = normalizedFilled >= normalizedMaxSlots;
  const storedType = String(tournament.type || "").trim().toLowerCase();

  if (
    storedType !== normalizedType ||
    normalizedPlayersPerTeam !== Number(tournament.playersPerTeam) ||
    normalizedMaxTeams !== Number(tournament.maxTeams) ||
    normalizedMaxSlots !== Number(tournament.maxSlots) ||
    normalizedMaxPlayers !== Number(tournament.maxPlayers) ||
    normalizedFilled !== Number(tournament.filledSlots) ||
    (shouldCloseRegistration && !Boolean(tournament.isRegistrationClosed))
  ) {
    await Tournament.updateOne(
      { _id: tournament._id },
      {
        $set: {
          type: normalizedType,
          playersPerTeam: normalizedPlayersPerTeam,
          maxTeams: normalizedMaxTeams,
          maxSlots: normalizedMaxSlots,
          maxPlayers: normalizedMaxPlayers,
          filledSlots: normalizedFilled,
          isRegistrationClosed: shouldCloseRegistration || Boolean(tournament.isRegistrationClosed)
        }
      }
    );
  }
};

const assertJoinFailureReason = async (tournamentId, userId) => {
  const latestTournament = await Tournament.findById(tournamentId).select(
    "_id maxPlayers maxTeams playersPerTeam maxSlots filledSlots joinedPlayers status startTime tournamentStartTime dateTime registrationStartTime registrationEndTime isRegistrationClosed"
  );

  if (!latestTournament) {
    throw new AppError("Tournament not found", 404);
  }

  const latestStatus = resolveTournamentStatus(latestTournament.toObject());
  if (latestStatus === "completed") {
    throw new AppError("Tournament is already completed", 400);
  }

  const latestJoined = Array.isArray(latestTournament.joinedPlayers)
    ? latestTournament.joinedPlayers
    : [];

  if (latestJoined.some((participant) => participant.equals(userId))) {
    throw new AppError("You have already joined this tournament", 400);
  }

  const registrationGate = resolveRegistrationGate(latestTournament.toObject());
  if (registrationGate.code === "not_started") {
    throw new AppError("Registration not started", 400);
  }

  if (registrationGate.code === "closed") {
    throw new AppError("Registration closed", 400);
  }

  if (registrationGate.code === "closed_by_admin") {
    throw new AppError("Closed by admin", 400);
  }

  if (registrationGate.code === "full") {
    throw new AppError("Tournament full", 400);
  }

  const maxSlots = resolveMaxSlots(latestTournament.toObject());
  const filledSlots = Math.max(Number(latestTournament.filledSlots || 0), latestJoined.length);

  if (filledSlots >= maxSlots || latestJoined.length >= Number(latestTournament.maxPlayers || 0)) {
    throw new AppError("Tournament full", 400);
  }

  throw new AppError("Tournament join could not be completed", 409);
};

const createTeamId = (joinType, source) => {
  if (joinType === "solo") {
    return `SOLO-${normalizeText(source).replace(/\s+/g, "").toUpperCase().slice(-8)}`;
  }

  const slug = normalizeText(source)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 8);

  return `SQD-${slug || "TEAM"}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
};

const finalizeTournamentJoinWithSlot = async (tournamentId, userId, io) => {
  await syncTournamentSlotCounters(tournamentId);

  const updatedTournament = await Tournament.findOneAndUpdate(
    buildAtomicJoinFilter(tournamentId, userId),
    {
      $addToSet: {
        joinedPlayers: userId,
        participants: userId
      },
      $inc: {
        filledSlots: 1
      }
    },
    {
      new: true,
      select: TOURNAMENT_SELECT
    }
  );

  if (!updatedTournament) {
    await assertJoinFailureReason(tournamentId, userId);
  }

  await matchService.joinUserToTournamentMatch(updatedTournament, userId, io);

  await User.findByIdAndUpdate(userId, {
    $push: {
      notifications: {
        title: "Registration confirmed",
        body: `You joined ${updatedTournament.title || updatedTournament.name}. Good luck for the match.`
      }
    }
  });

  const serializedTournament = serializeTournament(updatedTournament.toObject());

  const maxSlots = resolveMaxSlots(updatedTournament.toObject());
  const filledSlots = Math.max(Number(updatedTournament.filledSlots || 0), 0);
  if (maxSlots > 0 && filledSlots >= maxSlots && !Boolean(updatedTournament.isRegistrationClosed)) {
    await Tournament.updateOne(
      {
        _id: updatedTournament._id,
        isRegistrationClosed: { $ne: true }
      },
      {
        $set: {
          isRegistrationClosed: true
        }
      }
    );
  }

  io?.emit("tournament_update", {
    type: "joined",
    tournament: serializedTournament,
    playerId: userId
  });

  return {
    tournament: serializedTournament,
    slotNumber: Number(updatedTournament.filledSlots || 0)
  };
};

const mapRegistrationResponse = (registration, tournament) => ({
  registrationId: registration._id,
  status: registration.status,
  joinType: registration.joinType,
  teamId: registration.teamId,
  teamName: registration.teamName,
  teamLeaderGameId: registration.teamLeaderGameId,
  players: registration.players,
  soloGameId: registration.soloGameId,
  banner: registration.banner,
  slotNumber: registration.slotNumber || null,
  tournamentId: tournament._id,
  tournamentTitle: tournament.title || tournament.name,
  entryFee: Number(tournament.entryFee || 0),
  createdAt: registration.createdAt
});

const getTournaments = async (query) => {
  const limit = parseLimit(query?.limit);
  return fetchTournamentList({ limit });
};

const getLiveTournaments = async (query) => {
  const now = new Date();
  const liveWindowStart = new Date(now.getTime() - LIVE_WINDOW_MS);
  const limit = parseLimit(query?.limit);

  const tournaments = await fetchTournamentList({
    filter: {
      $or: [
        { startTime: { $lte: now, $gte: liveWindowStart } },
        { dateTime: { $lte: now, $gte: liveWindowStart } }
      ],
      status: { $ne: "completed" }
    },
    sort: { startTime: -1 },
    limit
  });

  return tournaments.filter((tournament) => tournament.status === "live");
};

const getUpcomingTournaments = async (query) => {
  const now = new Date();
  const limit = parseLimit(query?.limit);

  const tournaments = await fetchTournamentList({
    filter: {
      $or: [{ startTime: { $gt: now } }, { dateTime: { $gt: now } }]
    },
    sort: { startTime: 1 },
    limit
  });

  return tournaments.filter((tournament) => tournament.status === "upcoming");
};

const getTournamentDetails = async (tournamentId) => {
  const normalizedId = normalizeText(tournamentId);
  if (!normalizedId) {
    throw new AppError("Tournament ID is required", 400);
  }

  const tournament = await Tournament.findById(normalizedId).select(TOURNAMENT_SELECT).lean();
  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  await syncTournamentSlotCounters(normalizedId);

  const latestTournament =
    (await Tournament.findById(normalizedId).select(TOURNAMENT_SELECT).lean()) || tournament;

  const serialized = serializeTournament(latestTournament);

  const registrations = await TournamentRegistration.find({
    tournamentId: latestTournament._id,
    status: "paid"
  })
    .select("_id slotNumber joinType teamName teamId players soloGameId banner paymentAt createdAt")
    .sort({ slotNumber: 1, createdAt: 1 })
    .lean();

  const registeredTeams = registrations.map((registration) => ({
    registrationId: registration._id,
    slotNumber: Number(registration.slotNumber || 0) || null,
    joinType: registration.joinType,
    teamName: registration.teamName || null,
    teamId: registration.teamId || null,
    players: Array.isArray(registration.players) ? registration.players : [],
    soloGameId: registration.soloGameId || null,
    banner: registration.banner || null,
    paidAt: registration.paymentAt || registration.createdAt || null
  }));

  const maxSlots = Number(serialized.maxSlots || serialized.maxPlayers || 0);
  const normalizedFilledSlots = Math.max(
    Number(serialized.filledSlots || 0),
    registeredTeams.length
  );
  const isFull = maxSlots > 0 && normalizedFilledSlots >= maxSlots;
  const registrationState = isFull
    ? "full"
    : serialized.registrationStatus === "open"
      ? "open"
      : "closed";

  return {
    ...serialized,
    filledSlots: normalizedFilledSlots,
    availableSlots: Math.max(0, maxSlots - normalizedFilledSlots),
    registrationState,
    registeredTeams,
    bracket: await bracketService.getTournamentBracket(latestTournament._id)
  };
};

const createTournament = async (payload, userId, io) => {
  const title = String(payload.title || payload.name || "").trim();
  const game = String(payload.game || TOURNAMENT_DEFAULTS.GAME).trim() || TOURNAMENT_DEFAULTS.GAME;
  const mode = String(payload.mode || "BR").toUpperCase();
  const type = normalizeTournamentType(payload.type);
  const playersPerTeam = TYPE_PLAYERS_MAP[type] || 4;
  const entryFee = Number(payload.entryFee);
  const prizePool = Number(payload.prizePool);
  const maxPlayersInput = Number(payload.maxPlayers ?? TOURNAMENT_DEFAULTS.MAX_PLAYERS);
  const maxTeamsInput = Number(payload.maxTeams ?? payload.maxSlots ?? 0);
  const maxSlotsInput = Number(payload.maxSlots ?? payload.maxTeams ?? payload.maxPlayers ?? TOURNAMENT_DEFAULTS.MAX_PLAYERS);
  const tournamentStartInput = payload.tournamentStartTime || payload.dateTime || payload.startTime;
  const startTimeInput = payload.startTime || payload.tournamentStartTime || payload.dateTime;
  const tournamentStartTime = tournamentStartInput ? new Date(tournamentStartInput) : null;
  const startTime = startTimeInput ? new Date(startTimeInput) : null;
  const registrationStartInput = payload.registrationStartTime;
  const registrationEndInput = payload.registrationEndTime;
  const registrationStartTime = registrationStartInput
    ? new Date(registrationStartInput)
    : new Date();
  const registrationEndTime = registrationEndInput
    ? new Date(registrationEndInput)
    : new Date(tournamentStartTime || startTime);

  const maxTeams =
    Number.isFinite(maxTeamsInput) && maxTeamsInput > 0
      ? Math.floor(maxTeamsInput)
      : Number.isFinite(maxSlotsInput) && maxSlotsInput > 0
        ? Math.floor(maxSlotsInput)
        : Number.isFinite(maxPlayersInput) && maxPlayersInput > 0
          ? Math.max(1, Math.ceil(maxPlayersInput / playersPerTeam))
          : Math.max(1, Math.ceil(TOURNAMENT_DEFAULTS.MAX_PLAYERS / playersPerTeam));

  const maxSlots = maxTeams;
  const maxPlayers = Math.max(
    Number.isFinite(maxPlayersInput) ? Math.floor(maxPlayersInput) : 0,
    maxTeams * playersPerTeam
  );

  if (!title || !Number.isFinite(entryFee) || !Number.isFinite(prizePool) || !startTime || !tournamentStartTime) {
    throw new AppError("title, entryFee, prizePool and startTime are required", 400);
  }

  if (!TOURNAMENT_MODES.includes(mode)) {
    throw new AppError("mode must be BR or CS", 400);
  }

  if (Number.isNaN(startTime.getTime())) {
    throw new AppError("Invalid startTime", 400);
  }

  if (Number.isNaN(tournamentStartTime.getTime())) {
    throw new AppError("Invalid tournamentStartTime", 400);
  }

  if (Number.isNaN(registrationStartTime.getTime())) {
    throw new AppError("Invalid registrationStartTime", 400);
  }

  if (Number.isNaN(registrationEndTime.getTime())) {
    throw new AppError("Invalid registrationEndTime", 400);
  }

  if (registrationStartTime.getTime() > registrationEndTime.getTime()) {
    throw new AppError("registrationEndTime must be after registrationStartTime", 400);
  }

  if (!Number.isFinite(maxPlayers) || maxPlayers < 1) {
    throw new AppError("maxPlayers must be at least 1", 400);
  }

  if (!Number.isFinite(maxSlots) || maxSlots < 1) {
    throw new AppError("maxSlots must be at least 1", 400);
  }

  const tournament = await Tournament.create({
    title,
    game,
    mode,
    type,
    entryFee,
    prizePool,
    maxTeams,
    playersPerTeam,
    maxPlayers,
    maxSlots,
    filledSlots: 0,
    startTime,
    tournamentStartTime,
    dateTime: tournamentStartTime,
    registrationStartTime,
    registrationEndTime,
    status: tournamentStartTime.getTime() > Date.now() ? "upcoming" : "live",
    createdBy: userId
  });

  await matchService.ensurePrimaryMatchForTournament(tournament, io);

  await User.updateMany(
    {},
    {
      $push: {
        notifications: {
          title: "New tournament announced",
          body: `${title} is open for registrations now.`
        }
      }
    }
  );

  const serializedTournament = serializeTournament(tournament.toObject());

  io?.emit("tournament_update", {
    type: "created",
    tournament: serializedTournament
  });

  return serializedTournament;
};

const registerTournament = async (payload, userId, file) => {
  const tournamentId = normalizeText(payload.tournamentId);
  if (!tournamentId) {
    throw new AppError("tournamentId is required", 400);
  }

  const tournament = await Tournament.findById(tournamentId).select(TOURNAMENT_SELECT);

  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  const resolvedStatus = resolveTournamentStatus(tournament.toObject());
  if (resolvedStatus === "completed") {
    throw new AppError("Tournament is already completed", 400);
  }

  await assertRegistrationWindowOpen(tournament.toObject());

  const joinedPlayers = Array.isArray(tournament.joinedPlayers) ? tournament.joinedPlayers : [];
  const alreadyJoined = joinedPlayers.some((participant) => participant.equals(userId));
  if (alreadyJoined) {
    throw new AppError("You have already joined this tournament", 400);
  }

  const maxSlots = Number(tournament.maxSlots || tournament.maxPlayers || 0);
  const filledSlots = Math.max(Number(tournament.filledSlots || 0), joinedPlayers.length);
  if (filledSlots >= maxSlots) {
    throw new AppError("Tournament is full", 400);
  }

  const joinType = String(payload.joinType || "").toLowerCase();
  if (!["squad", "solo"].includes(joinType)) {
    throw new AppError("joinType must be squad or solo", 400);
  }

  const teamName = joinType === "squad" ? normalizeText(payload.teamName) : null;
  const teamLeaderGameId =
    joinType === "squad" ? normalizeText(payload.teamLeaderGameId).toUpperCase() : null;
  const soloGameId =
    joinType === "solo"
      ? normalizeText(payload.gameId || payload.soloGameId).toUpperCase()
      : null;

  const normalizedPlayers = Array.isArray(payload.players)
    ? [...new Set(payload.players.map((entry) => normalizeText(entry).toUpperCase()).filter(Boolean))]
    : [];

  if (joinType === "squad") {
    if (!teamName || teamName.length < 2) {
      throw new AppError("teamName is required for squad registration", 400);
    }

    if (!teamLeaderGameId || teamLeaderGameId.length < 3) {
      throw new AppError("teamLeaderGameId is required for squad registration", 400);
    }

    if (normalizedPlayers.length !== 4) {
      throw new AppError("Exactly 4 unique player IDs are required for squad registration", 400);
    }

    if (!file?.filename) {
      throw new AppError("Team banner image is required for squad registration", 400);
    }
  }

  if (joinType === "solo") {
    if (!soloGameId || soloGameId.length < 3) {
      throw new AppError("gameId is required for solo registration", 400);
    }
  }

  const teamId =
    joinType === "solo"
      ? createTeamId("solo", soloGameId)
      : createTeamId("squad", teamName || teamLeaderGameId);

  const registration = await TournamentRegistration.findOneAndUpdate(
    {
      userId,
      tournamentId: tournament._id,
      status: "pending"
    },
    {
      $set: {
        joinType,
        teamId,
        teamName,
        teamLeaderGameId,
        players: joinType === "solo" ? [soloGameId] : normalizedPlayers,
        banner: file?.filename ? `/uploads/tournament/${file.filename}` : null,
        soloGameId,
        slotNumber: null,
        gatewayOrderId: null,
        paymentAt: null,
        paymentReference: null,
        amount: normalizeAmount(tournament.entryFee || 0),
        status: "pending"
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      sort: { createdAt: -1 }
    }
  ).lean();

  return mapRegistrationResponse(registration, tournament);
};

const createTournamentPaymentOrder = async (payload, userId, io) => {
  const registrationId = normalizeText(payload.registrationId);
  if (!registrationId) {
    throw new AppError("registrationId is required", 400);
  }

  const existingPaidRegistration = await TournamentRegistration.findOne({
    _id: registrationId,
    userId,
    status: "paid"
  }).lean();

  if (existingPaidRegistration?.slotNumber) {
    const tournament = await Tournament.findById(existingPaidRegistration.tournamentId)
      .select(TOURNAMENT_SELECT)
      .lean();

    return {
      requiresPayment: false,
      confirmed: true,
      duplicate: true,
      registrationId: existingPaidRegistration._id,
      slotNumber: existingPaidRegistration.slotNumber,
      teamId: existingPaidRegistration.teamId,
      tournament: tournament ? serializeTournament(tournament) : null
    };
  }

  const registration = await TournamentRegistration.findOne({
    _id: registrationId,
    userId,
    status: { $in: ["pending", "failed"] }
  });

  if (!registration) {
    throw new AppError("Registration not found", 404);
  }

  if (registration.status === "failed") {
    registration.status = "pending";
    registration.paymentReference = null;
    registration.paymentAt = null;
    await registration.save();
  }

  const tournament = await Tournament.findById(registration.tournamentId).select(TOURNAMENT_SELECT);
  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  if (resolveTournamentStatus(tournament.toObject()) === "completed") {
    throw new AppError("Tournament is already completed", 400);
  }

  await syncTournamentSlotCounters(tournament._id);
  const freshTournament = await Tournament.findById(tournament._id).select(TOURNAMENT_SELECT);

  if (!freshTournament) {
    throw new AppError("Tournament not found", 404);
  }

  await assertRegistrationWindowOpen(freshTournament.toObject());

  const joinedPlayers = Array.isArray(freshTournament.joinedPlayers) ? freshTournament.joinedPlayers : [];
  if (joinedPlayers.some((participant) => participant.equals(userId))) {
    throw new AppError("You have already joined this tournament", 400);
  }

  const maxSlots = Number(freshTournament.maxSlots || freshTournament.maxPlayers || 0);
  const filledSlots = Math.max(Number(freshTournament.filledSlots || 0), joinedPlayers.length);
  if (filledSlots >= maxSlots) {
    throw new AppError("Tournament is full", 400);
  }

  const amount = normalizeAmount(freshTournament.entryFee || registration.amount || 0);
  if (amount <= 0) {
    const joinResult = await finalizeTournamentJoinWithSlot(freshTournament._id, userId, io);

    await TournamentRegistration.findByIdAndUpdate(registration._id, {
      $set: {
        status: "paid",
        amount: 0,
        slotNumber: joinResult.slotNumber,
        paymentAt: new Date(),
        paymentReference: createReference("FREE"),
        gatewayOrderId: null
      }
    });

    return {
      requiresPayment: false,
      confirmed: true,
      duplicate: false,
      registrationId: registration._id,
      slotNumber: joinResult.slotNumber,
      teamId: registration.teamId,
      tournament: joinResult.tournament
    };
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.create({
    amount: toPaisa(amount),
    currency: RAZORPAY_CURRENCY,
    receipt: `tournament_${String(registration._id)}_${Date.now()}`,
    notes: {
      userId: String(userId),
      registrationId: String(registration._id),
      tournamentId: String(freshTournament._id),
      flow: "tournament_join"
    }
  });

  await Transaction.create({
    userId,
    type: "debit",
    amount,
    status: "pending",
    method: payload.method || "UPI",
    gatewayOrderId: order.id,
    notes: {
      flow: "tournament_join_gateway",
      registrationId: String(registration._id),
      tournamentId: String(freshTournament._id)
    }
  });

  await TournamentRegistration.findByIdAndUpdate(registration._id, {
    $set: {
      status: "pending",
      amount,
      gatewayOrderId: order.id,
      paymentReference: null,
      paymentAt: null,
      slotNumber: null
    }
  });

  return {
    requiresPayment: true,
    confirmed: false,
    duplicate: false,
    registrationId: registration._id,
    orderId: order.id,
    amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    teamId: registration.teamId,
    tournamentId: freshTournament._id,
    tournamentTitle: freshTournament.title || freshTournament.name
  };
};

const verifyTournamentPayment = async (payload, userId, io) => {
  const registrationId = normalizeText(payload.registrationId);
  const orderId = normalizeText(payload.orderId);
  const paymentId = normalizeText(payload.paymentId);
  const signature = normalizeText(payload.signature);
  const method = normalizeText(payload.method || "UPI") || "UPI";

  if (!registrationId || !orderId || !paymentId || !signature) {
    throw new AppError("registrationId, orderId, paymentId and signature are required", 400);
  }

  const registration = await TournamentRegistration.findOne({
    _id: registrationId,
    userId
  });

  if (!registration) {
    throw new AppError("Registration not found", 404);
  }

  if (registration.status === "paid" && registration.slotNumber) {
    const tournament = await Tournament.findById(registration.tournamentId)
      .select(TOURNAMENT_SELECT)
      .lean();

    return {
      duplicate: true,
      registrationId: registration._id,
      slotNumber: registration.slotNumber,
      teamId: registration.teamId,
      tournament: tournament ? serializeTournament(tournament) : null
    };
  }

  if (registration.gatewayOrderId && registration.gatewayOrderId !== orderId) {
    throw new AppError("Order does not match registration", 400);
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (generatedSignature !== signature) {
    await Transaction.findOneAndUpdate(
      {
        userId,
        gatewayOrderId: orderId,
        status: "pending"
      },
      {
        $set: {
          status: "failed",
          referenceId: paymentId,
          notes: {
            flow: "tournament_join_gateway",
            registrationId: String(registration._id),
            reason: "invalid_signature"
          }
        }
      }
    );

    await TournamentRegistration.findByIdAndUpdate(registration._id, {
      $set: {
        status: "failed",
        gatewayOrderId: orderId,
        paymentReference: paymentId,
        paymentAt: new Date()
      }
    });

    throw new AppError("Invalid payment signature", 400);
  }

  let transaction = await Transaction.findOneAndUpdate(
    {
      userId,
      gatewayOrderId: orderId,
      status: "pending"
    },
    {
      $set: {
        status: "success",
        method,
        referenceId: paymentId,
        notes: {
          flow: "tournament_join_gateway",
          registrationId: String(registration._id),
          signatureVerified: true
        }
      }
    },
    { new: true }
  );

  if (!transaction) {
    transaction = await Transaction.findOne({
      userId,
      $or: [{ referenceId: paymentId }, { gatewayOrderId: orderId }],
      status: "success"
    });
  }

  if (!transaction) {
    try {
      transaction = await Transaction.create({
        userId,
        type: "debit",
        amount: normalizeAmount(registration.amount || 0),
        status: "success",
        method,
        gatewayOrderId: orderId,
        referenceId: paymentId,
        notes: {
          flow: "tournament_join_gateway",
          registrationId: String(registration._id),
          reconstructed: true
        }
      });
    } catch (error) {
      if (error?.code === 11000) {
        transaction = await Transaction.findOne({
          userId,
          referenceId: paymentId,
          status: "success"
        });
      } else {
        throw error;
      }
    }
  }

  let joinResult;
  try {
    joinResult = await finalizeTournamentJoinWithSlot(registration.tournamentId, userId, io);
  } catch (error) {
    await TournamentRegistration.findByIdAndUpdate(registration._id, {
      $set: {
        status: "failed",
        gatewayOrderId: orderId,
        paymentReference: paymentId,
        paymentAt: new Date()
      }
    });

    throw error;
  }

  await TournamentRegistration.findByIdAndUpdate(registration._id, {
    $set: {
      status: "paid",
      slotNumber: joinResult.slotNumber,
      gatewayOrderId: orderId,
      paymentReference: paymentId,
      paymentAt: new Date()
    }
  });

  return {
    duplicate: false,
    registrationId: registration._id,
    teamId: registration.teamId,
    slotNumber: joinResult.slotNumber,
    transactionId: transaction?._id || null,
    tournament: joinResult.tournament
  };
};

const joinTournament = async (tournamentId, userId, io) => {
  const tournament = await Tournament.findById(tournamentId).select(TOURNAMENT_SELECT);

  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  const resolvedStatus = resolveTournamentStatus(tournament.toObject());
  if (resolvedStatus === "completed") {
    throw new AppError("Tournament is already completed", 400);
  }

  await assertRegistrationWindowOpen(tournament.toObject());

  const joinedPlayers = Array.isArray(tournament.joinedPlayers) ? tournament.joinedPlayers : [];

  const alreadyJoined = joinedPlayers.some((participant) => participant.equals(userId));
  if (alreadyJoined) {
    throw new AppError("You have already joined this tournament", 400);
  }

  let chargeResult = null;
  const entryFee = normalizeAmount(tournament.entryFee || 0);
  if (entryFee > 0) {
    chargeResult = await walletService.debitTournamentEntryFee({
      userId,
      tournament
    });
  }

  try {
    const joinResult = await finalizeTournamentJoinWithSlot(tournament._id, userId, io);

    await TournamentRegistration.findOneAndUpdate(
      {
        userId,
        tournamentId: tournament._id,
        status: "pending"
      },
      {
        $set: {
          status: "paid",
          slotNumber: joinResult.slotNumber,
          paymentAt: new Date(),
          paymentReference: String(
            chargeResult?.transaction?.referenceId ||
              chargeResult?.transaction?._id ||
              chargeResult?.transaction?.gatewayOrderId ||
              ""
          )
        }
      },
      {
        sort: { createdAt: -1 }
      }
    );

    return {
      ...joinResult.tournament,
      slotNumber: joinResult.slotNumber
    };
  } catch (error) {
    await TournamentRegistration.findOneAndUpdate(
      {
        userId,
        tournamentId: tournament._id,
        status: "pending"
      },
      {
        $set: {
          status: "failed",
          paymentReference: String(chargeResult?.transaction?.referenceId || "")
        }
      },
      {
        sort: { createdAt: -1 }
      }
    );

    if (chargeResult?.charged) {
      await walletService.refundTournamentEntryFee({
        userId,
        amount: chargeResult.charged,
        tournamentId: tournament._id,
        reason: "Tournament join failed"
      });
    }

    throw error;
  }
};

module.exports = {
  getTournaments,
  getLiveTournaments,
  getUpcomingTournaments,
  getTournamentDetails,
  createTournament,
  registerTournament,
  createTournamentPaymentOrder,
  verifyTournamentPayment,
  joinTournament
};
