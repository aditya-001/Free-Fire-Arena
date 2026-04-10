const tournamentService = require("../services/tournamentService");
const { sendSuccess } = require("../utils/apiResponse");
const { API_MESSAGES } = require("../config/constants");

const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await tournamentService.getTournaments(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.TOURNAMENTS_FETCHED,
      data: tournaments
    });
  } catch (error) {
    return next(error);
  }
};

const getLiveTournaments = async (req, res, next) => {
  try {
    const tournaments = await tournamentService.getLiveTournaments(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.TOURNAMENTS_FETCHED,
      data: tournaments
    });
  } catch (error) {
    return next(error);
  }
};

const getUpcomingTournaments = async (req, res, next) => {
  try {
    const tournaments = await tournamentService.getUpcomingTournaments(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.TOURNAMENTS_FETCHED,
      data: tournaments
    });
  } catch (error) {
    return next(error);
  }
};

const createTournament = async (req, res, next) => {
  try {
    const tournament = await tournamentService.createTournament(req.body, req.user._id, req.io);
    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.TOURNAMENT_CREATED,
      data: tournament
    });
  } catch (error) {
    return next(error);
  }
};

const joinTournament = async (req, res, next) => {
  try {
    const tournament = await tournamentService.joinTournament(req.params.id, req.user._id, req.io);
    return sendSuccess(res, {
      message: API_MESSAGES.TOURNAMENT_JOINED,
      data: tournament
    });
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
