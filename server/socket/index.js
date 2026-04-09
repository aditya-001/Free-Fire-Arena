const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

const configureSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const roomId = `user:${socket.user.id}`;
    socket.join(roomId);

    socket.on("private_message", async ({ receiverId, content }) => {
      if (!receiverId || !content?.trim()) return;

      // Save every message so the chat history survives refreshes and reconnects.
      const message = await Message.create({
        sender: socket.user.id,
        receiver: receiverId,
        content: content.trim()
      });

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "username profileImage")
        .populate("receiver", "username profileImage");

      // Deliver the same message to both the sender and receiver private rooms.
      io.to(roomId).to(`user:${receiverId}`).emit("new_message", populatedMessage);
    });
  });
};

module.exports = configureSocket;
