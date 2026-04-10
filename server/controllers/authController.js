const authService = require("../services/authService");
const { sendSuccess } = require("../utils/apiResponse");
const { API_MESSAGES } = require("../config/constants");

const registerUser = async (req, res, next) => {
  try {
    const data = await authService.registerUser(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.REGISTER_SUCCESS,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const checkRegistrationAvailability = async (req, res, next) => {
  try {
    const data = await authService.checkRegistrationAvailability(req.body);
    return sendSuccess(res, {
      message: API_MESSAGES.AVAILABILITY_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const data = await authService.loginUser(req.body);
    return sendSuccess(res, {
      message: API_MESSAGES.LOGIN_SUCCESS,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const adminRegister = async (req, res, next) => {
  try {
    const data = await authService.adminRegister(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.ADMIN_REGISTER_SUCCESS,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const adminLogin = async (req, res, next) => {
  try {
    const data = await authService.adminLogin(req.body);
    return sendSuccess(res, {
      message: API_MESSAGES.ADMIN_LOGIN_SUCCESS,
      data
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerUser,
  checkRegistrationAvailability,
  loginUser,
  adminRegister,
  adminLogin
};
