const Tournament = require("../models/Tournament");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { TOURNAMENT_DEFAULTS, TOURNAMENT_MODES } = require("../config/constants");
const matchService = require("./matchService");
const walletService = require("./walletService");

const TOURNAMENT_SELECT =
  "_id title game mode entryFee prizePool maxPlayers joinedPlayers status startTime name dateTime participants";
const MAX_LIMIT = TOURNAMENT_DEFAULTS.MAX_QUERY_LIMIT;
const LIVE_WINDOW_MINUTES = Number(
  process.env.TOURNAMENT_LIVE_WINDOW_MINUTES || TOURNAMENT_DEFAULTS.LIVE_WINDOW_MINUTES
);
const LIVE_WINDOW_MS = LIVE_WINDOW_MINUTES * 60 * 1000;

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, MAX_LIMIT);
};

const resolveTournamentStatus = (tournament, nowMs = Date.now()) => {
  if (tournament.status === "completed") {
    return "completed";
  }

  const startTimeValue = tournament.startTime || tournament.dateTime;
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

const serializeTournament = (tournament, nowMs = Date.now()) => ({
  _id: tournament._id,
  title: tournament.title || tournament.name || "Tournament",
  game: tournament.game || TOURNAMENT_DEFAULTS.GAME,
  mode: tournament.mode || "BR",
  entryFee: Number(tournament.entryFee || 0),
  prizePool: Number(tournament.prizePool || 0),
  maxPlayers: Number(tournament.maxPlayers || TOURNAMENT_DEFAULTS.MAX_PLAYERS),
  joinedPlayers: Array.isArray(tournament.joinedPlayers)
    ? tournament.joinedPlayers
    : Array.isArray(tournament.participants)
      ? tournament.participants
      : [],
  status: resolveTournamentStatus(tournament, nowMs),
  startTime: tournament.startTime || tournament.dateTime || null
});

const fetchTournamentList = async ({ filter = {}, sort = { startTime: 1 }, limit = 0 }) => {
  let query = Tournament.find(filter).select(TOURNAMENT_SELECT).sort(sort).lean();

  if (limit) {
    query = query.limit(limit);
  }

  const tournaments = await query;
  const nowMs = Date.now();
  return tournaments.map((tournament) => serializeTournament(tournament, nowMs));
};

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

const createTournament = async (payload, userId, io) => {
  const title = String(payload.title || payload.name || "").trim();
  const game = String(payload.game || TOURNAMENT_DEFAULTS.GAME).trim() || TOURNAMENT_DEFAULTS.GAME;
  const mode = String(payload.mode || "BR").toUpperCase();
  const entryFee = Number(payload.entryFee);
  const prizePool = Number(payload.prizePool);
  const maxPlayers = Number(payload.maxPlayers ?? TOURNAMENT_DEFAULTS.MAX_PLAYERS);
  const startTimeInput = payload.startTime || payload.dateTime;
  const startTime = startTimeInput ? new Date(startTimeInput) : null;

  if (!title || !Number.isFinite(entryFee) || !Number.isFinite(prizePool) || !startTime) {
    throw new AppError("title, entryFee, prizePool and startTime are required", 400);
  }

  if (!TOURNAMENT_MODES.includes(mode)) {
    throw new AppError("mode must be BR or CS", 400);
  }

  if (Number.isNaN(startTime.getTime())) {
    throw new AppError("Invalid startTime", 400);
  }

  if (!Number.isFinite(maxPlayers) || maxPlayers < 1) {
    throw new AppError("maxPlayers must be at least 1", 400);
  }

  const tournament = await Tournament.create({
    title,
    game,
    mode,
    entryFee,
    prizePool,
    maxPlayers,
    startTime,
    status: startTime.getTime() > Date.now() ? "upcoming" : "live",
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

const joinTournament = async (tournamentId, userId, io) => {
  const tournament = await Tournament.findById(tournamentId).select(
    "_id title name entryFee maxPlayers joinedPlayers participants status startTime"
  );

  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  const resolvedStatus = resolveTournamentStatus(tournament.toObject());
  if (resolvedStatus === "completed") {
    throw new AppError("Tournament is already completed", 400);
  }

  const joinedPlayers = Array.isArray(tournament.joinedPlayers) ? tournament.joinedPlayers : [];
  const participants = Array.isArray(tournament.participants) ? tournament.participants : [];

  const alreadyJoined = joinedPlayers.some((participant) => participant.equals(userId));
  if (alreadyJoined) {
    throw new AppError("You have already joined this tournament", 400);
  }

  if (joinedPlayers.length >= tournament.maxPlayers) {
    throw new AppError("Tournament is full", 400);
  }

  let chargeResult = null;
  if (Number(tournament.entryFee || 0) > 0) {
    chargeResult = await walletService.debitTournamentEntryFee({
      userId,
      tournament
    });
  }

  try {
    tournament.joinedPlayers = joinedPlayers;
    tournament.participants = participants;

    tournament.joinedPlayers.push(userId);
    if (!tournament.participants.some((participant) => participant.equals(userId))) {
      tournament.participants.push(userId);
    }

    await tournament.save();
    await matchService.joinUserToTournamentMatch(tournament, userId, io);

    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          title: "Registration confirmed",
          body: `You joined ${tournament.title || tournament.name}. Good luck for the match.`
        }
      }
    });
  } catch (error) {
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

  const serializedTournament = serializeTournament(tournament.toObject());

  io?.emit("tournament_update", {
    type: "joined",
    tournament: serializedTournament,
    playerId: userId
  });

  return serializedTournament;
};

module.exports = {
  getTournaments,
  getLiveTournaments,
  getUpcomingTournaments,
  createTournament,
  joinTournament
};
