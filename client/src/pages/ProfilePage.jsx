import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import LoadingSpinner from "../components/LoadingSpinner";
import LiveMatch from "../components/dashboard/LiveMatch";
import MyTournaments from "../components/dashboard/MyTournaments";
import Notifications from "../components/dashboard/Notifications";
import ProfileCard from "../components/dashboard/ProfileCard";
import StatsCard from "../components/dashboard/StatsCard";
import WalletCard from "../components/dashboard/WalletCard";
import { useAuth } from "../contexts/AuthContext";

const resolveRankTier = (wins) => {
  if (wins >= 30) return "Gold";
  if (wins >= 12) return "Silver";
  return "Bronze";
};

const isJoinedByUser = (tournament, userId) => {
  const players = tournament?.joinedPlayers || tournament?.participants || [];
  return players.some((participant) => {
    const id = participant?._id || participant;
    return String(id) === String(userId);
  });
};

const isLiveTournament = (tournament) => {
  if (tournament?.status === "live") return true;

  const startAt = tournament?.startTime || tournament?.dateTime;
  if (!startAt) return false;

  const value = new Date(startAt).getTime();
  if (Number.isNaN(value)) return false;

  return Math.abs(value - Date.now()) <= 1000 * 60 * 30;
};

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [joinedTournaments, setJoinedTournaments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      const [freshProfile, notificationsResponse, tournamentsResponse] = await Promise.all([
        refreshProfile(),
        api.get("/users/me/notifications"),
        api.get("/tournaments")
      ]);

      const activeUser = freshProfile || user;
      const activeUserId = activeUser?._id || user?._id;
      const allTournaments = Array.isArray(tournamentsResponse.data) ? tournamentsResponse.data : [];

      setNotifications(Array.isArray(notificationsResponse.data) ? notificationsResponse.data : []);
      setJoinedTournaments(allTournaments.filter((tournament) => isJoinedByUser(tournament, activeUserId)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load your dashboard");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const rankTier = useMemo(() => resolveRankTier(Number(user?.stats?.wins || 0)), [user?.stats?.wins]);

  const walletSummary = useMemo(() => {
    const unread = notifications.filter((notification) => !notification?.read).length;
    const live = joinedTournaments.filter((tournament) => isLiveTournament(tournament)).length;

    return {
      joined: joinedTournaments.length,
      live,
      unread
    };
  }, [joinedTournaments, notifications]);

  const liveMatch = useMemo(() => {
    const explicitLive = joinedTournaments.find((tournament) => tournament?.status === "live");
    if (explicitLive) return explicitLive;

    return joinedTournaments.find((tournament) => isLiveTournament(tournament)) || null;
  }, [joinedTournaments]);

  const stats = useMemo(() => {
    const matches = Number(user?.stats?.matchesPlayed ?? user?.stats?.matches ?? 0);
    const wins = Number(user?.stats?.wins || 0);
    const kills = Number(user?.stats?.kills || 0);
    const winRate = matches > 0 ? Number(((wins / matches) * 100).toFixed(1)) : 0;

    return { matches, wins, kills, winRate };
  }, [user?.stats]);

  const handleMarkRead = async () => {
    try {
      await api.patch("/users/me/notifications");
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true }))
      );
      toast.success("Notifications marked as read");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to mark notifications");
    }
  };

  const handleEditProfile = () => {
    toast("Profile editor upgrade in progress", { icon: "🎯" });
  };

  const handleAddMoney = () => {
    navigate("/wallet");
  };

  const handleWithdraw = () => {
    navigate("/wallet");
  };

  const handleViewTournament = () => {
    navigate("/tournaments");
  };

  if (profileLoading || !user) {
    return <LoadingSpinner label="Loading player dashboard..." fullscreen />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <ProfileCard user={user} rankTier={rankTier} onEditProfile={handleEditProfile} />
        <WalletCard
          balance={Number(user?.walletBalance || 0)}
          summary={walletSummary}
          onAddMoney={handleAddMoney}
          onWithdraw={handleWithdraw}
        />
      </section>

      <LiveMatch liveMatch={liveMatch} />

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <MyTournaments tournaments={joinedTournaments} onViewDetails={handleViewTournament} />

        <div className="space-y-6">
          <StatsCard
            matches={stats.matches}
            wins={stats.wins}
            kills={stats.kills}
            winRate={stats.winRate}
          />
          <Notifications notifications={notifications} onMarkRead={handleMarkRead} />
        </div>
      </section>
    </motion.div>
  );
};

export default ProfilePage;
