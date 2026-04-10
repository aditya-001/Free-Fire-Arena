import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Coins, Trophy, Users } from "lucide-react";

const formatCurrency = (value) => Number(value || 0).toLocaleString("en-IN");

const getTimeLeft = (targetValue) => {
  if (!targetValue) return null;
  const end = new Date(targetValue).getTime();
  if (Number.isNaN(end)) return null;

  const distance = end - Date.now();
  if (distance <= 0) {
    return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    ended: false,
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60)
  };
};

const TournamentCard = ({ tournament, isLive = false, onJoin }) => {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(tournament?.startTime || tournament?.dateTime));

  const startsAt = tournament?.startTime || tournament?.dateTime;
  const joinedCount = tournament?.joinedPlayers?.length || tournament?.participants?.length || 0;
  const maxPlayers = Number(tournament?.maxPlayers || 50);
  const slotsRemaining = Math.max(maxPlayers - joinedCount, 0);

  const status = useMemo(() => {
    if (isLive || tournament?.status === "live") return "LIVE";
    if (tournament?.status === "completed") return "COMPLETED";
    return "UPCOMING";
  }, [isLive, tournament?.status]);

  useEffect(() => {
    const target = tournament?.startTime || tournament?.dateTime;
    if (!target) return undefined;

    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);

    return () => clearInterval(timer);
  }, [tournament?.startTime, tournament?.dateTime]);

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.03, boxShadow: "0 20px 55px rgba(124,58,237,0.22)" }}
      transition={{ type: "spring", stiffness: 230, damping: 18 }}
      className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-['Rajdhani'] text-2xl font-bold text-white">{tournament?.title || tournament?.name || "Tournament"}</h3>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-[0.18em] ${
            status === "LIVE"
              ? "animate-pulse border border-rose-400/65 bg-rose-500/20 text-rose-300 shadow-[0_0_20px_rgba(251,113,133,0.45)]"
              : "border border-cyan-300/45 bg-cyan-500/10 text-cyan-300"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
        <p className="inline-flex items-center gap-2"><Coins size={16} className="text-cyan-300" /> Entry ₹{formatCurrency(tournament?.entryFee)}</p>
        <p className="inline-flex items-center gap-2"><Trophy size={16} className="text-violet-300" /> Prize ₹{formatCurrency(tournament?.prizePool)}</p>
        <p className="inline-flex items-center gap-2"><Users size={16} className="text-slate-300" /> Slots {joinedCount}/{maxPlayers}</p>
        <p className="inline-flex items-center gap-2"><CalendarClock size={16} className="text-slate-300" /> {startsAt ? new Date(startsAt).toLocaleString() : "Schedule soon"}</p>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
        {status === "LIVE" ? (
          <span className="font-semibold text-rose-300">Room is live now. Jump in.</span>
        ) : timeLeft && !timeLeft.ended ? (
          <span>
            Starts in <strong className="text-cyan-200">{String(timeLeft.days).padStart(2, "0")}d : {String(timeLeft.hours).padStart(2, "0")}h : {String(timeLeft.minutes).padStart(2, "0")}m : {String(timeLeft.seconds).padStart(2, "0")}s</strong>
          </span>
        ) : (
          <span className="font-semibold text-slate-100">Starting soon</span>
        )}
      </div>

      <motion.button
        type="button"
        onClick={() => onJoin?.(tournament)}
        whileHover={{ boxShadow: "0 0 28px rgba(34,211,238,0.42)" }}
        whileTap={{ scale: 0.98 }}
        className="mt-5 w-full rounded-xl border border-cyan-300/55 bg-gradient-to-r from-cyan-500/25 to-violet-500/30 px-4 py-2.5 text-sm font-semibold text-cyan-100"
      >
        Join Match
      </motion.button>
    </motion.article>
  );
};

export default TournamentCard;
