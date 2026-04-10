const User = require("../models/User");

const getLeaderboard = async ({ scope = "india", state, city, limit = 25 }) => {
  const parsedLimit = Number(limit);
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 25;
  const filter = {};

  if (scope === "state" && state) {
    filter["location.state"] = state;
  }

  if (scope === "city" && city) {
    filter["location.city"] = city;
  }

  const users = await User.find(filter)
    .select("username uid gameId profileImage location stats")
    .sort({ "stats.points": -1, "stats.wins": -1, "stats.matches": 1 })
    .limit(safeLimit)
    .lean();

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    _id: user._id,
    playerName: user.username,
    uid: user.uid || user.gameId,
    points: user.stats?.points || 0,
    wins: user.stats?.wins || 0,
    matches: user.stats?.matches || 0,
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

module.exports = {
  getLeaderboard
};
