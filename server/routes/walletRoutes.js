const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { walletRateLimiter, userActionRateLimiter } = require("../middleware/rateLimiter");
const {
  createOrder,
  verifyPayment,
  getWalletBalance,
  getWalletHistory,
  requestWithdraw,
  getAdminTransactions,
  approveWithdraw,
  rejectWithdraw
} = require("../controllers/walletController");
const {
  validateCreateOrder,
  validateVerifyPayment,
  validateWithdraw,
  validateWalletHistoryQuery,
  validateAdminHistoryQuery,
  validateTransactionParams,
  validateAdminWithdrawDecision
} = require("../validators/walletValidator");

const router = express.Router();

router.use(protect);
router.use(walletRateLimiter);

router.get("/balance", getWalletBalance);
router.get("/history", validateWalletHistoryQuery, getWalletHistory);
router.post("/create-order", validateCreateOrder, createOrder);
router.post("/verify-payment", validateVerifyPayment, verifyPayment);
router.post("/withdraw", userActionRateLimiter, validateWithdraw, requestWithdraw);

router.get("/admin/transactions", adminOnly, validateAdminHistoryQuery, getAdminTransactions);
router.post(
  "/admin/withdrawals/:transactionId/approve",
  adminOnly,
  userActionRateLimiter,
  validateTransactionParams,
  validateAdminWithdrawDecision,
  approveWithdraw
);
router.post(
  "/admin/withdrawals/:transactionId/reject",
  adminOnly,
  userActionRateLimiter,
  validateTransactionParams,
  validateAdminWithdrawDecision,
  rejectWithdraw
);

module.exports = router;
