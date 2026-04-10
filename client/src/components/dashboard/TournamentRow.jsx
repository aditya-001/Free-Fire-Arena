import { motion } from "framer-motion";
import { CalendarClock, Coins, Trophy } from "lucide-react";
import { formatDateTime } from "../../utils/formatters";

const statusStyleMap = {
  live: "border-rose-400/60 bg-rose-500/15 text-rose-300",
  upcoming: "border-cyan-300/50 bg-cyan-500/10 text-cyan-300",
  completed: "border-emerald-300/45 bg-emerald-500/10 text-emerald-300"
};

const resolveStatus = (tournament) => {
  if (tournament?.status) return tournament.status;
  const target = tournament?.startTime || tournament?.dateTime;
  if (!target) return "upcoming";
  const startTime = new Date(target).getTime();
  if (Number.isNaN(startTime)) return "upcoming";
  return startTime > Date.now() ? "upcoming" : "completed";
};

const TournamentRow = ({ tournament, onViewDetails }) => {
  const status = resolveStatus(tournament);
  const style = statusStyleMap[status] || statusStyleMap.upcoming;

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01, boxShadow: "0 16px 45px rgba(14,165,233,0.14)" }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-white/10 bg-black/20 p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="font-['Rajdhani'] text-2xl font-bold text-white">{tournament?.title || tournament?.name || "Tournament"}</h4>
        <span className={`rounded-full border px-3 py-1 text-[0.65rem] font-bold tracking-[0.2em] uppercase ${style}`}>
          {status}
        </span>
      </div>

      <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <p className="inline-flex items-center gap-2"><Coins size={15} className="text-cyan-300" /> Entry ₹{Number(tournament?.entryFee || 0).toLocaleString("en-IN")}</p>
        <p className="inline-flex items-center gap-2"><Trophy size={15} className="text-violet-300" /> Prize ₹{Number(tournament?.prizePool || 0).toLocaleString("en-IN")}</p>
        <p className="inline-flex items-center gap-2 sm:col-span-2"><CalendarClock size={15} className="text-slate-300" /> {formatDateTime(tournament?.startTime || tournament?.dateTime || new Date())}</p>
      </div>

      <motion.button
        type="button"
        onClick={() => onViewDetails?.(tournament)}
        whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(139,92,246,0.34)" }}
        whileTap={{ scale: 0.98 }}
        className="mt-4 rounded-lg border border-violet-300/45 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100"
      >
        View Details
      </motion.button>
    </motion.article>
  );
};

export default TournamentRow;
