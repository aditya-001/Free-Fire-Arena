const express = require("express");
const {
  getTournaments,
  createTournament,
  joinTournament
} = require("../controllers/tournamentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getTournaments);
router.post("/", protect, adminOnly, createTournament);
router.post("/:id/join", protect, joinTournament);

module.exports = router;
