const express = require("express");
const { getConversation } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:userId", protect, getConversation);

module.exports = router;
