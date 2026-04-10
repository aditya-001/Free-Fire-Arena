import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import LoadingSpinner from "../components/LoadingSpinner";
import HeroSection from "../components/home/HeroSection";
import LiveTournaments from "../components/home/LiveTournaments";
import UpcomingTournaments from "../components/home/UpcomingTournaments";
import StatsSection from "../components/home/StatsSection";
import TopPlayers from "../components/home/TopPlayers";
import { useAuth } from "../contexts/AuthContext";

const HomePage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [tournamentResponse, leaderboardResponse] = await Promise.all([
          api.get("/tournaments", { params: { limit: 12 } }),
          api.get("/leaderboard", { params: { scope: "india", limit: 10 } })
        ]);

        setTournaments(Array.isArray(tournamentResponse.data) ? tournamentResponse.data : []);
        setLeaderboard(Array.isArray(leaderboardResponse.data?.results) ? leaderboardResponse.data.results : []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load homepage right now");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const parseDateValue = (entry) => {
    const raw = entry?.startTime || entry?.dateTime;
    const value = raw ? new Date(raw).getTime() : Number.NaN;
    return Number.isNaN(value) ? null : value;
  };

  const featuredLive = useMemo(() => {
    const now = Date.now();
    const explicitLive = tournaments.find((item) => item?.status === "live");
    if (explicitLive) return explicitLive;

    const nearStart = tournaments.find((item) => {
      const value = parseDateValue(item);
      if (!value) return false;
      return Math.abs(value - now) <= 1000 * 60 * 60;
    });

    return nearStart || tournaments[0] || null;
  }, [tournaments]);

  const stats = useMemo(() => {
    const uniquePlayers = new Set();

    tournaments.forEach((tournament) => {
      const list = tournament?.joinedPlayers || tournament?.participants || [];
      list.forEach((player) => {
        if (player?._id) {
          uniquePlayers.add(player._id);
        } else if (player) {
          uniquePlayers.add(String(player));
        }
      });
    });

    const totalMatches =
      leaderboard.reduce((sum, player) => sum + Number(player?.matches ?? player?.matchesPlayed ?? 0), 0) ||
      tournaments.length * 12;

    const totalPrize = tournaments.reduce((sum, tournament) => sum + Number(tournament?.prizePool || 0), 0);

    return {
      totalPlayers: Math.max(uniquePlayers.size, leaderboard.length),
      totalMatches,
      totalPrize
    };
  }, [leaderboard, tournaments]);

  const handleJoinNow = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleJoinTournament = () => {
    navigate(user ? "/tournaments" : "/auth/login");
  };

  if (loading) {
    return <LoadingSpinner label="Loading battle lobby..." fullscreen />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="space-y-10"
    >
      <HeroSection
        liveTournament={featuredLive}
        onJoinNow={handleJoinNow}
        onJoinLive={handleJoinTournament}
      />

      <div ref={sectionRef} className="space-y-10">
        <LiveTournaments tournaments={tournaments} onJoin={handleJoinTournament} />
        <UpcomingTournaments tournaments={tournaments} onJoin={handleJoinTournament} />
      </div>

      <StatsSection stats={stats} />
      <TopPlayers players={leaderboard} />
    </motion.div>
  );
};

export default HomePage;
