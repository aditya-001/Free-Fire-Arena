import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import TournamentCard from "../components/TournamentCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const HomePage = () => {
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const previewRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [tournamentResponse, leaderboardResponse] = await Promise.all([
          api.get("/tournaments", { params: { upcoming: true, limit: 3 } }),
          api.get("/leaderboard", { params: { scope: "india", limit: 3 } })
        ]);

        setUpcomingTournaments(tournamentResponse.data);
        setLeaderboard(leaderboardResponse.data.results);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading battle lobby..." fullscreen />;
  }

  return (
    <div className="page-content">
      <section className="hero-grid section-spacing">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="section-kicker">Custom Rooms. Fast Joins. Real-Time Action.</p>
          <h2>Host and join Free Fire tournaments with a full-screen competitive vibe.</h2>
          <p className="hero-copy__body">
            Build your profile, register for upcoming rooms, chat with players and climb the live
            leaderboard across India, your state and your city.
          </p>

          <div className="hero-actions">
            <button className="cta-button" onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth" })} type="button">
              Join Now <ArrowRight size={18} />
            </button>
            <button className="text-button text-button--large" onClick={() => navigate("/tournaments")} type="button">
              Explore tournaments
            </button>
          </div>

          <div className="stat-grid">
            <article className="glass-card stat-card">
              <ShieldCheck size={20} />
              <strong>JWT secured login</strong>
              <span>Fast protected access for players and admins.</span>
            </article>
            <article className="glass-card stat-card">
              <Users size={20} />
              <strong>Real-time player chat</strong>
              <span>Private Socket.IO chat built into your profile dashboard.</span>
            </article>
            <article className="glass-card stat-card">
              <Sparkles size={20} />
              <strong>Mobile-first layout</strong>
              <span>Responsive, smooth, full-screen UI with theme switching.</span>
            </article>
          </div>
        </motion.div>

        <motion.div
          className="glass-card hero-banner"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div className="hero-banner__top">
            <span className="pill">Default theme: Dark</span>
            <span className="pill pill--accent">{user ? `Welcome, ${user.username}` : "Open for new players"}</span>
          </div>
          <div>
            <p className="section-kicker">Tonight's highlights</p>
            <h3>Booyah Night Showdown starts with live updates and fast joins.</h3>
          </div>
          <div className="hero-banner__list">
            <div>
              <span>Prize Pool</span>
              <strong>₹15,000+</strong>
            </div>
            <div>
              <span>Leaderboard</span>
              <strong>India / State / City</strong>
            </div>
            <div>
              <span>Player Tools</span>
              <strong>Follow, chat, notify</strong>
            </div>
          </div>
          <button className="text-button text-button--large" onClick={() => navigate("/profile")} type="button">
            Open profile dashboard
          </button>
        </motion.div>
      </section>

      <section className="section-spacing" ref={previewRef}>
        <div className="section-heading">
          <div>
            <p className="section-kicker">Upcoming tournaments</p>
            <h2>Jump into the next room before slots fill up.</h2>
          </div>
          <button className="text-button text-button--large" onClick={() => navigate("/tournaments")} type="button">
            View all
          </button>
        </div>

        <div className="card-grid">
          {upcomingTournaments.map((tournament) => (
            <TournamentCard
              key={tournament._id}
              canJoin={Boolean(user)}
              compact
              joinDisabled={tournament.participants?.some((participant) => participant._id === user?._id)}
              onJoin={() => navigate(user ? "/tournaments" : "/auth")}
              tournament={tournament}
            />
          ))}
        </div>
      </section>

      <section className="section-spacing">
        <div className="section-heading">
          <div>
            <p className="section-kicker">National leaders</p>
            <h2>Quick glance at the current top fraggers.</h2>
          </div>
          <button className="text-button text-button--large" onClick={() => navigate("/leaderboard?scope=india")} type="button">
            Full leaderboard
          </button>
        </div>

        <div className="leader-grid">
          {leaderboard.map((player) => (
            <article key={player._id} className="glass-card leader-card">
              <div className="leader-card__rank">
                <Trophy size={18} />
                <span>#{player.rank}</span>
              </div>
              <h3>{player.playerName}</h3>
              <p>{player.uid}</p>
              <div className="leader-card__meta">
                <span>{player.points} pts</span>
                <span>{player.wins} wins</span>
                <span>{player.city}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
