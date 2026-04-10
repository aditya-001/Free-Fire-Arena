const express = require("express");
const {
  adminLogin,
  getDashboard,
  createTournament,
  getTournaments,
  updateTournament,
  deleteTournament,
  registerTeam,
  getTeams,
  createMatch,
  saveQualifiedTeams,
  getMatch,
  getMatches,
  addRoomDetails,
  updateMatch,
  editMatch,
  endMatch,
  getUsers,
  banUser,
  getTransactions,
  approveWithdraw
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { authRateLimiter, userActionRateLimiter } = require("../middleware/rateLimiter");
const {
  validateRegisterTeamBody,
  validateCreateAdminMatchBody,
  validateQualifiedTeamsBody,
  validateGetAdminMatchParams,
  validateUpdateAdminMatchBody,
  validateEditAdminMatchParams,
  validateEditAdminMatchBody,
  validateEndAdminMatchBody
} = require("../validators/adminValidator");

const router = express.Router();

router.post("/login", authRateLimiter, adminLogin);

router.use(protect, adminOnly, userActionRateLimiter);

router.get("/dashboard", getDashboard);

router.post("/tournament/create", createTournament);
router.get("/tournaments", getTournaments);
router.put("/tournament/:id", updateTournament);
router.delete("/tournament/:id", deleteTournament);

router.post("/team/register", validateRegisterTeamBody, registerTeam);
router.get("/teams", getTeams);

router.post("/match/create", validateCreateAdminMatchBody, createMatch);
router.post("/match/qualified-teams", validateQualifiedTeamsBody, saveQualifiedTeams);
router.get("/match/:id", validateGetAdminMatchParams, getMatch);
router.get("/matches", getMatches);
router.post("/match/add-room", addRoomDetails);
router.post("/match/update", validateUpdateAdminMatchBody, updateMatch);
router.put("/match/edit/:id", validateEditAdminMatchParams, validateEditAdminMatchBody, editMatch);
router.post("/match/end", validateEndAdminMatchBody, endMatch);

router.get("/users", getUsers);
router.put("/user/ban", banUser);

router.get("/transactions", getTransactions);
router.post("/withdraw/approve", approveWithdraw);

module.exports = router;
