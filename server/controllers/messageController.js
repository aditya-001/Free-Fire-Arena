const Message = require("../models/Message");
const { sendSuccess } = require("../utils/apiResponse");
const { API_MESSAGES } = require("../config/constants");

const getConversation = async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    })
      .populate("sender", "username profileImage")
      .populate("receiver", "username profileImage")
      .sort({ createdAt: 1 });

    return sendSuccess(res, {
      message: API_MESSAGES.MESSAGES_FETCHED,
      data: messages
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getConversation };
