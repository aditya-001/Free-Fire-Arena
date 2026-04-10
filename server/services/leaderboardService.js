const Match = require("../models/Match");
const Team = require("../models/Team");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { TOURNAMENT_MODES } = require("../config/constants");

const CACHE_TTL_MS = Number(process.env.LEADERBOARD_CACHE_TTL_MS || 15000);
const leaderboardCache = new Map();

const parsePositiveInt = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const getCacheValue = (key) => {
  const cached = leaderboardCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    leaderboardCache.delete(key);
    return null;
  }

  return cached.value;
};

const setCacheValue = (key, value) => {
  leaderboardCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
};

const getLeaderboard = async ({ scope = "india", state, city, limit = 25 }) => {
  const safeLimit = parsePositiveInt(limit, 25, 100);
  const filter = {};

  if (scope === "state" && state) {
    filter["location.state"] = state;
  }

  if (scope === "city" && city) {
    filter["location.city"] = city;
  }

  const users = await User.find(filter)
    .select("username uid gameId profileImage location stats")
    .sort({ "stats.points": -1, "stats.totalKills": -1, "stats.totalBooyah": -1 })
    .limit(safeLimit)
    .lean();

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    _id: user._id,
    playerName: user.username,
    uid: user.uid || user.gameId,
    points: user.stats?.points || 0,
    wins: user.stats?.totalBooyah || user.stats?.wins || 0,
    matches: user.stats?.matchesPlayed || user.stats?.matches || 0,
    state: user.location?.state || null,
    city: user.location?.city || null,
    profileImage: user.profileImage || ""
  }));

  return {
    scope,
    state: state || null,
    city: city || null,
    results: leaderboard
  };
};

const getMatchLeaderboard = async (matchId) => {
  const match = await Match.findById(matchId)
    .select("_id tournamentId matchNumber mode status startTime results")
    .populate({ path: "tournamentId", select: "title" })
    .populate({ path: "results.user", select: "username gameId uid" })
    .populate({ path: "results.teamId", select: "name" })
    .lean();

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  const rows = [...(match.results || [])]
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return (b.kills || 0) - (a.kills || 0);
    })
    .map((result, index) => ({
      rank: result.rank || index + 1,
      player: result.user?.username || "Unknown Player",
      playerId: result.user?._id || null,
      gameId: result.user?.gameId || result.user?.uid || null,
      team: result.teamId?.name || null,
      teamId: result.teamId?._id || null,
      kills: Number(result.kills || 0),
      booyah: Boolean(result.booyah)
    }));

  return {
    matchId: match._id,
    tournamentId: match.tournamentId?._id || null,
    tournamentTitle: match.tournamentId?.title || "Tournament Match",
    matchNumber: match.matchNumber,
    mode: match.mode,
    status: match.status,
    startTime: match.startTime,
    rows
  };
};

const getMatchHistory = async ({ limit = 10 } = {}) => {
  const safeLimit = parsePositiveInt(limit, 10, 10);
  const matches = await Match.find({})
    .select("_id startTime mode status")
    .sort({ startTime: -1 })
    .limit(safeLimit)
    .lean();

  return matches.map((match) => {
    const start = new Date(match.startTime);

    return {
      matchId: match._id,
      title: `Match ${match._id}`,
      mode: match.mode,
      date: Number.isNaN(start.getTime()) ? null : start.toISOString().split("T")[0],
      time:
        Number.isNaN(start.getTime())
          ? null
          : start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      status: match.status
    };
  });
};

const getPlayerLeaderboard = async ({ limit = 100 } = {}) => {
  const safeLimit = parsePositiveInt(limit, 100, 100);
  const cacheKey = `players:${safeLimit}`;
  const cached = getCacheValue(cacheKey);

  if (cached) {
    return cached;
  }

  const users = await User.find({})
    .sort({ "stats.points": -1, "stats.totalKills": -1, "stats.totalBooyah": -1 })
    .limit(safeLimit)
    .select("username gameId uid stats")
    .lean();

  const response = {
    count: users.length,
    results: users.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      username: user.username || "Unknown Player",
      gameId: user.gameId || user.uid || null,
      totalKills: Number(user.stats?.totalKills ?? user.stats?.kills ?? 0),
      totalBooyah: Number(user.stats?.totalBooyah ?? user.stats?.wins ?? 0),
      matchesPlayed: Number(user.stats?.matchesPlayed ?? user.stats?.matches ?? 0),
      points: Number(user.stats?.points || 0)
    }))
  };

  setCacheValue(cacheKey, response);
  return response;
};

const getTeamLeaderboard = async ({ mode = "BR", limit = 100 } = {}) => {
  const normalizedMode = String(mode || "BR").toUpperCase();
  if (!TOURNAMENT_MODES.includes(normalizedMode)) {
    throw new AppError("mode must be BR or CS", 400);
  }

  const safeLimit = parsePositiveInt(limit, 100, 100);
  const cacheKey = `teams:${normalizedMode}:${safeLimit}`;
  const cached = getCacheValue(cacheKey);

  if (cached) {
    return cached;
  }

  const sortConfig =
    normalizedMode === "BR"
      ? {
          "stats.modeStats.BR.booyah": -1,
          "stats.modeStats.BR.kills": -1,
          "stats.modeStats.BR.matchesPlayed": 1
        }
      : {
          "stats.modeStats.CS.wins": -1,
          "stats.modeStats.CS.kills": -1,
          "stats.modeStats.CS.matchesPlayed": 1
        };

  const teams = await Team.find({})
    .sort(sortConfig)
    .limit(safeLimit)
    .select("name stats")
    .lean();

  const leaderboard = teams.map((team) => {
    const modeStats = team.stats?.modeStats?.[normalizedMode] || {};

    const totalKills = Number(modeStats.kills ?? team.stats?.totalKills ?? 0);
    const totalBooyah = Number(modeStats.booyah ?? team.stats?.totalBooyah ?? 0);
    const totalWins = Number(modeStats.wins ?? team.stats?.totalWins ?? 0);
    const matchesPlayed = Number(modeStats.matchesPlayed ?? team.stats?.matchesPlayed ?? 0);

    return {
      teamId: team._id,
      name: team.name || "Unknown Team",
      totalKills,
      totalBooyah,
      totalWins,
      matchesPlayed
    };
  });

  const response = {
    mode: normalizedMode,
    count: leaderboard.length,
    results: leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
      priorityMetric: normalizedMode === "BR" ? entry.totalBooyah + entry.totalKills : entry.totalWins
    }))
  };

  setCacheValue(cacheKey, response);
  return response;
};

const invalidateLeaderboardCache = () => {
  leaderboardCache.clear();
};

module.exports = {
  getLeaderboard,
  getMatchLeaderboard,
  getMatchHistory,
  getPlayerLeaderboard,
  getTeamLeaderboard,
  invalidateLeaderboardCache
};
