const walletService = require("../services/walletService");
const { sendSuccess } = require("../utils/apiResponse");
const { API_MESSAGES } = require("../config/constants");

const createOrder = async (req, res, next) => {
  try {
    const data = await walletService.createWalletOrder(req.user._id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: API_MESSAGES.WALLET_ORDER_CREATED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const data = await walletService.verifyWalletPayment(req.user._id, req.body);
    return sendSuccess(res, {
      message: API_MESSAGES.WALLET_PAYMENT_VERIFIED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getWalletBalance = async (req, res, next) => {
  try {
    const data = await walletService.getWalletBalance(req.user._id);
    return sendSuccess(res, {
      message: API_MESSAGES.WALLET_BALANCE_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getWalletHistory = async (req, res, next) => {
  try {
    const data = await walletService.getWalletHistory(req.user._id, req.query);
    return sendSuccess(res, {
      message: API_MESSAGES.WALLET_HISTORY_FETCHED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const requestWithdraw = async (req, res, next) => {
  try {
    const data = await walletService.withdrawFromWallet(req.user._id, req.body);
    return sendSuccess(res, {
      message: API_MESSAGES.WALLET_WITHDRAW_REQUESTED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const getAdminTransactions = async (req, res, next) => {
  try {
    const data = await walletService.getAdminTransactions(req.query);
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
    const data = await walletService.approveWithdraw({
      transactionId: req.params.transactionId,
      adminUserId: req.user._id,
      note: req.body.note
    });

    return sendSuccess(res, {
      message: API_MESSAGES.WITHDRAW_APPROVED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

const rejectWithdraw = async (req, res, next) => {
  try {
    const data = await walletService.rejectWithdraw({
      transactionId: req.params.transactionId,
      adminUserId: req.user._id,
      note: req.body.note
    });

    return sendSuccess(res, {
      message: API_MESSAGES.WITHDRAW_REJECTED,
      data
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getWalletBalance,
  getWalletHistory,
  requestWithdraw,
  getAdminTransactions,
  approveWithdraw,
  rejectWithdraw
};
