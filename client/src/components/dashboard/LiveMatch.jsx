import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock3, KeyRound, RadioTower, ShieldCheck } from "lucide-react";
import { formatDateTime } from "../../utils/formatters";

const getTimeLeft = (target) => {
  if (!target) return null;
  const value = new Date(target).getTime();
  if (Number.isNaN(value)) return null;

  const distance = value - Date.now();
  if (distance <= 0) {
    return { finished: true, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    finished: false,
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60)
  };
};

const LiveMatch = ({ liveMatch }) => {
  const startAt = liveMatch?.startTime || liveMatch?.dateTime;
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(startAt));

  useEffect(() => {
    if (!startAt) return undefined;

    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(startAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [startAt]);

  const revealCredentials = useMemo(() => {
    if (!startAt) return true;
    const value = new Date(startAt).getTime();
    if (Number.isNaN(value)) return true;
    return Date.now() <= value;
  }, [startAt]);

  if (!liveMatch) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-violet-300/25 bg-violet-500/10 p-5 backdrop-blur-xl"
      >
        <p className="text-xs tracking-[0.22em] text-violet-200">LIVE MATCH</p>
        <h3 className="mt-1 font-['Rajdhani'] text-3xl font-bold text-white">No Match Live Right Now</h3>
        <p className="mt-2 text-sm text-slate-300">Your next room credentials will appear here before match start.</p>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-rose-300/40 bg-gradient-to-r from-rose-500/15 via-violet-500/10 to-cyan-500/10 p-5 shadow-[0_0_40px_rgba(251,113,133,0.16)] backdrop-blur-xl"
    >
      <motion.div
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-400/20 blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0.72, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />

      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex animate-pulse items-center gap-2 rounded-full border border-rose-300/65 bg-rose-500/20 px-3 py-1 text-[0.65rem] font-bold tracking-[0.2em] text-rose-200">
            <RadioTower size={13} /> LIVE
          </span>
          <span className="text-xs text-slate-200">{formatDateTime(startAt || new Date())}</span>
        </div>

        <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">{liveMatch?.title || liveMatch?.name || "Live Match"}</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/15 bg-black/25 p-3">
            <p className="text-xs text-slate-400">Room ID</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <ShieldCheck size={14} />
              {revealCredentials ? liveMatch?.roomId || "Will unlock soon" : "Locked"}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/25 p-3">
            <p className="text-xs text-slate-400">Password</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <KeyRound size={14} />
              {revealCredentials ? liveMatch?.roomPassword || "Will unlock soon" : "Locked"}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/25 p-3">
            <p className="text-xs text-slate-400">Countdown</p>
            <p className="mt-1 inline-flex items-center gap-2 font-['Rajdhani'] text-xl font-bold text-white">
              <Clock3 size={15} className="text-rose-200" />
              {timeLeft && !timeLeft.finished
                ? `${String(timeLeft.hours).padStart(2, "0")}:${String(timeLeft.minutes).padStart(2, "0")}:${String(timeLeft.seconds).padStart(2, "0")}`
                : "00:00:00"}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default LiveMatch;
