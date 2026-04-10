const express = require("express");
const {
  getTournaments,
  getLiveTournaments,
  getUpcomingTournaments,
  createTournament,
  joinTournament,
  joinTournamentByBody
} = require("../controllers/tournamentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  validateCreateTournament,
  validateJoinTournament,
  validateJoinTournamentBody
} = require("../validators/tournamentValidator");

const router = express.Router();

router.get("/", getTournaments);
router.get("/live", getLiveTournaments);
router.get("/upcoming", getUpcomingTournaments);
router.post("/", protect, adminOnly, validateCreateTournament, createTournament);
router.post("/join", protect, validateJoinTournamentBody, joinTournamentByBody);
router.post("/:id/join", protect, validateJoinTournament, joinTournament);

module.exports = router;
