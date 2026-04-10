const mongoose = require("mongoose");
const Tournament = require("../models/Tournament");
const Match = require("../models/Match");
const Team = require("../models/Team");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const tournamentService = require("./tournamentService");
const walletService = require("./walletService");
const authService = require("./authService");
const leaderboardService = require("./leaderboardService");
const AppError = require("../utils/AppError");
const { TOURNAMENT_MODES } = require("../config/constants");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const HIGH_WITHDRAWAL_AMOUNT = Number(process.env.FRAUD_WITHDRAWAL_AMOUNT || 5000);
const FAILED_TXN_FLAG_COUNT = Number(process.env.FRAUD_FAILED_TXN_COUNT || 3);
const RAPID_JOIN_FLAG_COUNT = Number(process.env.FRAUD_JOIN_COUNT || 5);

const parsePagination = (query = {}) => {
  const pageRaw = Number.parseInt(query.page, 10);
  const limitRaw = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : DEFAULT_PAGE;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;

  return null;
};

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildRegex = (value) => {
  const safe = normalizeString(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!safe) return null;
  return new RegExp(safe, "i");
};

const toObjectId = (value, fieldName) => {
  if (!value) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === "object" && value._id) {
    return toObjectId(value._id, fieldName);
  }

  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  throw new AppError(`${fieldName} is invalid`, 400);
};

const normalizeObjectIdArray = (values = [], fieldName) => {
  if (!Array.isArray(values)) {
    throw new AppError(`${fieldName} must be an array`, 400);
  }

  const seen = new Set();
  const normalized = [];

  values.forEach((value) => {
    const objectId = toObjectId(value, fieldName);
    const key = String(objectId);
    if (seen.has(key)) return;

    seen.add(key);
    normalized.push(objectId);
  });

  return normalized;
};

const mapPlayerRef = (player) => {
  const id = player?._id || player;

  return {
    _id: id || null,
    username: player?.username || null,
    gameId: player?.gameId || player?.uid || null
  };
};

const mapTeamSummary = (team) => ({
  _id: team?._id || team || null,
  teamId: team?.teamId || null,
  teamName: team?.name || null
});

const mapTeam = (team) => {
  const players = Array.isArray(team?.players) ? team.players.map(mapPlayerRef) : [];

  return {
    _id: team?._id || null,
    teamId: team?.teamId || null,
    teamName: team?.name || null,
    players,
    playerCount: players.length,
    stats: team?.stats || {}
  };
};

const mapTournament = (tournament) => ({
  _id: tournament._id,
  title: tournament.title || tournament.name,
  mode: tournament.mode,
  entryFee: Number(tournament.entryFee || 0),
  prizePool: Number(tournament.prizePool || 0),
  maxPlayers: Number(tournament.maxPlayers || 0),
  joinedPlayersCount: Array.isArray(tournament.joinedPlayers)
    ? tournament.joinedPlayers.length
    : Array.isArray(tournament.participants)
      ? tournament.participants.length
      : 0,
  status: tournament.status,
  startTime: tournament.startTime || tournament.dateTime,
  createdAt: tournament.createdAt,
  updatedAt: tournament.updatedAt
});

const mapResultPlayers = (resultEntry = {}) => {
  if (Array.isArray(resultEntry.players) && resultEntry.players.length) {
    return resultEntry.players.map((player) => {
      const user = player.userId || null;

      return {
        userId: user?._id || user || null,
        playerName: user?.username || null,
        gameId: user?.gameId || user?.uid || null,
        kills: Number(player.kills || 0)
      };
    });
  }

  if (resultEntry.user) {
    return [
      {
        userId: resultEntry.user?._id || resultEntry.user,
        playerName: resultEntry.user?.username || null,
        gameId: resultEntry.user?.gameId || resultEntry.user?.uid || null,
        kills: Number(resultEntry.kills || 0)
      }
    ];
  }

  return [];
};

const mapMatch = (match) => ({
  _id: match?._id || null,
  tournamentId: match?.tournamentId?._id || match?.tournamentId || null,
  tournamentTitle: match?.tournamentId?.title || match?.tournamentId?.name || null,
  matchNumber: match?.matchNumber || 0,
  mode: match?.mode,
  status: match?.status,
  startTime: match?.startTime,
  roomId: match?.roomId || null,
  roomPassword: match?.roomPassword || null,
  participantsCount: Array.isArray(match?.participants) ? match.participants.length : 0,
  selectedTeamsCount: Array.isArray(match?.selectedTeams) ? match.selectedTeams.length : 0,
  qualifiedTeamsCount: Array.isArray(match?.qualifiedTeams) ? match.qualifiedTeams.length : 0,
  selectedTeams: Array.isArray(match?.selectedTeams) ? match.selectedTeams.map(mapTeamSummary) : [],
  qualifiedTeams: Array.isArray(match?.qualifiedTeams) ? match.qualifiedTeams.map(mapTeamSummary) : [],
  resultsCount: Array.isArray(match?.results) ? match.results.length : 0,
  isLocked: Boolean(match?.isLocked),
  lockedAt: match?.lockedAt || null,
  updatedAt: match?.updatedAt
});

const mapMatchDetails = (match) => {
  const rows = [...(match?.results || [])]
    .map((result) => {
      const teamRef = result.teamId;

      return {
        teamId: teamRef?._id || teamRef || null,
        teamCode: teamRef?.teamId || null,
        teamName: teamRef?.name || "Unknown Team",
        rank: Number(result.rank || 0),
        totalKills: Number(result.totalKills ?? result.kills ?? 0),
        booyah: Boolean(result.booyah),
        players: mapResultPlayers(result)
      };
    })
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.totalKills - a.totalKills;
    });

  return {
    ...mapMatch(match),
    selectedTeams: Array.isArray(match?.selectedTeams) ? match.selectedTeams.map(mapTeam) : [],
    qualifiedTeams: Array.isArray(match?.qualifiedTeams) ? match.qualifiedTeams.map(mapTeam) : [],
    results: rows,
    canEdit: !match?.isLocked && match?.status !== "completed"
  };
};

const mapUser = (user, suspicion = { flagged: false, reasons: [] }) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  gameId: user.gameId || user.uid,
  walletBalance: Number(user.walletBalance || 0),
  role: user.role,
  isBanned: Boolean(user.isBanned),
  bannedAt: user.bannedAt,
  bannedReason: user.bannedReason,
  stats: user.stats,
  createdAt: user.createdAt,
  suspicion
});

const fetchMatchWithDetails = (matchId) =>
  Match.findById(matchId)
    .populate("tournamentId", "title name mode startTime")
    .populate("selectedTeams", "teamId name players stats")
    .populate("selectedTeams.players", "username gameId uid")
    .populate("qualifiedTeams", "teamId name players stats")
    .populate("qualifiedTeams.players", "username gameId uid")
    .populate("results.teamId", "teamId name players")
    .populate("results.teamId.players", "username gameId uid")
    .populate("results.players.userId", "username gameId uid")
    .populate("results.user", "username gameId uid")
    .lean();

const emitLeaderboardUpdate = (io, matchId, payload) => {
  if (!io) return;

  const room = String(matchId);
  io.to(room).emit("leaderboardUpdate", payload);
  io.to(room).emit("match:update", payload);
};

const toResultInputRows = (results = []) =>
  (Array.isArray(results) ? results : [])
    .map((result) => {
      const teamId = result?.teamId?._id || result?.teamId;
      if (!teamId) return null;

      return {
        teamId,
        rank: Number(result.rank || 0),
        totalKills: Number(result.totalKills ?? result.kills ?? 0),
        booyah: Boolean(result.booyah),
        players: mapResultPlayers(result).map((player) => ({
          userId: player.userId,
          kills: Number(player.kills || 0)
        }))
      };
    })
    .filter(Boolean);

const normalizeTeamResults = async ({ match, rawResults, requireAllSelected = false }) => {
  if (!Array.isArray(rawResults) || !rawResults.length) {
    throw new AppError("results must contain at least one team", 400);
  }

  const selectedTeams = normalizeObjectIdArray(match.selectedTeams || [], "selectedTeams");
  if (!selectedTeams.length) {
    throw new AppError("No selected teams found for this match", 400);
  }

  const selectedTeamSet = new Set(selectedTeams.map((teamId) => String(teamId)));
  const incomingRows = rawResults.map((entry, index) => {
    const teamId = toObjectId(entry.teamId, `results[${index}].teamId`);
    const rank = Number.parseInt(entry.rank, 10);
    const totalKills = Number.parseInt(entry.totalKills, 10);

    if (!Number.isFinite(rank) || rank <= 0) {
      throw new AppError(`results[${index}].rank must be a positive integer`, 400);
    }

    if (!Number.isFinite(totalKills) || totalKills < 0) {
      throw new AppError(`results[${index}].totalKills must be >= 0`, 400);
    }

    if (!Array.isArray(entry.players) || !entry.players.length) {
      throw new AppError(`results[${index}].players must contain at least one player`, 400);
    }

    return {
      teamId,
      rank,
      totalKills,
      booyah: Boolean(entry.booyah),
      players: entry.players
    };
  });

  const incomingTeamSet = new Set();
  const rankSet = new Set();
  incomingRows.forEach((entry, index) => {
    const teamKey = String(entry.teamId);

    if (!selectedTeamSet.has(teamKey)) {
      throw new AppError(`results[${index}].teamId is not part of selectedTeams`, 400);
    }

    if (incomingTeamSet.has(teamKey)) {
      throw new AppError("Duplicate team results are not allowed", 400);
    }

    if (rankSet.has(entry.rank)) {
      throw new AppError("Each rank must be unique within a match", 400);
    }

    incomingTeamSet.add(teamKey);
    rankSet.add(entry.rank);
  });

  if (requireAllSelected && incomingTeamSet.size !== selectedTeamSet.size) {
    throw new AppError("Results must be submitted for all selected teams", 400);
  }

  if (requireAllSelected) {
    for (const selectedTeamId of selectedTeamSet) {
      if (!incomingTeamSet.has(selectedTeamId)) {
        throw new AppError("Results must be submitted for all selected teams", 400);
      }
    }
  }

  const incomingTeamIds = [...incomingTeamSet].map((id) => new mongoose.Types.ObjectId(id));
  const teams = await Team.find({ _id: { $in: incomingTeamIds } })
    .select("_id teamId name players")
    .lean();

  if (teams.length !== incomingTeamSet.size) {
    throw new AppError("One or more teams in results were not found", 404);
  }

  const teamsMap = new Map(teams.map((team) => [String(team._id), team]));
  const normalized = incomingRows.map((entry, index) => {
    const team = teamsMap.get(String(entry.teamId));
    const teamPlayerSet = new Set((team?.players || []).map((playerId) => String(playerId)));

    if (!teamPlayerSet.size) {
      throw new AppError(`Team ${team?.name || index + 1} has no registered players`, 400);
    }

    const localPlayerSet = new Set();
    const normalizedPlayers = entry.players.map((playerEntry, playerIndex) => {
      const userId = toObjectId(playerEntry.userId, `results[${index}].players[${playerIndex}].userId`);
      const kills = Number.parseInt(playerEntry.kills, 10);
      const userKey = String(userId);

      if (!Number.isFinite(kills) || kills < 0) {
        throw new AppError(`results[${index}].players[${playerIndex}].kills must be >= 0`, 400);
      }

      if (!teamPlayerSet.has(userKey)) {
        throw new AppError(`Player ${userKey} does not belong to team ${team?.name || "Unknown"}`, 400);
      }

      if (localPlayerSet.has(userKey)) {
        throw new AppError("Duplicate player entry within a team is not allowed", 400);
      }

      localPlayerSet.add(userKey);

      return {
        userId,
        kills
      };
    });

    return {
      teamId: entry.teamId,
      rank: entry.rank,
      totalKills: entry.totalKills,
      booyah: entry.booyah,
      players: normalizedPlayers
    };
  });

  return normalized.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return b.totalKills - a.totalKills;
  });
};

const buildAggregateMaps = (results = []) => {
  const userMap = new Map();
  const teamMap = new Map();

  (Array.isArray(results) ? results : []).forEach((result) => {
    const teamId = result?.teamId?._id || result?.teamId;
    if (teamId) {
      const teamKey = String(teamId);
      if (!teamMap.has(teamKey)) {
        teamMap.set(teamKey, {
          kills: 0,
          booyah: 0,
          wins: 0,
          matchesPlayed: 0
        });
      }

      const teamBucket = teamMap.get(teamKey);
      teamBucket.kills += Number(result.totalKills ?? result.kills ?? 0);
      teamBucket.booyah += result.booyah ? 1 : 0;
      teamBucket.wins += Number(result.rank || 0) === 1 ? 1 : 0;
      teamBucket.matchesPlayed += 1;
    }

    mapResultPlayers(result).forEach((player) => {
      if (!player.userId) return;

      const userKey = String(player.userId);
      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          kills: 0,
          booyah: 0,
          wins: 0,
          matchesPlayed: 0,
          points: 0
        });
      }

      const userBucket = userMap.get(userKey);
      const kills = Number(player.kills || 0);
      const booyah = result.booyah ? 1 : 0;

      userBucket.kills += kills;
      userBucket.booyah += booyah;
      userBucket.wins += booyah;
      userBucket.matchesPlayed += 1;
      userBucket.points += kills * 2 + booyah * 10;
    });
  });

  return {
    userMap,
    teamMap
  };
};

const computeDeltaMap = (previousMap, nextMap, metrics) => {
  const keys = new Set([...previousMap.keys(), ...nextMap.keys()]);
  const deltaMap = new Map();

  keys.forEach((key) => {
    const previous = previousMap.get(key) || {};
    const next = nextMap.get(key) || {};

    const delta = metrics.reduce((accumulator, metric) => {
      accumulator[metric] = Number(next[metric] || 0) - Number(previous[metric] || 0);
      return accumulator;
    }, {});

    const hasDelta = Object.values(delta).some((value) => value !== 0);
    if (hasDelta) {
      deltaMap.set(key, delta);
    }
  });

  return deltaMap;
};

const applyResultStatsDelta = async ({ match, previousResults, nextResults }) => {
  const previousAgg = buildAggregateMaps(previousResults);
  const nextAgg = buildAggregateMaps(nextResults);

  const userDelta = computeDeltaMap(previousAgg.userMap, nextAgg.userMap, [
    "kills",
    "booyah",
    "wins",
    "matchesPlayed",
    "points"
  ]);

  const teamDelta = computeDeltaMap(previousAgg.teamMap, nextAgg.teamMap, [
    "kills",
    "booyah",
    "wins",
    "matchesPlayed"
  ]);

  const userOps = [...userDelta.entries()].map(([userId, delta]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(userId) },
      update: {
        $inc: {
          "stats.totalKills": delta.kills,
          "stats.totalBooyah": delta.booyah,
          "stats.matchesPlayed": delta.matchesPlayed,

          "stats.kills": delta.kills,
          "stats.wins": delta.wins,
          "stats.matches": delta.matchesPlayed,
          "stats.points": delta.points
        }
      }
    }
  }));

  if (userOps.length) {
    await User.bulkWrite(userOps, { ordered: false });
  }

  const mode = String(match.mode || "BR").toUpperCase();
  const modePath = `stats.modeStats.${mode}`;

  const teamOps = [...teamDelta.entries()].map(([teamId, delta]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(teamId) },
      update: {
        $inc: {
          "stats.totalKills": delta.kills,
          "stats.totalBooyah": delta.booyah,
          "stats.totalWins": delta.wins,
          "stats.matchesPlayed": delta.matchesPlayed,

          [`${modePath}.kills`]: delta.kills,
          [`${modePath}.booyah`]: delta.booyah,
          [`${modePath}.wins`]: delta.wins,
          [`${modePath}.matchesPlayed`]: delta.matchesPlayed
        }
      }
    }
  }));

  if (teamOps.length) {
    await Team.bulkWrite(teamOps, { ordered: false });
  }

  leaderboardService.invalidateLeaderboardCache();
};

const getDashboard = async () => {
  const [
    totalUsers,
    totalMatches,
    activeTournaments,
    totalRevenueAgg,
    latestJoins,
    latestTransactions,
    failedTransactionsAgg,
    highPendingWithdrawals,
    recentRapidJoinAgg,
    bannedUsers
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Match.countDocuments(),
    Tournament.countDocuments({ status: { $in: ["upcoming", "live"] } }),
    Transaction.aggregate([
      {
        $match: {
          type: "debit",
          status: "success",
          "notes.flow": "tournament_join"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]),
    User.find({ role: "user" })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("username gameId email createdAt")
      .lean(),
    Transaction.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("userId", "username gameId")
      .lean(),
    Transaction.aggregate([
      {
        $match: {
          status: "failed",
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gte: FAILED_TXN_FLAG_COUNT }
        }
      }
    ]),
    Transaction.countDocuments({
      type: "debit",
      status: "pending",
      "notes.flow": "withdraw_request",
      amount: { $gte: HIGH_WITHDRAWAL_AMOUNT }
    }),
    Transaction.aggregate([
      {
        $match: {
          type: "debit",
          status: "success",
          "notes.flow": "tournament_join",
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gte: RAPID_JOIN_FLAG_COUNT }
        }
      }
    ]),
    User.countDocuments({ role: "user", isBanned: true })
  ]);

  return {
    overview: {
      totalUsers,
      totalMatches,
      totalRevenue: Number(totalRevenueAgg[0]?.total || 0),
      activeTournaments
    },
    recentActivity: {
      latestJoins: latestJoins.map((user) => ({
        _id: user._id,
        username: user.username,
        gameId: user.gameId,
        email: user.email,
        joinedAt: user.createdAt
      })),
      latestTransactions: latestTransactions.map((transaction) => ({
        _id: transaction._id,
        user: {
          _id: transaction.userId?._id || null,
          username: transaction.userId?.username || "Unknown",
          gameId: transaction.userId?.gameId || null
        },
        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount,
        method: transaction.method,
        createdAt: transaction.createdAt,
        notes: transaction.notes || {}
      }))
    },
    safety: {
      suspiciousUsers24h: failedTransactionsAgg.length,
      rapidJoinUsers1h: recentRapidJoinAgg.length,
      highPendingWithdrawals,
      bannedUsers
    }
  };
};

const createTournament = async ({ payload, adminUserId, io }) => {
  const normalizedPayload = {
    title: payload.title || payload.name,
    mode: payload.mode,
    entryFee: payload.entryFee,
    prizePool: payload.prizePool,
    maxPlayers: payload.maxPlayers,
    game: payload.game,
    startTime: payload.startTime || payload.dateTime
  };

  return tournamentService.createTournament(normalizedPayload, adminUserId, io);
};

const getTournaments = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.mode) {
    filter.mode = String(query.mode).toUpperCase();
  }

  const searchRegex = buildRegex(query.search);
  if (searchRegex) {
    filter.$or = [{ title: searchRegex }, { name: searchRegex }, { game: searchRegex }];
  }

  const sortDirection = String(query.sort || "desc").toLowerCase() === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    Tournament.find(filter)
      .select(
        "_id title name mode entryFee prizePool maxPlayers joinedPlayers participants status startTime dateTime createdAt updatedAt"
      )
      .sort({ startTime: sortDirection, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Tournament.countDocuments(filter)
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    results: items.map(mapTournament)
  };
};

const updateTournament = async (id, payload = {}) => {
  const tournament = await Tournament.findById(id);

  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  const title = normalizeString(payload.title || payload.name);
  if (title) {
    tournament.title = title;
    tournament.name = title;
  }

  if (payload.mode !== undefined) {
    const mode = String(payload.mode).toUpperCase();
    if (!TOURNAMENT_MODES.includes(mode)) {
      throw new AppError("mode must be BR or CS", 400);
    }
    tournament.mode = mode;
  }

  if (payload.entryFee !== undefined) {
    const entryFee = Number(payload.entryFee);
    if (!Number.isFinite(entryFee) || entryFee < 0) {
      throw new AppError("entryFee must be a valid non-negative number", 400);
    }
    tournament.entryFee = entryFee;
  }

  if (payload.prizePool !== undefined) {
    const prizePool = Number(payload.prizePool);
    if (!Number.isFinite(prizePool) || prizePool < 0) {
      throw new AppError("prizePool must be a valid non-negative number", 400);
    }
    tournament.prizePool = prizePool;
  }

  if (payload.maxPlayers !== undefined) {
    const maxPlayers = Number.parseInt(payload.maxPlayers, 10);
    if (!Number.isFinite(maxPlayers) || maxPlayers < 1) {
      throw new AppError("maxPlayers must be at least 1", 400);
    }

    const joinedPlayersCount = Array.isArray(tournament.joinedPlayers)
      ? tournament.joinedPlayers.length
      : 0;

    if (maxPlayers < joinedPlayersCount) {
      throw new AppError("maxPlayers cannot be lower than already joined players", 400);
    }

    tournament.maxPlayers = maxPlayers;
  }

  if (payload.status !== undefined) {
    const status = String(payload.status).toLowerCase();
    if (!["upcoming", "live", "completed"].includes(status)) {
      throw new AppError("status must be upcoming, live or completed", 400);
    }
    tournament.status = status;
  }

  if (payload.startTime || payload.dateTime) {
    const parsed = new Date(payload.startTime || payload.dateTime);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("dateTime must be a valid date", 400);
    }
    tournament.startTime = parsed;
    tournament.dateTime = parsed;
  }

  await tournament.save();
  return mapTournament(tournament.toObject());
};

const deleteTournament = async (id) => {
  const tournament = await Tournament.findById(id).select("_id title name").lean();

  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  const [matchesDeletion] = await Promise.all([
    Match.deleteMany({ tournamentId: id }),
    Tournament.deleteOne({ _id: id })
  ]);

  return {
    deletedTournamentId: tournament._id,
    title: tournament.title || tournament.name,
    deletedMatches: Number(matchesDeletion.deletedCount || 0)
  };
};

const registerTeam = async (payload = {}) => {
  const teamName = normalizeString(payload.teamName || payload.name);
  if (!teamName) {
    throw new AppError("teamName is required", 400);
  }

  const playerIds = normalizeObjectIdArray(payload.players || [], "players");
  if (!playerIds.length) {
    throw new AppError("At least one player is required", 400);
  }

  const users = await User.find({ _id: { $in: playerIds }, role: "user" })
    .select("_id")
    .lean();

  if (users.length !== playerIds.length) {
    throw new AppError("One or more players were not found", 404);
  }

  const existing = await Team.findOne({
    name: {
      $regex: `^${escapeRegex(teamName)}$`,
      $options: "i"
    }
  })
    .select("_id")
    .lean();

  if (existing) {
    throw new AppError("Team name already exists", 409);
  }

  const team = await Team.create({
    name: teamName,
    players: playerIds
  });

  const saved = await Team.findById(team._id)
    .populate("players", "username gameId uid")
    .lean();

  return mapTeam(saved);
};

const getTeams = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  const searchRegex = buildRegex(query.search);
  if (searchRegex) {
    filter.$or = [{ name: searchRegex }, { teamId: searchRegex }];
  }

  const [teams, total] = await Promise.all([
    Team.find(filter)
      .populate("players", "username gameId uid")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Team.countDocuments(filter)
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    results: teams.map(mapTeam)
  };
};

const getMatch = async (matchId) => {
  const id = toObjectId(matchId, "matchId");
  const match = await fetchMatchWithDetails(id);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  return mapMatchDetails(match);
};

const createMatch = async (payload, io) => {
  const tournamentId = toObjectId(payload.tournamentId, "tournamentId");
  const selectedTeams = normalizeObjectIdArray(payload.selectedTeams || [], "selectedTeams");

  if (!selectedTeams.length) {
    throw new AppError("selectedTeams is required", 400);
  }

  const tournament = await Tournament.findById(tournamentId)
    .select("_id title name mode joinedPlayers participants startTime dateTime")
    .lean();

  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  const teams = await Team.find({ _id: { $in: selectedTeams } })
    .select("_id teamId name players")
    .lean();

  if (teams.length !== selectedTeams.length) {
    throw new AppError("One or more selected teams were not found", 404);
  }

  teams.forEach((team) => {
    if (!Array.isArray(team.players) || !team.players.length) {
      throw new AppError(`Team ${team.name} has no players`, 400);
    }
  });

  const participantSet = new Set();
  teams.forEach((team) => {
    (team.players || []).forEach((playerId) => {
      participantSet.add(String(playerId));
    });
  });

  const participants = [...participantSet].map((playerId) => new mongoose.Types.ObjectId(playerId));

  const requestedMatchNumber = Number.parseInt(payload.matchNumber, 10);
  let matchNumber;

  if (Number.isFinite(requestedMatchNumber) && requestedMatchNumber > 0) {
    const exists = await Match.findOne({ tournamentId, matchNumber: requestedMatchNumber })
      .select("_id")
      .lean();

    if (exists) {
      throw new AppError("matchNumber already exists for this tournament", 409);
    }

    matchNumber = requestedMatchNumber;
  } else {
    const lastMatch = await Match.findOne({ tournamentId })
      .sort({ matchNumber: -1 })
      .select("matchNumber")
      .lean();

    matchNumber = Number(lastMatch?.matchNumber || 0) + 1;
  }

  const mode = String(payload.mode || tournament.mode || "BR").toUpperCase();
  if (!TOURNAMENT_MODES.includes(mode)) {
    throw new AppError("mode must be BR or CS", 400);
  }

  const startTimeInput = payload.startTime || tournament.startTime || tournament.dateTime || new Date();
  const startTime = new Date(startTimeInput);
  if (Number.isNaN(startTime.getTime())) {
    throw new AppError("startTime is invalid", 400);
  }

  const match = await Match.create({
    tournamentId,
    matchNumber,
    mode,
    status: "live",
    startTime,
    participants,
    selectedTeams,
    qualifiedTeams: [],
    roomId: normalizeString(payload.roomId) || null,
    roomPassword: normalizeString(payload.password || payload.roomPassword) || null,
    results: [],
    isLocked: false,
    lockedAt: null
  });

  await Tournament.findByIdAndUpdate(tournamentId, {
    $set: {
      status: "live"
    }
  });

  emitLeaderboardUpdate(io, match._id, {
    matchId: String(match._id),
    status: "live",
    rows: [],
    updatedAt: new Date().toISOString()
  });

  return getMatch(match._id);
};

const getMatches = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.tournamentId) {
    filter.tournamentId = toObjectId(query.tournamentId, "tournamentId");
  }

  if (query.mode) {
    filter.mode = String(query.mode).toUpperCase();
  }

  const [matches, total] = await Promise.all([
    Match.find(filter)
      .populate("tournamentId", "title name mode startTime")
      .populate("selectedTeams", "teamId name")
      .populate("qualifiedTeams", "teamId name")
      .sort({ startTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Match.countDocuments(filter)
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    results: matches.map(mapMatch)
  };
};

const saveQualifiedTeams = async (payload, io) => {
  const matchId = toObjectId(payload.matchId, "matchId");
  const qualifiedTeams = normalizeObjectIdArray(payload.qualifiedTeams || [], "qualifiedTeams");

  if (!qualifiedTeams.length) {
    throw new AppError("qualifiedTeams is required", 400);
  }

  const match = await Match.findById(matchId);
  if (!match) {
    throw new AppError("Match not found", 404);
  }

  const selectedSet = new Set((match.selectedTeams || []).map((teamId) => String(teamId)));
  qualifiedTeams.forEach((teamId) => {
    if (!selectedSet.has(String(teamId))) {
      throw new AppError("qualifiedTeams must be a subset of selectedTeams", 400);
    }
  });

  match.qualifiedTeams = qualifiedTeams;
  await match.save();

  const details = await getMatch(match._id);

  emitLeaderboardUpdate(io, match._id, {
    matchId: String(match._id),
    status: match.status,
    qualifiedTeams: details.qualifiedTeams,
    rows: details.results,
    updatedAt: new Date().toISOString()
  });

  return details;
};

const updateMatch = async (payload, io) => {
  const matchId = toObjectId(payload.matchId, "matchId");
  const match = await Match.findById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.isLocked || match.status === "completed") {
    throw new AppError("Match is locked and cannot be updated", 400);
  }

  const normalizedResults = await normalizeTeamResults({
    match,
    rawResults: payload.results,
    requireAllSelected: true
  });

  const previousResults = toResultInputRows(match.results);
  match.results = normalizedResults;
  await match.save();

  await applyResultStatsDelta({
    match,
    previousResults,
    nextResults: normalizedResults
  });

  const details = await getMatch(match._id);
  emitLeaderboardUpdate(io, match._id, {
    matchId: String(match._id),
    status: match.status,
    rows: details.results,
    updatedAt: new Date().toISOString()
  });

  return details;
};

const editMatch = async (matchId, payload, io) => {
  const id = toObjectId(matchId, "matchId");
  const match = await Match.findById(id);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.isLocked || match.status === "completed") {
    throw new AppError("Match is locked and cannot be edited", 400);
  }

  const existingRows = toResultInputRows(match.results);
  const incomingRows = Array.isArray(payload.results) ? payload.results : [];

  if (!incomingRows.length) {
    throw new AppError("results is required", 400);
  }

  const mergedMap = new Map(existingRows.map((entry) => [String(entry.teamId), entry]));
  incomingRows.forEach((entry) => {
    const key = String(entry.teamId);
    mergedMap.set(key, entry);
  });

  const mergedRows = [...mergedMap.values()];
  const normalizedResults = await normalizeTeamResults({
    match,
    rawResults: mergedRows,
    requireAllSelected: false
  });

  const previousResults = existingRows;
  match.results = normalizedResults;
  await match.save();

  await applyResultStatsDelta({
    match,
    previousResults,
    nextResults: normalizedResults
  });

  const details = await getMatch(match._id);
  emitLeaderboardUpdate(io, match._id, {
    matchId: String(match._id),
    status: match.status,
    rows: details.results,
    updatedAt: new Date().toISOString()
  });

  return details;
};

const addRoomDetails = async (payload, io) => {
  const matchId = normalizeString(payload.matchId);
  const roomId = normalizeString(payload.roomId);
  const roomPassword = normalizeString(payload.password || payload.roomPassword);

  if (!matchId || !roomId || !roomPassword) {
    throw new AppError("matchId, roomId and password are required", 400);
  }

  const match = await Match.findByIdAndUpdate(
    matchId,
    {
      $set: {
        roomId,
        roomPassword
      }
    },
    {
      new: true
    }
  )
    .populate("tournamentId", "title name")
    .populate("selectedTeams", "teamId name")
    .populate("qualifiedTeams", "teamId name")
    .lean();

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  await Tournament.findByIdAndUpdate(match.tournamentId?._id || match.tournamentId, {
    $set: {
      roomId,
      roomPassword
    }
  });

  io?.to(String(match._id)).emit("match:room", {
    matchId: String(match._id),
    roomId,
    password: roomPassword
  });

  return mapMatch(match);
};

const endMatch = async (payload, io) => {
  const matchId = toObjectId(payload.matchId, "matchId");
  const match = await Match.findById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (!Array.isArray(match.results) || !match.results.length) {
    throw new AppError("Cannot end match before entering results", 400);
  }

  if (!match.isLocked) {
    match.status = "completed";
    match.isLocked = true;
    match.lockedAt = new Date();
    await match.save();
  }

  await Tournament.findByIdAndUpdate(match.tournamentId, {
    $set: {
      status: "completed"
    }
  });

  const details = await getMatch(match._id);
  emitLeaderboardUpdate(io, match._id, {
    matchId: String(match._id),
    status: "completed",
    rows: details.results,
    updatedAt: new Date().toISOString()
  });

  io?.to(String(match._id)).emit("match:end", details);
  leaderboardService.invalidateLeaderboardCache();
   return details;
};

const getUsers = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {
    role: "user"
  };

  const searchRegex = buildRegex(query.search);
  if (searchRegex) {
    filter.$or = [
      { username: searchRegex },
      { email: searchRegex },
      { gameId: searchRegex },
      { phone: searchRegex }
    ];
  }

  const bannedFilter = parseBoolean(query.banned);
  if (bannedFilter !== null) {
    filter.isBanned = bannedFilter;
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(
        "_id username email phone gameId uid role walletBalance isBanned bannedAt bannedReason stats createdAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);

  const userIds = users.map((user) => user._id);

  const [failedTxAgg, rapidJoinAgg] = await Promise.all([
    userIds.length
      ? Transaction.aggregate([
          {
            $match: {
              userId: { $in: userIds },
              status: "failed",
              createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: "$userId",
              count: { $sum: 1 }
            }
          }
        ])
      : Promise.resolve([]),
    userIds.length
      ? Transaction.aggregate([
          {
            $match: {
              userId: { $in: userIds },
              type: "debit",
              status: "success",
              "notes.flow": "tournament_join",
              createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: "$userId",
              count: { $sum: 1 }
            }
          }
        ])
      : Promise.resolve([])
  ]);

  const failedMap = new Map(failedTxAgg.map((item) => [String(item._id), item.count]));
  const rapidJoinMap = new Map(rapidJoinAgg.map((item) => [String(item._id), item.count]));

  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    results: users.map((user) => {
      const failedCount = failedMap.get(String(user._id)) || 0;
      const rapidJoinCount = rapidJoinMap.get(String(user._id)) || 0;
      const reasons = [];

      if (failedCount >= FAILED_TXN_FLAG_COUNT) {
        reasons.push("MULTIPLE_FAILED_TXN_24H");
      }

      if (rapidJoinCount >= RAPID_JOIN_FLAG_COUNT) {
        reasons.push("RAPID_TOURNAMENT_JOINS_1H");
      }

      return mapUser(user, {
        flagged: reasons.length > 0,
        reasons
      });
    })
  };
};

const banUser = async ({ userId, ban, reason, adminUserId }) => {
  const normalizedUserId = normalizeString(userId);

  if (!normalizedUserId) {
    throw new AppError("userId is required", 400);
  }

  const targetUser = await User.findById(normalizedUserId);

  if (!targetUser) {
    throw new AppError("User not found", 404);
  }

  if (targetUser.role === "admin") {
    throw new AppError("Admin users cannot be moderated via this endpoint", 400);
  }

  const shouldBan = ban !== false;

  if (shouldBan) {
    targetUser.isBanned = true;
    targetUser.bannedAt = new Date();
    targetUser.bannedReason = normalizeString(reason) || "Suspicious activity";
    targetUser.bannedBy = adminUserId;
  } else {
    targetUser.isBanned = false;
    targetUser.bannedAt = null;
    targetUser.bannedReason = null;
    targetUser.bannedBy = null;
  }

  await targetUser.save();

  return mapUser(targetUser.toObject());
};

const getTransactions = async (query = {}) => walletService.getAdminTransactions(query);

const approveWithdraw = async ({ transactionId, approve, note, adminUserId }) => {
  const id = normalizeString(transactionId);

  if (!id) {
    throw new AppError("transactionId is required", 400);
  }

  const shouldApprove = approve !== false;

  const transaction = shouldApprove
    ? await walletService.approveWithdraw({
        transactionId: id,
        adminUserId,
        note
      })
    : await walletService.rejectWithdraw({
        transactionId: id,
        adminUserId,
        note
      });

  return {
    decision: shouldApprove ? "approved" : "rejected",
    transaction
  };
};

const loginAdmin = (payload) => authService.adminLogin(payload);

module.exports = {
  loginAdmin,
  getDashboard,
  createTournament,
  getTournaments,
  updateTournament,
  deleteTournament,
  registerTeam,
  getTeams,
  createMatch,
  saveQualifiedTeams,
  getMatch,
  getMatches,
  addRoomDetails,
  updateMatch,
  editMatch,
  endMatch,
  getUsers,
  banUser,
  getTransactions,
  approveWithdraw
};
