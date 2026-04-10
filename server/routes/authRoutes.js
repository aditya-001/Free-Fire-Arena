const express = require("express");
const {
	loginUser,
	registerUser,
	checkRegistrationAvailability,
	adminRegister,
	adminLogin
} = require("../controllers/authController");
const {
  validateRegister,
  validateAvailability,
  validateLogin,
  validateAdminRegister,
  validateAdminLogin
} = require("../validators/authValidator");
const { authRateLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.use(authRateLimiter);

router.post("/register", validateRegister, registerUser);
router.post("/check-availability", validateAvailability, checkRegistrationAvailability);
router.post("/login", validateLogin, loginUser);
router.post("/admin-register", validateAdminRegister, adminRegister);
router.post("/admin-login", validateAdminLogin, adminLogin);

module.exports = router;
