const express = require("express");
const {
  getCurrentUser,
  updateProfile,
  searchPlayers,
  toggleFollow,
  getUserById,
  getNotifications,
  markNotificationsRead
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/search", searchPlayers);
router.get("/me", protect, getCurrentUser);
router.put("/me", protect, upload.single("profileImage"), updateProfile);
router.get("/me/notifications", protect, getNotifications);
router.patch("/me/notifications", protect, markNotificationsRead);
router.post("/:id/follow", protect, toggleFollow);
router.get("/:id", getUserById);

module.exports = router;
