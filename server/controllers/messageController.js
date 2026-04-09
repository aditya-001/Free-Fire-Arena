const Message = require("../models/Message");

const getConversation = async (req, res) => {
  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: req.params.userId },
      { sender: req.params.userId, receiver: req.user._id }
    ]
  })
    .populate("sender", "username profileImage")
    .populate("receiver", "username profileImage")
    .sort({ createdAt: 1 });

  return res.json(messages);
};

module.exports = { getConversation };
