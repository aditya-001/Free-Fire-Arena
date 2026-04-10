const express = require("express");
const {
  registerTournament,
  createTournamentPaymentOrder,
  verifyTournamentPayment
} = require("../controllers/tournamentController");
const { protect } = require("../middleware/authMiddleware");
const { userActionRateLimiter } = require("../middleware/rateLimiter");
const upload = require("../middleware/upload");
const {
  validateTournamentRegistration,
  validateCreateTournamentPaymentOrderBody,
  validateTournamentPaymentVerifyBody
} = require("../validators/tournamentValidator");

const router = express.Router();

router.post(
  "/register",
  protect,
  userActionRateLimiter,
  upload.single("banner"),
  validateTournamentRegistration,
  registerTournament
);

router.post(
  "/payment/create-order",
  protect,
  userActionRateLimiter,
  validateCreateTournamentPaymentOrderBody,
  createTournamentPaymentOrder
);

router.post(
  "/payment/verify",
  protect,
  userActionRateLimiter,
  validateTournamentPaymentVerifyBody,
  verifyTournamentPayment
);

module.exports = router;
