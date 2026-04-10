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
  updateTournament,
  deleteTournament,
  registerTeam,
  getTeams,
  createMatch,
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
