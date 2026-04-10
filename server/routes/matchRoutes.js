const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { updateLiveMatch } = require("../controllers/matchController");
const {
  validateUpdateLiveMatchParams,
  validateUpdateLiveMatchBody
} = require("../validators/matchValidator");

const router = express.Router();

router.patch(
  "/:matchId/live",
  protect,
  adminOnly,
  validateUpdateLiveMatchParams,
  validateUpdateLiveMatchBody,
  updateLiveMatch
);

module.exports = router;
