const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { registerChatEvents } = require("./events/chatEvents");
const { registerMatchEvents } = require("./events/matchEvents");
const { registerTournamentEvents } = require("./events/tournamentEvents");

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
      logger.warn(`Socket auth failed: ${error.message}`);
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    registerChatEvents(io, socket);
    registerMatchEvents(io, socket);
    registerTournamentEvents(io, socket);

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = configureSocket;
