const registerMatchEvents = (io, socket) => {
  const joinMatchRoom = (payload) => {
    const matchId = typeof payload === "string" ? payload : payload?.matchId;
    if (!matchId) return;

    socket.join(String(matchId));
    socket.emit("match:joined", { matchId: String(matchId) });
  };

  const leaveMatchRoom = (payload) => {
    const matchId = typeof payload === "string" ? payload : payload?.matchId;
    if (!matchId) return;

    socket.leave(String(matchId));
  };

  socket.on("match:join", joinMatchRoom);
  // Alias retained for older clients.
  socket.on("joinMatch", joinMatchRoom);

  socket.on("match:leave", leaveMatchRoom);
};

module.exports = {
  registerMatchEvents
};
