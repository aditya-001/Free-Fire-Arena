import { Search, UserPlus } from "lucide-react";
import { resolveAsset } from "../../api/axiosInstance";

const SearchPlayers = ({
  searchTerm,
  onSearchChange,
  players,
  currentUserId,
  followingIds,
  onToggleFollow,
  onStartChat
}) => (
  <section className="glass-card panel-section">
    <div className="panel-section__header">
      <div>
        <p className="section-kicker">Community</p>
        <h3>Search players</h3>
      </div>
    </div>

    <label className="search-field">
      <Search size={16} />
      <input
        placeholder="Search by player name or UID"
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </label>

    <div className="player-list">
      {players.map((player) => {
        const isCurrentUser = player._id === currentUserId;
        const isFollowing = followingIds.includes(player._id);
        const locationLabel = [player.location?.city, player.location?.state].filter(Boolean).join(", ");

        return (
          <article key={player._id} className="player-card">
            <div className="player-card__meta">
              {player.profileImage ? (
                <img alt={player.username} className="avatar-image" src={resolveAsset(player.profileImage)} />
              ) : (
                <div className="avatar-fallback">{player.username.slice(0, 1)}</div>
              )}
              <div>
                <strong>{player.username}</strong>
                <p>{player.uid || player.gameId || "NO-ID"}</p>
                <span>{locationLabel || "Arena"}</span>
              </div>
            </div>

            <div className="player-card__actions">
              {!isCurrentUser && (
                <button className="text-button" onClick={() => onToggleFollow(player._id)} type="button">
                  <UserPlus size={14} />
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
              {!isCurrentUser && (
                <button className="text-button" onClick={() => onStartChat(player)} type="button">
                  Chat
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  </section>
);

export default SearchPlayers;
