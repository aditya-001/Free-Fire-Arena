const express = require("express");
const {
  getTournaments,
  getLiveTournaments,
  getUpcomingTournaments,
  createTournament,
  joinTournament
} = require("../controllers/tournamentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getTournaments);
router.get("/live", getLiveTournaments);
router.get("/upcoming", getUpcomingTournaments);
router.post("/", protect, adminOnly, createTournament);
router.post("/:id/join", protect, joinTournament);

module.exports = router;
