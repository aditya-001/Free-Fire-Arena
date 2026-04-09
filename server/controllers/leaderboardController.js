const User = require("../models/User");

const getLeaderboard = async (req, res) => {
  const { scope = "india", state, city } = req.query;
  const limit = Number(req.query.limit || 25);
  const filter = {};

  if (scope === "state" && state) {
    filter["location.state"] = state;
  }

  if (scope === "city" && city) {
    filter["location.city"] = city;
  }

  const users = await User.find(filter)
    .select("username uid profileImage location stats")
    .sort({ "stats.points": -1, "stats.wins": -1, "stats.matches": 1 })
    .limit(limit);

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    _id: user._id,
    playerName: user.username,
    uid: user.uid,
    points: user.stats.points,
    wins: user.stats.wins,
    matches: user.stats.matches,
    state: user.location.state,
    city: user.location.city,
    profileImage: user.profileImage
  }));

  return res.json({
    scope,
    state: state || null,
    city: city || null,
    results: leaderboard
  });
};

module.exports = { getLeaderboard };
