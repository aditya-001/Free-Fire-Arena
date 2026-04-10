const adminService = require("../services/adminService");
const { sendSuccess } = require("../utils/apiResponse");
const { API_MESSAGES } = require("../config/constants");

const adminLogin = async (req, res, next) => {
  try {
    const data = await adminService.loginAdmin(req.body);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_LOGIN_SUCCESS,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const data = await adminService.getDashboard(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_DASHBOARD_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const createTournament = async (req, res, next) => {
  try {
    const data = await adminService.createTournament({
      payload: req.body,
      adminUserId: req.user._id,
      io: req.io
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.TOURNAMENT_CREATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getTournaments = async (req, res, next) => {
  try {
    const data = await adminService.getTournaments(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENTS_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getTournamentRegistrations = async (req, res, next) => {
  try {
    const data = await adminService.getTournamentRegistrations(req.params.id, req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_REGISTRATIONS_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const reviewTournamentRegistration = async (req, res, next) => {
  try {
    const data = await adminService.reviewTournamentRegistration({
      registrationId: req.body.registrationId,
      approve: req.body.approve,
      note: req.body.note,
      adminUserId: req.user._id
    });

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_REGISTRATION_REVIEWED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const closeTournamentRegistration = async (req, res, next) => {
  try {
    const data = await adminService.closeTournamentRegistration({
      tournamentId: req.body.tournamentId
    });

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_REGISTRATION_CLOSED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const openTournamentRegistration = async (req, res, next) => {
  try {
    const data = await adminService.openTournamentRegistration({
      tournamentId: req.body.tournamentId,
      registrationEndTime: req.body.registrationEndTime,
      minutes: req.body.minutes
    });

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_REGISTRATION_OPENED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const increaseTournamentTime = async (req, res, next) => {
  try {
    const data = await adminService.increaseTournamentTime({
      tournamentId: req.body.tournamentId,
      minutes: req.body.minutes
    });

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_TIME_INCREASED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const startTournament = async (req, res, next) => {
  try {
    const data = await adminService.startTournament({
      tournamentId: req.body.tournamentId
    });

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_STARTED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const assignTournamentMatch = async (req, res, next) => {
  try {
    const data = await adminService.assignTournamentMatch(req.body, req.io);

    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.ADMIN_TOURNAMENT_MATCH_ASSIGNED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const updateTournament = async (req, res, next) => {
  try {
    const data = await adminService.updateTournament(req.params.id, req.body);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_UPDATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const updateTournamentRegistrationTime = async (req, res, next) => {
  try {
    const data = await adminService.updateTournamentRegistrationTime(req.body);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_TIME_UPDATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const deleteTournament = async (req, res, next) => {
  try {
    const data = await adminService.deleteTournament(req.params.id);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TOURNAMENT_DELETED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const createMatch = async (req, res, next) => {
  try {
    const data = await adminService.createMatch(req.body, req.io);
    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.ADMIN_MATCH_CREATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getTournamentBracket = async (req, res, next) => {
  try {
    const data = await adminService.getTournamentBracket(req.params.id);

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_BRACKET_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const createTournamentBracket = async (req, res, next) => {
  try {
    const data = await adminService.createTournamentBracket(req.body, req.io);

    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.ADMIN_BRACKET_CREATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const saveTournamentBracketResult = async (req, res, next) => {
  try {
    const data = await adminService.saveTournamentBracketResult(req.body, req.io);

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_BRACKET_RESULT_SAVED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const registerTeam = async (req, res, next) => {
  try {
    const data = await adminService.registerTeam(req.body);

    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.ADMIN_TEAM_REGISTERED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getTeams = async (req, res, next) => {
  try {
    const data = await adminService.getTeams(req.query);

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TEAMS_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const saveQualifiedTeams = async (req, res, next) => {
  try {
    const data = await adminService.saveQualifiedTeams(req.body, req.io);

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_MATCH_QUALIFIED_TEAMS_SAVED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getMatch = async (req, res, next) => {
  try {
    const data = await adminService.getMatch(req.params.id);

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_MATCH_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getMatches = async (req, res, next) => {
  try {
    const data = await adminService.getMatches(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_MATCHES_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const addRoomDetails = async (req, res, next) => {
  try {
    const data = await adminService.addRoomDetails(req.body, req.io);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_MATCH_ROOM_UPDATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const updateMatch = async (req, res, next) => {
  try {
    const data = await adminService.updateMatch(req.body, req.io);

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_MATCH_RESULT_UPDATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const editMatch = async (req, res, next) => {
  try {
    const data = await adminService.editMatch(req.params.id, req.body, req.io);

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_MATCH_RESULT_EDITED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const endMatch = async (req, res, next) => {
  try {
    const data = await adminService.endMatch(req.body, req.io);

    return sendSuccess(res, {
      message: API_MESSAGES.MATCH_COMPLETED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const data = await adminService.getUsers(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_USERS_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const banUser = async (req, res, next) => {
  try {
    const data = await adminService.banUser({
      userId: req.body.userId,
      ban: req.body.ban,
      reason: req.body.reason,
      adminUserId: req.user._id
    });

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_USER_BAN_UPDATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const data = await adminService.getTransactions(req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_TRANSACTIONS_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const approveWithdraw = async (req, res, next) => {
  try {
    const data = await adminService.approveWithdraw({
      transactionId: req.body.transactionId,
      approve: req.body.approve,
      note: req.body.note,
      adminUserId: req.user._id
    });

    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_WITHDRAW_DECISION_SAVED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  adminLogin,
  getDashboard,
  createTournament,
  getTournaments,
  getTournamentRegistrations,
  reviewTournamentRegistration,
  closeTournamentRegistration,
  openTournamentRegistration,
  increaseTournamentTime,
  startTournament,
  assignTournamentMatch,
  updateTournament,
  updateTournamentRegistrationTime,
  deleteTournament,
  registerTeam,
  getTeams,
  createMatch,
  getTournamentBracket,
  createTournamentBracket,
  saveTournamentBracketResult,
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
