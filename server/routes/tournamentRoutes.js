const express = require("express");
const {
  getTournaments,
  getLiveTournaments,
  getUpcomingTournaments,
  getTournamentDetails,
  createTournament,
  joinTournament,
  joinTournamentByBody
} = require("../controllers/tournamentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  validateCreateTournament,
  validateGetTournamentDetails,
  validateJoinTournament,
  validateJoinTournamentBody
} = require("../validators/tournamentValidator");
const { userActionRateLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.get("/", getTournaments);
router.get("/live", getLiveTournaments);
router.get("/upcoming", getUpcomingTournaments);
router.get("/:id", validateGetTournamentDetails, getTournamentDetails);
router.post("/", protect, adminOnly, validateCreateTournament, createTournament);
router.post("/join", protect, userActionRateLimiter, validateJoinTournamentBody, joinTournamentByBody);
router.post("/:id/join", protect, userActionRateLimiter, validateJoinTournament, joinTournament);

module.exports = router;
