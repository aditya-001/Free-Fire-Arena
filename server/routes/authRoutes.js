const express = require("express");
const { loginUser, registerUser, adminRegister, adminLogin } = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin-register", adminRegister);
router.post("/admin-login", adminLogin);

module.exports = router;
