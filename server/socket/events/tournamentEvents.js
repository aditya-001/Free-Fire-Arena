const registerTournamentEvents = (io, socket) => {
  socket.on("tournament:subscribe", ({ tournamentId }) => {
    if (!tournamentId) return;
    socket.join(`tournament:${tournamentId}`);
  });

  socket.on("tournament:unsubscribe", ({ tournamentId }) => {
    if (!tournamentId) return;
    socket.leave(`tournament:${tournamentId}`);
  });
};

module.exports = {
  registerTournamentEvents
};
