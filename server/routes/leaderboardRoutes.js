const express = require("express");
const {
	getLeaderboard,
	getMatchLeaderboard,
	getMatchHistory,
	getPlayerLeaderboard,
	getTeamLeaderboard
} = require("../controllers/leaderboardController");
const {
	validateMatchParams,
	validateHistoryQuery,
	validatePlayersQuery,
	validateTeamsQuery
} = require("../validators/leaderboardValidator");

const router = express.Router();

router.get("/matches/history", validateHistoryQuery, getMatchHistory);
router.get("/match/:matchId", validateMatchParams, getMatchLeaderboard);
router.get("/players", validatePlayersQuery, getPlayerLeaderboard);
router.get("/teams", validateTeamsQuery, getTeamLeaderboard);
router.get("/", getLeaderboard);

module.exports = router;
