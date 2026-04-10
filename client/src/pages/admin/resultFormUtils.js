export const createRowsFromMatch = (match, preferExisting = true) => {
  const selectedTeams = Array.isArray(match?.selectedTeams) ? match.selectedTeams : [];
  const existingResults = Array.isArray(match?.results) ? match.results : [];
  const existingByTeamId = new Map(
    existingResults.map((result) => [String(result.teamId || ""), result])
  );

  return selectedTeams.map((team, index) => {
    const teamId = String(team._id || team.teamId || "");
    const existing = preferExisting ? existingByTeamId.get(teamId) : null;
    const basePlayers = Array.isArray(team.players) ? team.players : [];

    const players = existing?.players?.length
      ? existing.players.map((playerEntry, playerIndex) => ({
          userId: String(playerEntry.userId || ""),
          kills: String(playerEntry.kills ?? "0"),
          key: `${teamId}-existing-${playerIndex}`
        }))
      : basePlayers.map((player, playerIndex) => ({
          userId: String(player._id || ""),
          kills: "0",
          key: `${teamId}-base-${playerIndex}`
        }));

    return {
      teamId,
      teamName: team.teamName || team.name || "Team",
      rank: String(existing?.rank ?? index + 1),
      totalKills: String(existing?.totalKills ?? 0),
      booyah: Boolean(existing?.booyah),
      players,
      availablePlayers: basePlayers.map((player) => ({
        userId: String(player._id || ""),
        username: player.username || "Unknown",
        gameId: player.gameId || ""
      }))
    };
  });
};

export const normalizeRowsForApi = (rows = []) =>
  rows.map((row) => ({
    teamId: row.teamId,
    rank: Number(row.rank || 1),
    totalKills: Number(row.totalKills || 0),
    booyah: Boolean(row.booyah),
    players: (row.players || []).map((player) => ({
      userId: player.userId,
      kills: Number(player.kills || 0)
    }))
  }));

export const hasDuplicateRanks = (rows = []) => {
  const ranks = rows.map((row) => Number(row.rank || 0));
  const seen = new Set();

  for (const rank of ranks) {
    if (!rank || rank < 1) {
      return true;
    }

    if (seen.has(rank)) {
      return true;
    }

    seen.add(rank);
  }

  return false;
};
