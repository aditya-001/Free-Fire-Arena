const express = require("express");
const {
  adminLogin,
  getDashboard,
  createTournament,
  getTournaments,
  getTournamentRegistrations,
  reviewTournamentRegistration,
  closeTournamentRegistration,
  openTournamentRegistration,
  increaseTournamentTime,
  startTournament,
  assignTournamentMatch,
  updateTournament,
  updateTournamentRegistrationTime,
  deleteTournament,
  registerTeam,
  getTeams,
  createMatch,
  getTournamentBracket,
  createTournamentBracket,
  saveTournamentBracketResult,
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
  validateGetTournamentBracketParams,
  validateGetTournamentRegistrationsParams,
  validateCreateTournamentBracketBody,
  validateSaveBracketResultBody,
  validateReviewTournamentRegistrationBody,
  validateCloseTournamentRegistrationBody,
  validateOpenTournamentRegistrationBody,
  validateIncreaseTournamentTimeBody,
  validateStartTournamentBody,
  validateAssignTournamentMatchBody,
  validateQualifiedTeamsBody,
  validateGetAdminMatchParams,
  validateUpdateAdminMatchBody,
  validateEditAdminMatchParams,
  validateEditAdminMatchBody,
  validateEndAdminMatchBody,
  validateUpdateTournamentTimeBody
} = require("../validators/adminValidator");

const router = express.Router();

router.post("/login", authRateLimiter, adminLogin);

router.use(protect, adminOnly, userActionRateLimiter);

router.get("/dashboard", getDashboard);

router.post("/tournament/create", createTournament);
router.get("/tournaments", getTournaments);
router.get(
  "/tournament/:id/registrations",
  validateGetTournamentRegistrationsParams,
  getTournamentRegistrations
);
router.post(
  "/tournament/registration/review",
  validateReviewTournamentRegistrationBody,
  reviewTournamentRegistration
);
router.post(
  "/tournament/close-registration",
  validateCloseTournamentRegistrationBody,
  closeTournamentRegistration
);
router.put(
  "/tournament/close",
  validateCloseTournamentRegistrationBody,
  closeTournamentRegistration
);
router.put(
  "/tournament/open",
  validateOpenTournamentRegistrationBody,
  openTournamentRegistration
);
router.post(
  "/tournament/increase-time",
  validateIncreaseTournamentTimeBody,
  increaseTournamentTime
);
router.post("/tournament/start", validateStartTournamentBody, startTournament);
router.post(
  "/tournament/assign-match",
  validateAssignTournamentMatchBody,
  assignTournamentMatch
);
router.get("/tournament/:id/bracket", validateGetTournamentBracketParams, getTournamentBracket);
router.post("/tournament/bracket/create", validateCreateTournamentBracketBody, createTournamentBracket);
router.post("/tournament/bracket/result", validateSaveBracketResultBody, saveTournamentBracketResult);
router.put("/tournament/update-time", validateUpdateTournamentTimeBody, updateTournamentRegistrationTime);
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
