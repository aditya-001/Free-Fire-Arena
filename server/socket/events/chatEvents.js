const Message = require("../../models/Message");
const logger = require("../../utils/logger");

const registerChatEvents = (io, socket) => {
  const roomId = `user:${socket.user.id}`;
  socket.join(roomId);

  socket.on("private_message", async ({ receiverId, content }) => {
    try {
      if (!receiverId || !content?.trim()) return;

      const message = await Message.create({
        sender: socket.user.id,
        receiver: receiverId,
        content: content.trim()
      });

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "username profileImage")
        .populate("receiver", "username profileImage");

      io.to(roomId).to(`user:${receiverId}`).emit("new_message", populatedMessage);
    } catch (error) {
      logger.error(`socket private_message failed: ${error.message}`);
      socket.emit("socket_error", { message: "Unable to deliver message" });
    }
  });
};

module.exports = {
  registerChatEvents
};
