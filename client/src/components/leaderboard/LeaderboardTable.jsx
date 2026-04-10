const LeaderboardTable = ({ rows, emptyMessage }) => {
  if (!rows.length) {
    return <div className="glass-card empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="glass-card table-shell">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player Name</th>
            <th>UID</th>
            <th>Points</th>
            <th>Wins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id}>
              <td>#{row.rank}</td>
              <td>
                <div className="player-row">
                  <div className="player-row__avatar">{row.playerName.slice(0, 1)}</div>
                  <div>
                    <strong>{row.playerName}</strong>
                    <span>
                      {row.city}, {row.state}
                    </span>
                  </div>
                </div>
              </td>
              <td>{row.uid}</td>
              <td>{row.points}</td>
              <td>{row.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardTable;
