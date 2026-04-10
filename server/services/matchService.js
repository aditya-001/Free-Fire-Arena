const mongoose = require("mongoose");
const Match = require("../models/Match");
const Team = require("../models/Team");
const User = require("../models/User");
const Tournament = require("../models/Tournament");
const AppError = require("../utils/AppError");
const leaderboardService = require("./leaderboardService");

const getMatchRoom = (matchId) => String(matchId);
const LEADERBOARD_UPDATE_DEBOUNCE_MS = Number(process.env.LEADERBOARD_UPDATE_DEBOUNCE_MS || 500);
const leaderboardUpdateTimeouts = new Map();

const toObjectId = (value, fieldName) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;

  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  throw new AppError(`${fieldName} is invalid`, 400);
};

const ensurePrimaryMatchForTournament = async (tournamentDoc, io) => {
  if (!tournamentDoc?._id) {
    throw new AppError("Tournament is required to create match", 400);
  }

  const existingMatch = await Match.findOne({ tournamentId: tournamentDoc._id })
    .sort({ matchNumber: 1 })
    .select("_id");

  if (existingMatch) {
    return existingMatch;
  }

  const participants = Array.isArray(tournamentDoc.joinedPlayers)
    ? tournamentDoc.joinedPlayers
    : Array.isArray(tournamentDoc.participants)
      ? tournamentDoc.participants
      : [];

  const match = await Match.create({
    tournamentId: tournamentDoc._id,
    matchNumber: 1,
    mode: String(tournamentDoc.mode || "BR").toUpperCase(),
    status: tournamentDoc.status === "completed" ? "completed" : "live",
    startTime: tournamentDoc.startTime || tournamentDoc.dateTime || new Date(),
    participants,
    results: []
  });

  io?.to(getMatchRoom(match._id)).emit("match:update", {
    matchId: match._id,
    rows: []
  });

  return match;
};

const joinUserToTournamentMatch = async (tournamentDoc, userId, io) => {
  if (!tournamentDoc?._id) {
    throw new AppError("Tournament not found", 404);
  }

  const match = await ensurePrimaryMatchForTournament(tournamentDoc, io);
  const freshMatch = await Match.findById(match._id);

  if (!freshMatch) {
    throw new AppError("Match not found", 404);
  }

  const userObjectId = toObjectId(userId, "userId");
  const hasParticipant = freshMatch.participants.some((participant) => participant.equals(userObjectId));

  if (!hasParticipant) {
    freshMatch.participants.push(userObjectId);
    await freshMatch.save();
  }

  return freshMatch;
};

const normalizeResultsPayload = async (results = []) => {
  const uniqueUsers = new Set();
  const userIds = [];
  const teamIds = [];

  const normalized = results.map((entry) => {
    const userId = toObjectId(entry.userId || entry.user, "userId");
    if (!userId) {
      throw new AppError("userId is required for every result", 400);
    }

    const userKey = String(userId);
    if (uniqueUsers.has(userKey)) {
      throw new AppError("Duplicate user entries in results are not allowed", 400);
    }

    uniqueUsers.add(userKey);
    userIds.push(userId);

    const teamId = entry.teamId ? toObjectId(entry.teamId, "teamId") : null;
    if (teamId) {
      teamIds.push(teamId);
    }

    const kills = Number.parseInt(entry.kills, 10);
    const rank = Number.parseInt(entry.rank, 10);

    if (!Number.isFinite(rank) || rank <= 0) {
      throw new AppError("rank must be a positive number", 400);
    }

    return {
      user: userId,
      teamId,
      kills: Number.isFinite(kills) && kills >= 0 ? kills : 0,
      booyah: Boolean(entry.booyah),
      rank
    };
  });

  if (userIds.length) {
    const userCount = await User.countDocuments({ _id: { $in: userIds } });
    if (userCount !== userIds.length) {
      throw new AppError("One or more users in results were not found", 404);
    }
  }

  if (teamIds.length) {
    const teamCount = await Team.countDocuments({ _id: { $in: teamIds } });
    if (teamCount !== teamIds.length) {
      throw new AppError("One or more teams in results were not found", 404);
    }
  }

  return normalized;
};

const emitMatchUpdate = (io, matchId, payload) => {
  if (!io) return;

  const room = getMatchRoom(matchId);
  io.to(room).emit("match:update", payload);
  const existingTimeout = leaderboardUpdateTimeouts.get(room);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeout = setTimeout(() => {
    io.to(room).emit("leaderboardUpdate", payload);
    leaderboardUpdateTimeouts.delete(room);
  }, LEADERBOARD_UPDATE_DEBOUNCE_MS);

  leaderboardUpdateTimeouts.set(room, timeout);
};

const clearPendingLeaderboardUpdate = (matchId) => {
  const room = getMatchRoom(matchId);
  const pendingTimeout = leaderboardUpdateTimeouts.get(room);

  if (!pendingTimeout) return;

  clearTimeout(pendingTimeout);
  leaderboardUpdateTimeouts.delete(room);
};

const endMatch = async (matchId, io) => {
  const match = await Match.findById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.status === "completed") {
    return leaderboardService.getMatchLeaderboard(match._id);
  }

  match.status = "completed";
  await match.save();

  const userBulkOps = match.results.map((result) => ({
    updateOne: {
      filter: { _id: result.user },
      update: {
        $inc: {
          "stats.totalKills": result.kills || 0,
          "stats.totalBooyah": result.booyah ? 1 : 0,
          "stats.matchesPlayed": 1,

          "stats.kills": result.kills || 0,
          "stats.wins": result.booyah ? 1 : 0,
          "stats.matches": 1,
          "stats.points": (result.kills || 0) * 2 + (result.booyah ? 10 : 0)
        }
      }
    }
  }));

  if (userBulkOps.length) {
    await User.bulkWrite(userBulkOps, { ordered: false });
  }

  const teamStatsMap = new Map();
  for (const result of match.results) {
    if (!result.teamId) continue;

    const key = String(result.teamId);
    if (!teamStatsMap.has(key)) {
      teamStatsMap.set(key, {
        teamId: result.teamId,
        kills: 0,
        booyah: 0,
        wins: 0,
        matchesPlayed: 0
      });
    }

    const bucket = teamStatsMap.get(key);
    bucket.kills += result.kills || 0;
    bucket.booyah += result.booyah ? 1 : 0;
    bucket.wins += result.rank === 1 ? 1 : 0;
    bucket.matchesPlayed += 1;
  }

  const teamBulkOps = [...teamStatsMap.values()].map((entry) => {
    const modePath = `stats.modeStats.${match.mode}`;

    return {
      updateOne: {
        filter: { _id: entry.teamId },
        update: {
          $inc: {
            "stats.totalKills": entry.kills,
            "stats.totalBooyah": entry.booyah,
            "stats.totalWins": entry.wins,
            "stats.matchesPlayed": entry.matchesPlayed,

            [`${modePath}.kills`]: entry.kills,
            [`${modePath}.booyah`]: entry.booyah,
            [`${modePath}.wins`]: entry.wins,
            [`${modePath}.matchesPlayed`]: entry.matchesPlayed
          }
        }
      }
    };
  });

  if (teamBulkOps.length) {
    await Team.bulkWrite(teamBulkOps, { ordered: false });
  }

  await Tournament.findByIdAndUpdate(match.tournamentId, { $set: { status: "completed" } });

  leaderboardService.invalidateLeaderboardCache();
  const finalLeaderboard = await leaderboardService.getMatchLeaderboard(match._id);
  clearPendingLeaderboardUpdate(match._id);

  io?.to(getMatchRoom(match._id)).emit("match:end", finalLeaderboard);

  return finalLeaderboard;
};

const finalizeMatch = endMatch;

const updateLiveMatch = async (matchId, payload, io) => {
  const parsedMatchId = toObjectId(matchId, "matchId");
  const match = await Match.findById(parsedMatchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.status === "completed") {
    throw new AppError("Match is already completed", 400);
  }

  let normalizedResults = [];
  const hasResultsPayload = Array.isArray(payload.results) && payload.results.length > 0;
  if (hasResultsPayload) {
    normalizedResults = await normalizeResultsPayload(payload.results);

    normalizedResults.forEach((incoming) => {
      const existingIndex = match.results.findIndex((result) => result.user.equals(incoming.user));

      if (existingIndex >= 0) {
        match.results[existingIndex] = incoming;
      } else {
        match.results.push(incoming);
      }
    });

    match.results.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return (b.kills || 0) - (a.kills || 0);
    });
  }

  const normalizedStatus = payload.status ? String(payload.status).toLowerCase() : null;
  const shouldEndMatch = payload.endMatch === true || normalizedStatus === "completed";

  if (normalizedStatus === "live") {
    match.status = "live";
  }

  await match.save();

  if (shouldEndMatch) {
    return endMatch(match._id, io);
  }

  const changedRows = normalizedResults.map((entry) => ({
    userId: entry.user,
    teamId: entry.teamId,
    kills: entry.kills,
    booyah: entry.booyah,
    rank: entry.rank
  }));

  const liveDelta = {
    matchId: match._id,
    status: match.status,
    changedRows,
    updatedAt: new Date().toISOString()
  };

  emitMatchUpdate(io, match._id, liveDelta);

  return liveDelta;
};

module.exports = {
  ensurePrimaryMatchForTournament,
  joinUserToTournamentMatch,
  updateLiveMatch,
  endMatch,
  finalizeMatch
};
