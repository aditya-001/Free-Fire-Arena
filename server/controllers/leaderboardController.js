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

const getMatchLeaderboard = async (req, res, next) => {
  try {
    const data = await leaderboardService.getMatchLeaderboard(req.params.matchId);
    return sendSuccess(res, {
      message: API_MESSAGES.MATCH_LEADERBOARD_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getMatchHistory = async (req, res, next) => {
  try {
    const data = await leaderboardService.getMatchHistory(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.MATCH_HISTORY_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getPlayerLeaderboard = async (req, res, next) => {
  try {
    const data = await leaderboardService.getPlayerLeaderboard(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.PLAYER_LEADERBOARD_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getTeamLeaderboard = async (req, res, next) => {
  try {
    const data = await leaderboardService.getTeamLeaderboard(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.TEAM_LEADERBOARD_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getLeaderboard,
  getMatchLeaderboard,
  getMatchHistory,
  getPlayerLeaderboard,
  getTeamLeaderboard
};
