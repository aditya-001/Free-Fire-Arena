import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api, { resolveAsset } from "../api/axiosInstance";
import ChatPanel from "../components/ChatPanel";
import LoadingSpinner from "../components/LoadingSpinner";
import NotificationsPanel from "../components/NotificationsPanel";
import SearchPlayers from "../components/SearchPlayers";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { formatDateTime } from "../utils/formatters";

const ProfilePage = () => {
  const { user, setUser, refreshProfile } = useAuth();
  const { socket } = useSocket();
  const [profileLoading, setProfileLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [players, setPlayers] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    uid: "",
    skills: "",
    achievements: "",
    state: "",
    city: ""
  });

  const followingIds = user?.following?.map((player) => player._id || player) || [];

  const loadNotifications = async () => {
    const { data } = await api.get("/users/me/notifications");
    setNotifications(data);
  };

  const loadPlayers = async (query = "") => {
    const { data } = await api.get("/users/search", { params: { q: query } });
    setPlayers(data);
  };

  const loadConversation = async (playerId) => {
    const { data } = await api.get(`/messages/${playerId}`);
    setMessages(data);
  };

  useEffect(() => {
    const hydratePage = async () => {
      try {
        const freshProfile = await refreshProfile();
        if (freshProfile) {
          setFormData({
            username: freshProfile.username || "",
            bio: freshProfile.bio || "",
            uid: freshProfile.uid || "",
            skills: freshProfile.skills?.join(", ") || "",
            achievements: freshProfile.achievements?.join(", ") || "",
            state: freshProfile.location?.state || "",
            city: freshProfile.location?.city || ""
          });
        }
        await Promise.all([loadNotifications(), loadPlayers()]);
      } catch (error) {
        toast.error("Unable to load your profile");
      } finally {
        setProfileLoading(false);
      }
    };

    hydratePage();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPlayers(searchTerm).catch(() => {
        toast.error("Unable to search players");
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    if (!socket || !user) return undefined;

    const handleIncomingMessage = (incomingMessage) => {
      const senderId = incomingMessage.sender?._id || incomingMessage.sender;
      const receiverId = incomingMessage.receiver?._id || incomingMessage.receiver;
      const isMine = senderId === user._id || receiverId === user._id;

      if (!isMine) return;

      // Only append to the open thread when the incoming message belongs to it.
      if (
        selectedChatUser &&
        [senderId, receiverId].includes(selectedChatUser._id) &&
        [senderId, receiverId].includes(user._id)
      ) {
        setMessages((current) => [...current, incomingMessage]);
      }
    };

    socket.on("new_message", handleIncomingMessage);

    return () => {
      socket.off("new_message", handleIncomingMessage);
    };
  }, [socket, user, selectedChatUser]);

  const handleStartChat = async (player) => {
    setSelectedChatUser(player);
    await loadConversation(player._id);
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
      if (profileFile) payload.append("profileImage", profileFile);

      const { data } = await api.put("/users/me", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setUser(data);
      setFormData({
        username: data.username || "",
        bio: data.bio || "",
        uid: data.uid || "",
        skills: data.skills?.join(", ") || "",
        achievements: data.achievements?.join(", ") || "",
        state: data.location?.state || "",
        city: data.location?.city || ""
      });
      setProfileFile(null);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update profile");
    }
  };

  const handleToggleFollow = async (playerId) => {
    try {
      await api.post(`/users/${playerId}/follow`);
      const refreshedProfile = await refreshProfile();
      await loadPlayers(searchTerm);
      if (refreshedProfile) setUser(refreshedProfile);
      toast.success("Follow status updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update follow status");
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!socket || !selectedChatUser || !messageText.trim()) {
      return;
    }

    socket.emit("private_message", {
      receiverId: selectedChatUser._id,
      content: messageText.trim()
    });
    setMessageText("");
  };

  const handleMarkRead = async () => {
    try {
      await api.patch("/users/me/notifications");
      await loadNotifications();
      toast.success("Notifications marked as read");
    } catch (error) {
      toast.error("Unable to update notifications");
    }
  };

  if (profileLoading || !user) {
    return <LoadingSpinner label="Loading player dashboard..." fullscreen />;
  }

  return (
    <div className="page-content">
      <section className="profile-grid section-spacing">
        <div className="glass-card profile-hero">
          <div className="profile-hero__top">
            {user.profileImage ? (
              <img alt={user.username} className="profile-avatar" src={resolveAsset(user.profileImage)} />
            ) : (
              <div className="profile-avatar profile-avatar--fallback">{user.username.slice(0, 1)}</div>
            )}

            <div>
              <p className="section-kicker">Player profile</p>
              <h2>{user.username}</h2>
              <p className="hero-copy__body">{user.bio}</p>
              <div className="profile-meta">
                <span className="pill">{user.uid}</span>
                <span className="pill">
                  {user.location?.city}, {user.location?.state}
                </span>
                <span className="pill">{user.role === "admin" ? "Admin Host" : "Competitor"}</span>
              </div>
            </div>
          </div>

          <div className="profile-stats">
            <div>
              <strong>{user.followers?.length || 0}</strong>
              <span>Followers</span>
            </div>
            <div>
              <strong>{user.following?.length || 0}</strong>
              <span>Following</span>
            </div>
            <div>
              <strong>{user.stats?.points || 0}</strong>
              <span>Points</span>
            </div>
            <div>
              <strong>{user.stats?.wins || 0}</strong>
              <span>Wins</span>
            </div>
          </div>

          <div className="tag-row">
            {user.skills?.map((skill) => (
              <span key={skill} className="skill-tag">
                {skill}
              </span>
            ))}
          </div>

          <div className="achievement-list">
            {user.achievements?.map((achievement) => (
              <span key={achievement} className="pill pill--accent">
                {achievement}
              </span>
            ))}
          </div>
        </div>

        <form className="glass-card profile-form" onSubmit={handleProfileUpdate}>
          <div className="panel-section__header">
            <div>
              <p className="section-kicker">Edit profile</p>
              <h3>Update your player card</h3>
            </div>
          </div>

          <div className="field-group">
            <label>Profile image</label>
            <input accept="image/*" onChange={(event) => setProfileFile(event.target.files?.[0] || null)} type="file" />
          </div>

          <div className="field-grid">
            <div className="field-group">
              <label>Username</label>
              <input value={formData.username} onChange={(event) => setFormData((current) => ({ ...current, username: event.target.value }))} />
            </div>
            <div className="field-group">
              <label>Free Fire UID</label>
              <input value={formData.uid} onChange={(event) => setFormData((current) => ({ ...current, uid: event.target.value }))} />
            </div>
          </div>

          <div className="field-group">
            <label>Bio</label>
            <textarea
              rows="3"
              value={formData.bio}
              onChange={(event) => setFormData((current) => ({ ...current, bio: event.target.value }))}
            />
          </div>

          <div className="field-grid">
            <div className="field-group">
              <label>Skills</label>
              <input
                placeholder="Sniper, Rusher"
                value={formData.skills}
                onChange={(event) => setFormData((current) => ({ ...current, skills: event.target.value }))}
              />
            </div>
            <div className="field-group">
              <label>Achievements</label>
              <input
                placeholder="MVP, Top Fragger"
                value={formData.achievements}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, achievements: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="field-grid">
            <div className="field-group">
              <label>State</label>
              <input value={formData.state} onChange={(event) => setFormData((current) => ({ ...current, state: event.target.value }))} />
            </div>
            <div className="field-group">
              <label>City</label>
              <input value={formData.city} onChange={(event) => setFormData((current) => ({ ...current, city: event.target.value }))} />
            </div>
          </div>

          <button className="cta-button" type="submit">
            Edit Profile
          </button>
        </form>
      </section>

      <section className="dashboard-grid section-spacing">
        <NotificationsPanel notifications={notifications} onMarkRead={handleMarkRead} />
        <SearchPlayers
          currentUserId={user._id}
          followingIds={followingIds}
          onSearchChange={setSearchTerm}
          onStartChat={handleStartChat}
          onToggleFollow={handleToggleFollow}
          players={players}
          searchTerm={searchTerm}
        />
      </section>

      <section className="dashboard-grid section-spacing dashboard-grid--chat">
        <ChatPanel
          currentUserId={user._id}
          messageText={messageText}
          messages={messages}
          onMessageChange={setMessageText}
          onSend={handleSendMessage}
          selectedUser={selectedChatUser}
        />

        <section className="glass-card panel-section">
          <div className="panel-section__header">
            <div>
              <p className="section-kicker">Match history</p>
              <h3>Recent performances</h3>
            </div>
          </div>

          <div className="history-list">
            {user.matchHistory?.length ? (
              user.matchHistory.map((match, index) => (
                <article key={`${match.matchName}-${index}`} className="history-item">
                  <div>
                    <strong>{match.matchName}</strong>
                    <p>{formatDateTime(match.playedAt)}</p>
                  </div>
                  <div className="history-item__stats">
                    <span>#{match.placement}</span>
                    <span>{match.kills} kills</span>
                    <span>{match.points} pts</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="muted-copy">No matches logged yet.</p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
};

export default ProfilePage;
