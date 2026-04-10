import { CalendarDays, IndianRupee, Ticket, TimerReset, Users } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const toTimestamp = (value) => {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const formatCountdown = (remainingMs) => {
  const safeMs = Math.max(0, Number(remainingMs || 0));
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h`;
  }

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const getRegistrationState = (tournament, nowMs) => {
  const startMs = toTimestamp(tournament.registrationStartTime);
  const endMs = toTimestamp(
    tournament.registrationEndTime || tournament.startTime || tournament.dateTime
  );

  const closed = endMs !== null && nowMs > endMs;
  const notStarted = !closed && startMs !== null && nowMs < startMs;
  const countdownTarget = notStarted ? startMs : endMs;

  return {
    closed,
    notStarted,
    countdownLabel: notStarted ? "Opens in" : "Closes in",
    countdownValue:
      countdownTarget !== null && !closed ? formatCountdown(countdownTarget - nowMs) : null
  };
};

const TournamentCard = ({
  tournament,
  onJoin,
  onViewDetails,
  canJoin,
  joinDisabled,
  compact = false,
  nowMs
}) => {
  const playersJoined =
    tournament.joinedPlayers?.length || tournament.participants?.length || tournament.filledSlots || 0;
  const registrationState = getRegistrationState(tournament, Number(nowMs) || Date.now());

  const disableJoin = Boolean(joinDisabled || registrationState.closed || registrationState.notStarted);

  let buttonLabel = "Login to Join";
  if (joinDisabled) {
    buttonLabel = "Joined";
  } else if (registrationState.closed) {
    buttonLabel = "Registration Closed";
  } else if (registrationState.notStarted) {
    buttonLabel = "Registration Not Started";
  } else if (canJoin) {
    buttonLabel = "Join Tournament";
  }

  return (
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
          <h3>{tournament.title || tournament.name}</h3>
        </div>

        <div className="tournament-card__badge-row">
          {registrationState.closed ? <span className="pill pill--danger">Registration Closed</span> : null}
          {!registrationState.closed ? (
            <span className={`pill ${registrationState.notStarted ? "pill--warning" : "pill--success"}`}>
              {registrationState.notStarted ? "Registration Soon" : "Registration Open"}
            </span>
          ) : null}
          <span className="pill">{playersJoined} joined</span>
        </div>
      </div>

      {!registrationState.closed && registrationState.countdownValue ? (
        <div className="tournament-card__countdown">
          <TimerReset size={16} />
          <span>
            {registrationState.countdownLabel}: {registrationState.countdownValue}
          </span>
        </div>
      ) : null}

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
          <span>{formatDateTime(tournament.startTime || tournament.dateTime)}</span>
        </div>
        <div>
          <Users size={16} />
          <span>{playersJoined} players</span>
        </div>
      </div>

      <div className="tournament-card__actions">
        <button className="text-button" onClick={() => onViewDetails?.(tournament)} type="button">
          View Details
        </button>
        <button className="cta-button" disabled={disableJoin} onClick={() => onJoin?.(tournament)} type="button">
          {buttonLabel}
        </button>
      </div>
    </motion.article>
  );
};

export default TournamentCard;
