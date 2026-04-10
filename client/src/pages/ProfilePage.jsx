import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Crosshair,
  Crown,
  Gamepad2,
  Medal,
  MessageCircle,
  Pencil,
  Shield,
  Swords,
  Trophy,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { resolveAsset } from "../api/axiosInstance";
import ChatPanel from "../components/chat/ChatPanel";
import LoadingSpinner from "../components/LoadingSpinner";
import SearchPlayers from "../components/search/SearchPlayers";
import CountUpValue from "../components/admin/CountUpValue";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import userService from "../services/userService";

const glassCardClass =
  "rounded-3xl border border-cyan-400/20 bg-[rgba(16,24,40,0.35)] backdrop-blur-xl shadow-[0_16px_50px_rgba(0,0,0,0.42)]";

const glowCardMotion = {
  whileHover: {
    y: -5,
    boxShadow: "0 0 30px rgba(45,212,191,0.14), 0 0 30px rgba(168,85,247,0.16)"
  },
  transition: { duration: 0.22, ease: "easeOut" }
};

const parseStats = (profile) => {
  const matches = Number(profile?.stats?.matchesPlayed ?? profile?.stats?.matches ?? 0);
  const wins = Number(profile?.stats?.totalBooyah ?? profile?.stats?.wins ?? 0);
  const kills = Number(profile?.stats?.totalKills ?? profile?.stats?.kills ?? 0);
  const winRate = matches > 0 ? Number(((wins / matches) * 100).toFixed(1)) : 0;

  return { matches, wins, kills, winRate };
};

const getRecentMatches = (profile) => {
  const history = Array.isArray(profile?.matchHistory) ? profile.matchHistory : [];

  return [...history]
    .sort((a, b) => new Date(b?.playedAt || 0) - new Date(a?.playedAt || 0))
    .slice(0, 5)
    .map((match) => {
      const rank = Number(match?.placement || 0);
      return {
        id: `${match?.matchName || "match"}-${match?.playedAt || Date.now()}`,
        name: match?.matchName || "Custom Room",
        rank,
        kills: Number(match?.kills || 0),
        result: rank === 1 ? "Win" : "Lose"
      };
    });
};

const buildProfileDraft = (profile) => ({
  username: profile?.username || "",
  gameId: profile?.gameId || profile?.uid || "",
  bio: profile?.bio || "",
  skills: Array.isArray(profile?.skills) ? profile.skills.join(", ") : "",
  achievements: Array.isArray(profile?.achievements) ? profile.achievements.join(", ") : "",
  state: profile?.location?.state || "",
  city: profile?.location?.city || ""
});

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const { socket } = useSocket();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState(user);

  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [followingIds, setFollowingIds] = useState([]);

  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(buildProfileDraft(user));
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [isAvatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const freshProfile = await refreshProfile();
        if (mounted) {
          setProfile(freshProfile || user);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load profile");
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!profile && user) {
      setProfile(user);
    }
  }, [user, profile]);

  useEffect(() => {
    const list = Array.isArray(profile?.following) ? profile.following : [];
    setFollowingIds(list.map((entry) => String(entry?._id || entry)));
  }, [profile?.following]);

  useEffect(() => {
    if (!isChatModalOpen) return undefined;

    const timeout = setTimeout(async () => {
      setPlayersLoading(true);

      try {
        const { data } = await userService.searchPlayers(searchTerm.trim());
        const normalized = (Array.isArray(data) ? data : []).map((player) => ({
          ...player,
          uid: player.uid || player.gameId || "NO-ID"
        }));

        setPlayers(normalized);
      } catch (error) {
        setPlayers([]);
      } finally {
        setPlayersLoading(false);
      }
    }, 260);

    return () => clearTimeout(timeout);
  }, [searchTerm, isChatModalOpen]);

  useEffect(() => {
    if (!socket || !isChatModalOpen) return undefined;

    const handleNewMessage = (incomingMessage) => {
      const activeUserId = String(selectedUser?._id || "");
      if (!activeUserId) return;

      const senderId = String(incomingMessage?.sender?._id || incomingMessage?.sender || "");
      const receiverId = String(incomingMessage?.receiver?._id || incomingMessage?.receiver || "");

      if (senderId !== activeUserId && receiverId !== activeUserId) {
        return;
      }

      setMessages((current) => {
        if (current.some((message) => message._id === incomingMessage._id)) {
          return current;
        }

        return [...current, incomingMessage];
      });
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, isChatModalOpen, selectedUser?._id]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const stats = useMemo(() => parseStats(profile), [profile]);
  const recentMatches = useMemo(() => getRecentMatches(profile), [profile]);

  const achievements = useMemo(() => {
    const rawAchievements = Array.isArray(profile?.achievements)
      ? profile.achievements.map((item) => String(item).toLowerCase())
      : [];

    return [
      {
        id: "winner",
        label: "Winner",
        icon: Crown,
        active: stats.wins > 0 || rawAchievements.some((item) => item.includes("winner")),
        accent: "#a855f7"
      },
      {
        id: "top-3",
        label: "Top 3",
        icon: Medal,
        active:
          rawAchievements.some((item) => item.includes("top")) ||
          recentMatches.some((match) => match.rank > 0 && match.rank <= 3),
        accent: "#22d3ee"
      },
      {
        id: "killer",
        label: "Killer",
        icon: Crosshair,
        active: stats.kills >= 25 || rawAchievements.some((item) => item.includes("killer")),
        accent: "#7c3aed"
      },
      {
        id: "booyah-hunter",
        label: "Booyah Hunter",
        icon: Trophy,
        active: stats.wins >= 5,
        accent: "#22d3ee"
      },
      {
        id: "arena-veteran",
        label: "Arena Veteran",
        icon: Swords,
        active: stats.matches >= 10,
        accent: "#a855f7"
      }
    ];
  }, [profile?.achievements, recentMatches, stats]);

  const quickStats = useMemo(
    () => [
      { label: "Matches", value: stats.matches },
      { label: "Wins", value: stats.wins },
      { label: "Kills", value: stats.kills }
    ],
    [stats]
  );

  const statCards = useMemo(
    () => [
      { title: "Total Matches", value: stats.matches, icon: Swords, suffix: "" },
      { title: "Booyah Wins", value: stats.wins, icon: Trophy, suffix: "" },
      { title: "Total Kills", value: stats.kills, icon: Crosshair, suffix: "" },
      { title: "Win Rate", value: stats.winRate, icon: Shield, suffix: "%" }
    ],
    [stats]
  );

  const isOwnProfile = String(profile?._id || "") === String(user?._id || "");

  const avatarUrl = profile?.profileImage ? resolveAsset(profile.profileImage) : "";
  const currentAvatarSrc = avatarPreview || avatarUrl;
  const initials = String(profile?.username || "P").charAt(0).toUpperCase();

  const fetchConversation = async (userId) => {
    if (!userId) return;

    setChatLoading(true);

    try {
      const { data } = await userService.getConversation(userId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load conversation");
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleStartChat = (player) => {
    if (!player?._id) return;

    setSelectedUser(player);
    setMessageText("");
    fetchConversation(player._id);
  };

  const handleSendMessage = (event) => {
    event.preventDefault();

    if (!selectedUser?._id) return;

    const text = messageText.trim();
    if (!text) return;

    if (!socket) {
      toast.error("Realtime chat unavailable");
      return;
    }

    socket.emit("private_message", {
      receiverId: selectedUser._id,
      content: text
    });

    setMessageText("");
  };

  const handleToggleFollow = async (userId) => {
    try {
      const { data } = await userService.toggleFollow(userId);
      const shouldFollow = Boolean(data?.following);
      const normalizedUserId = String(userId);

      setFollowingIds((current) => {
        if (shouldFollow) {
          return [...new Set([...current, normalizedUserId])];
        }

        return current.filter((entry) => entry !== normalizedUserId);
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update follow status");
    }
  };

  const openEditModal = () => {
    setEditDraft(buildProfileDraft(profile));
    setAvatarFile(null);
    setAvatarPreview(avatarUrl);
    setEditModalOpen(true);
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(file);
    });
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);

    try {
      const formData = new FormData();

      formData.append("username", editDraft.username.trim());
      formData.append("bio", editDraft.bio);

      if (editDraft.gameId.trim()) {
        formData.append("gameId", editDraft.gameId.trim());
      }

      if (editDraft.skills.trim()) {
        formData.append("skills", editDraft.skills);
      }

      if (editDraft.achievements.trim()) {
        formData.append("achievements", editDraft.achievements);
      }

      if (editDraft.state.trim()) {
        formData.append("state", editDraft.state.trim());
      }

      if (editDraft.city.trim()) {
        formData.append("city", editDraft.city.trim());
      }

      if (avatarFile) {
        formData.append("profileImage", avatarFile);
      }

      await userService.updateProfile(formData);
      const freshProfile = await refreshProfile();

      setProfile(freshProfile || profile);
      setEditModalOpen(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  if (profileLoading || !profile) {
    return <LoadingSpinner label="Loading gamer portfolio..." fullscreen />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <section className={`${glassCardClass} relative overflow-hidden p-5 sm:p-7`}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 left-12 h-44 w-44 rounded-full bg-purple-500/20 blur-[85px]" />
          <div className="absolute right-6 top-3 h-32 w-32 rounded-full bg-cyan-400/20 blur-[75px]" />
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="group relative mx-auto sm:mx-0"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0 2px rgba(34,211,238,0.45)",
                    "0 0 0 5px rgba(168,85,247,0.35)",
                    "0 0 0 2px rgba(34,211,238,0.45)"
                  ]
                }}
                transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
                className="h-28 w-28 overflow-hidden rounded-full border border-cyan-300/70 bg-slate-900"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={`${profile.username} avatar`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-cyan-400 text-4xl font-semibold text-white">
                    {initials}
                  </div>
                )}
              </motion.div>
              <span className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-cyan-300/35 bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-cyan-200 opacity-0 transition group-hover:opacity-100">
                View
              </span>
            </button>

            <div className="space-y-2 text-center sm:text-left">
              <h1 className="font-['Rajdhani'] text-3xl font-semibold tracking-wide text-white sm:text-4xl">
                {profile.username}
              </h1>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100/90">
                <Gamepad2 size={13} />
                {profile.gameId || profile.uid || "NO-ID"}
              </p>
              <p className="max-w-xl text-sm text-slate-300/90">
                {profile.bio || "Locked in. Eyes on the leaderboard."}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 sm:justify-start">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setChatModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/55 hover:bg-cyan-500/20"
                >
                  <MessageCircle size={16} />
                  Message
                </motion.button>

                {isOwnProfile ? (
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={openEditModal}
                    className="inline-flex items-center gap-2 rounded-xl border border-purple-300/35 bg-purple-500/10 px-4 py-2 text-sm text-purple-100 transition hover:border-purple-300/55 hover:bg-purple-500/20"
                  >
                    <Pencil size={15} />
                    Edit Profile
                  </motion.button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {quickStats.map((item) => (
              <motion.div
                key={item.label}
                {...glowCardMotion}
                className="rounded-2xl border border-purple-300/25 bg-[rgba(20,28,45,0.45)] p-3 text-center"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300/85">{item.label}</p>
                <p className="mt-2 font-['Rajdhani'] text-3xl font-bold text-white">
                  <CountUpValue value={item.value} />
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.title}
              {...glowCardMotion}
              className={`${glassCardClass} border-purple-400/20 p-4`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300/80">{card.title}</p>
                <Icon size={16} className="text-cyan-300" />
              </div>
              <p className="mt-3 font-['Rajdhani'] text-4xl font-bold text-white">
                <CountUpValue value={card.value} suffix={card.suffix} />
              </p>
            </motion.article>
          );
        })}
      </section>

      <section className={`${glassCardClass} p-5`}>
        <h2 className="font-['Rajdhani'] text-2xl font-semibold tracking-wide text-white">Achievements</h2>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {achievements.map((badge) => {
            const Icon = badge.icon;
            return (
              <motion.article
                key={badge.id}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`min-w-[160px] rounded-2xl border p-4 transition ${
                  badge.active
                    ? "border-cyan-300/35 bg-cyan-500/10"
                    : "border-slate-500/25 bg-slate-800/45"
                }`}
                style={{ boxShadow: badge.active ? `0 0 22px ${badge.accent}35` : "none" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-xl border p-2"
                    style={{ borderColor: `${badge.accent}66`, color: badge.accent }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{badge.label}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-300/80">
                      {badge.active ? "Unlocked" : "Locked"}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className={`${glassCardClass} p-5`}>
        <h2 className="font-['Rajdhani'] text-2xl font-semibold tracking-wide text-white">Recent Matches</h2>

        <div className="mt-4 space-y-2">
          {recentMatches.length ? (
            recentMatches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 3 }}
                className="grid grid-cols-[1.6fr_0.6fr_0.6fr_0.65fr] items-center gap-2 rounded-2xl border border-slate-500/25 bg-slate-900/35 px-4 py-3 text-sm"
              >
                <p className="truncate text-white">{match.name}</p>
                <p className="text-center font-medium text-slate-200">#{match.rank || "-"}</p>
                <p className="text-center text-slate-300">{match.kills} K</p>
                <p
                  className={`rounded-full border px-2 py-1 text-center text-xs uppercase tracking-[0.14em] ${
                    match.result === "Win"
                      ? "border-cyan-300/45 bg-cyan-500/10 text-cyan-100"
                      : "border-purple-300/35 bg-purple-500/10 text-purple-100"
                  }`}
                >
                  {match.result}
                </p>
              </motion.div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/35 px-4 py-5 text-sm text-slate-300">
              No recent match records yet.
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {isChatModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            onClick={() => setChatModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-6xl rounded-3xl border border-purple-300/30 bg-[#0B0F1A]/95 p-4 shadow-[0_0_40px_rgba(168,85,247,0.2)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Messaging Hub</p>
                  <h3 className="font-['Rajdhani'] text-3xl font-semibold text-white">Direct Chat</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setChatModalOpen(false)}
                  className="rounded-lg border border-slate-500/30 p-1 text-slate-300 transition hover:border-cyan-300/45 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-3 text-xs uppercase tracking-[0.15em] text-slate-300/80">
                {playersLoading ? "Syncing players..." : `Players loaded: ${players.length}`}
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                <SearchPlayers
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  players={players}
                  currentUserId={profile._id}
                  followingIds={followingIds}
                  onToggleFollow={handleToggleFollow}
                  onStartChat={handleStartChat}
                />

                <div className="space-y-2">
                  {chatLoading ? (
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-300/80">Loading conversation...</p>
                  ) : null}

                  <ChatPanel
                    selectedUser={selectedUser}
                    messages={messages}
                    messageText={messageText}
                    onMessageChange={setMessageText}
                    onSend={handleSendMessage}
                    currentUserId={profile._id}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            onClick={() => setEditModalOpen(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSaveProfile}
              className="w-full max-w-2xl rounded-3xl border border-cyan-300/35 bg-[#0B0F1A]/95 p-5 shadow-[0_0_40px_rgba(34,211,238,0.18)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Profile Settings</p>
                  <h3 className="font-['Rajdhani'] text-3xl font-semibold text-white">Edit Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-slate-500/30 p-1 text-slate-300 transition hover:border-cyan-300/45 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-4 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full border border-cyan-300/50 bg-slate-900">
                  {currentAvatarSrc ? (
                    <img src={currentAvatarSrc} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-cyan-400 text-3xl font-semibold text-white">
                      {initials}
                    </div>
                  )}
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-cyan-100">
                  <Camera size={14} />
                  Upload Avatar
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Username
                  <input
                    required
                    value={editDraft.username}
                    onChange={(event) => setEditDraft((current) => ({ ...current, username: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-500/30 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Game ID
                  <input
                    value={editDraft.gameId}
                    onChange={(event) => setEditDraft((current) => ({ ...current, gameId: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-500/30 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55"
                  />
                </label>

                <label className="text-sm text-slate-300 sm:col-span-2">
                  Bio
                  <textarea
                    rows={3}
                    value={editDraft.bio}
                    onChange={(event) => setEditDraft((current) => ({ ...current, bio: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-500/30 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55"
                  />
                </label>

                <label className="text-sm text-slate-300 sm:col-span-2">
                  Skills (comma separated)
                  <input
                    value={editDraft.skills}
                    onChange={(event) => setEditDraft((current) => ({ ...current, skills: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-500/30 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55"
                  />
                </label>

                <label className="text-sm text-slate-300 sm:col-span-2">
                  Achievements (comma separated)
                  <input
                    value={editDraft.achievements}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, achievements: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-500/30 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  State
                  <input
                    value={editDraft.state}
                    onChange={(event) => setEditDraft((current) => ({ ...current, state: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-500/30 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  City
                  <input
                    value={editDraft.city}
                    onChange={(event) => setEditDraft((current) => ({ ...current, city: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-500/30 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-xl border border-slate-500/30 px-4 py-2 text-sm text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl border border-cyan-300/45 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isAvatarModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setAvatarModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-[#0B0F1A]/95 p-5 shadow-[0_0_35px_rgba(34,211,238,0.2)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="font-['Rajdhani'] text-2xl font-semibold text-white">Player Identity</p>
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="rounded-lg border border-slate-500/30 p-1 text-slate-300 transition hover:border-cyan-300/45 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mx-auto mb-4 h-56 w-56 overflow-hidden rounded-3xl border border-cyan-300/40 bg-slate-900">
                {currentAvatarSrc ? (
                  <img src={currentAvatarSrc} alt={`${profile.username} avatar`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-cyan-400 text-6xl font-semibold text-white">
                    {initials}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-slate-500/30 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-300/80">Username</p>
                  <p className="mt-1 font-medium text-white">{profile.username}</p>
                </div>
                <div className="rounded-2xl border border-slate-500/30 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-300/80">Game ID</p>
                  <p className="mt-1 font-medium text-white">{profile.gameId || profile.uid || "NO-ID"}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProfilePage;
