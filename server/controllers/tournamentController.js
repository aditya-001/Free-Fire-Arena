const Tournament = require("../models/Tournament");
const User = require("../models/User");

const TOURNAMENT_SELECT = "_id title game entryFee prizePool maxPlayers joinedPlayers status startTime name dateTime participants";
const MAX_LIMIT = 100;
const LIVE_WINDOW_MINUTES = Number(process.env.TOURNAMENT_LIVE_WINDOW_MINUTES || 120);
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
  game: tournament.game || "Free Fire",
  entryFee: Number(tournament.entryFee || 0),
  prizePool: Number(tournament.prizePool || 0),
  maxPlayers: Number(tournament.maxPlayers || 50),
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

const getTournaments = async (req, res, next) => {
  try {
    const limit = parseLimit(req.query.limit);
    const tournaments = await fetchTournamentList({ limit });
    return res.json(tournaments);
  } catch (error) {
    return next(error);
  }
};

const getLiveTournaments = async (req, res, next) => {
  try {
    const now = new Date();
    const liveWindowStart = new Date(now.getTime() - LIVE_WINDOW_MS);
    const limit = parseLimit(req.query.limit);

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

    return res.json(tournaments.filter((tournament) => tournament.status === "live"));
  } catch (error) {
    return next(error);
  }
};

const getUpcomingTournaments = async (req, res, next) => {
  try {
    const now = new Date();
    const limit = parseLimit(req.query.limit);

    const tournaments = await fetchTournamentList({
      filter: {
        $or: [
          { startTime: { $gt: now } },
          { dateTime: { $gt: now } }
        ]
      },
      sort: { startTime: 1 },
      limit
    });

    return res.json(tournaments.filter((tournament) => tournament.status === "upcoming"));
  } catch (error) {
    return next(error);
  }
};

const createTournament = async (req, res, next) => {
  try {
    const title = String(req.body.title || req.body.name || "").trim();
    const game = String(req.body.game || "Free Fire").trim() || "Free Fire";
    const entryFee = Number(req.body.entryFee);
    const prizePool = Number(req.body.prizePool);
    const maxPlayers = Number(req.body.maxPlayers ?? 50);
    const startTimeInput = req.body.startTime || req.body.dateTime;
    const startTime = startTimeInput ? new Date(startTimeInput) : null;

    if (!title || !Number.isFinite(entryFee) || !Number.isFinite(prizePool) || !startTime) {
      return res.status(400).json({ message: "title, entryFee, prizePool and startTime are required" });
    }

    if (Number.isNaN(startTime.getTime())) {
      return res.status(400).json({ message: "Invalid startTime" });
    }

    if (entryFee < 0 || prizePool < 0) {
      return res.status(400).json({ message: "entryFee and prizePool must be non-negative" });
    }

    if (!Number.isFinite(maxPlayers) || maxPlayers < 1) {
      return res.status(400).json({ message: "maxPlayers must be at least 1" });
    }

    const tournament = await Tournament.create({
      title,
      game,
      entryFee,
      prizePool,
      maxPlayers,
      startTime,
      status: startTime.getTime() > Date.now() ? "upcoming" : "live",
      createdBy: req.user._id
    });

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

    req.io?.emit("tournament_update", {
      type: "created",
      tournament: serializedTournament
    });

    return res.status(201).json(serializedTournament);
  } catch (error) {
    return next(error);
  }
};

const joinTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id).select(
      "_id title name maxPlayers joinedPlayers participants status startTime"
    );

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    const resolvedStatus = resolveTournamentStatus(tournament.toObject());
    if (resolvedStatus === "completed") {
      return res.status(400).json({ message: "Tournament is already completed" });
    }

    const joinedPlayers = Array.isArray(tournament.joinedPlayers) ? tournament.joinedPlayers : [];
    const participants = Array.isArray(tournament.participants) ? tournament.participants : [];

    const alreadyJoined = joinedPlayers.some((participant) => participant.equals(req.user._id));
    if (alreadyJoined) {
      return res.status(400).json({ message: "You have already joined this tournament" });
    }

    if (joinedPlayers.length >= tournament.maxPlayers) {
      return res.status(400).json({ message: "Tournament is full" });
    }

    tournament.joinedPlayers = joinedPlayers;
    tournament.participants = participants;

    tournament.joinedPlayers.push(req.user._id);
    if (!tournament.participants.some((participant) => participant.equals(req.user._id))) {
      tournament.participants.push(req.user._id);
    }

    await tournament.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        notifications: {
          title: "Registration confirmed",
          body: `You joined ${tournament.title || tournament.name}. Good luck for the match.`
        }
      }
    });

    const serializedTournament = serializeTournament(tournament.toObject());

    req.io?.emit("tournament_update", {
      type: "joined",
      tournament: serializedTournament,
      playerId: req.user._id
    });

    return res.json(serializedTournament);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getTournaments,
  getLiveTournaments,
  getUpcomingTournaments,
  createTournament,
  joinTournament
};
