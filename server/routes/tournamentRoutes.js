const express = require("express");
const {
  getTournaments,
  getLiveTournaments,
  getUpcomingTournaments,
  createTournament,
  joinTournament
} = require("../controllers/tournamentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  validateCreateTournament,
  validateJoinTournament
} = require("../validators/tournamentValidator");

const router = express.Router();

router.get("/", getTournaments);
router.get("/live", getLiveTournaments);
router.get("/upcoming", getUpcomingTournaments);
router.post("/", protect, adminOnly, validateCreateTournament, createTournament);
router.post("/:id/join", protect, validateJoinTournament, joinTournament);

module.exports = router;
