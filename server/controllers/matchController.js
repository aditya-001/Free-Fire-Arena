const matchService = require("../services/matchService");
const { sendSuccess } = require("../utils/apiResponse");
const { API_MESSAGES } = require("../config/constants");

const updateLiveMatch = async (req, res, next) => {
  try {
    const data = await matchService.updateLiveMatch(req.params.matchId, req.body, req.io);
    const message = data?.status === "completed" ? API_MESSAGES.MATCH_COMPLETED : API_MESSAGES.LIVE_MATCH_UPDATED;

    return sendSuccess(res, {
      message,
      data
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  updateLiveMatch
};
