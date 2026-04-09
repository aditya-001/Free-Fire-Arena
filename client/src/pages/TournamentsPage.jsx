import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import TournamentCard from "../components/TournamentCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

const defaultForm = {
  name: "",
  entryFee: "",
  prizePool: "",
  dateTime: ""
};

const TournamentsPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchTournaments = async () => {
    try {
      const { data } = await api.get("/tournaments");
      setTournaments(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const handleTournamentUpdate = () => {
      fetchTournaments();
      toast.success("Tournament feed updated live");
    };

    socket.on("tournament_update", handleTournamentUpdate);

    return () => {
      socket.off("tournament_update", handleTournamentUpdate);
    };
  }, [socket]);

  const handleJoinTournament = async (tournamentId) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      await api.post(`/tournaments/${tournamentId}/join`);
      toast.success("Tournament joined successfully");
      fetchTournaments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to join tournament");
    }
  };

  const handleCreateTournament = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await api.post("/tournaments", formData);
      toast.success("Tournament created");
      setFormData(defaultForm);
      fetchTournaments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create tournament");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading tournaments..." fullscreen />;
  }

  return (
    <div className="page-content">
      <section className="section-heading section-spacing">
        <div>
          <p className="section-kicker">Tournament lobby</p>
          <h2>Browse open custom rooms, prize pools and scheduled drops.</h2>
        </div>
        {user?.role === "admin" && (
          <div className="pill pill--accent">
            <PlusCircle size={16} />
            Admin create access enabled
          </div>
        )}
      </section>

      <section className="tournament-layout">
        <div className="card-grid">
          {tournaments.map((tournament) => {
            const joined = tournament.participants?.some(
              (participant) => participant._id === user?._id || participant === user?._id
            );

            return (
              <TournamentCard
                key={tournament._id}
                canJoin={Boolean(user)}
                joinDisabled={joined}
                onJoin={handleJoinTournament}
                tournament={tournament}
              />
            );
          })}
        </div>

        {user?.role === "admin" && (
          <motion.form
            className="glass-card form-panel"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            onSubmit={handleCreateTournament}
          >
            <div className="panel-section__header">
              <div>
                <p className="section-kicker">Admin</p>
                <h3>Create tournament</h3>
              </div>
            </div>

            <div className="field-group">
              <label>Tournament name</label>
              <input
                required
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div className="field-grid">
              <div className="field-group">
                <label>Entry fee</label>
                <input
                  min="0"
                  required
                  type="number"
                  value={formData.entryFee}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, entryFee: event.target.value }))
                  }
                />
              </div>
              <div className="field-group">
                <label>Prize pool</label>
                <input
                  min="0"
                  required
                  type="number"
                  value={formData.prizePool}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, prizePool: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="field-group">
              <label>Date and time</label>
              <input
                required
                type="datetime-local"
                value={formData.dateTime}
                onChange={(event) => setFormData((current) => ({ ...current, dateTime: event.target.value }))}
              />
            </div>

            <button className="cta-button" disabled={submitting} type="submit">
              {submitting ? "Creating..." : "Create Tournament"}
            </button>
          </motion.form>
        )}
      </section>
    </div>
  );
};

export default TournamentsPage;
