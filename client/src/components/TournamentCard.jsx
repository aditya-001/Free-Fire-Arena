import { CalendarDays, IndianRupee, Ticket, Users } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const TournamentCard = ({ tournament, onJoin, canJoin, joinDisabled, compact = false }) => (
  <motion.article
    className={`glass-card tournament-card ${compact ? "tournament-card--compact" : ""}`}
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.25 }}
    transition={{ duration: 0.35 }}
  >
    <div className="tournament-card__header">
      <div>
        <p className="section-kicker">Upcoming match</p>
        <h3>{tournament.name}</h3>
      </div>
      <span className="pill">{tournament.participants?.length || 0} joined</span>
    </div>

    <div className="tournament-card__stats">
      <div>
        <Ticket size={16} />
        <span>Entry {formatCurrency(tournament.entryFee)}</span>
      </div>
      <div>
        <IndianRupee size={16} />
        <span>Prize {formatCurrency(tournament.prizePool)}</span>
      </div>
      <div>
        <CalendarDays size={16} />
        <span>{formatDateTime(tournament.dateTime)}</span>
      </div>
      <div>
        <Users size={16} />
        <span>{tournament.participants?.length || 0} players</span>
      </div>
    </div>

    <button
      className="cta-button"
      disabled={joinDisabled}
      onClick={() => onJoin?.(tournament._id)}
      type="button"
    >
      {joinDisabled ? "Joined" : canJoin ? "Join Match" : "Login to Join"}
    </button>
  </motion.article>
);

export default TournamentCard;
