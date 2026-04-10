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

const getTournamentDetails = async (req, res, next) => {
  try {
    const tournament = await tournamentService.getTournamentDetails(req.params.id);
    return sendSuccess(res, {
      message: API_MESSAGES.TOURNAMENT_DETAILS_FETCHED,
      data: tournament
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

const joinTournamentByBody = async (req, res, next) => {
  try {
    const tournament = await tournamentService.joinTournament(req.body.tournamentId, req.user._id, req.io);
    return sendSuccess(res, {
      message: API_MESSAGES.TOURNAMENT_JOINED,
      data: tournament
    });
  } catch (error) {
    return next(error);
  }
};

const registerTournament = async (req, res, next) => {
  try {
    const registration = await tournamentService.registerTournament(
      req.body,
      req.user._id,
      req.file
    );

    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.TOURNAMENT_REGISTERED,
      data: registration
    });
  } catch (error) {
    return next(error);
  }
};

const createTournamentPaymentOrder = async (req, res, next) => {
  try {
    const order = await tournamentService.createTournamentPaymentOrder(req.body, req.user._id, req.io);

    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.TOURNAMENT_PAYMENT_ORDER_CREATED,
      data: order
    });
  } catch (error) {
    return next(error);
  }
};

const verifyTournamentPayment = async (req, res, next) => {
  try {
    const result = await tournamentService.verifyTournamentPayment(req.body, req.user._id, req.io);

    return sendSuccess(res, {
      message: API_MESSAGES.TOURNAMENT_PAYMENT_VERIFIED,
      data: result
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getTournaments,
  getLiveTournaments,
  getUpcomingTournaments,
  getTournamentDetails,
  createTournament,
  joinTournament,
  joinTournamentByBody,
  registerTournament,
  createTournamentPaymentOrder,
  verifyTournamentPayment
};
