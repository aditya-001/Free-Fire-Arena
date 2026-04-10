const leaderboardService = require("../services/leaderboardService");
const { sendSuccess } = require("../utils/apiResponse");
const { API_MESSAGES } = require("../config/constants");

const getLeaderboard = async (req, res, next) => {
  try {
    const data = await leaderboardService.getLeaderboard(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.LEADERBOARD_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getLeaderboard };
