import { motion } from "framer-motion";
import { ArrowRight, RadioTower } from "lucide-react";
import heroBackground from "../../assets/free-fire-bg.jpg";

const HeroSection = ({ liveTournament, onJoinNow, onJoinLive }) => {
  const liveTitle = liveTournament?.title || liveTournament?.name || "Booyah Night Showdown";
  const prizePool = Number(liveTournament?.prizePool || 15000).toLocaleString("en-IN");
  const entryFee = Number(liveTournament?.entryFee || 49).toLocaleString("en-IN");

  return (
    <section className="relative isolate min-h-[72vh] overflow-hidden rounded-[2rem] border border-white/15 bg-[#0B0F1A] p-6 sm:p-8 lg:p-12">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1.02 }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.26),transparent_30%),radial-gradient(circle_at_80%_5%,rgba(168,85,247,0.26),transparent_32%),linear-gradient(160deg,rgba(11,15,26,0.82),rgba(11,15,26,0.95))]" />

      <motion.div
        className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-cyan-400/30 blur-[70px]"
        animate={{ x: [0, 24, -8, 0], y: [0, -18, 14, 0], opacity: [0.55, 0.82, 0.65, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-8 top-16 h-40 w-40 rounded-full bg-violet-500/30 blur-[70px]"
        animate={{ x: [0, -26, 12, 0], y: [0, 16, -10, 0], opacity: [0.52, 0.8, 0.6, 0.52] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-2 right-1/3 h-24 w-24 rounded-full bg-rose-500/25 blur-[52px]"
        animate={{ scale: [1, 1.24, 0.94, 1], opacity: [0.4, 0.68, 0.5, 0.4] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 grid h-full items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-1 text-[0.72rem] font-semibold tracking-[0.24em] text-cyan-300">
            <RadioTower size={12} /> LIVE ESPORTS ROOM
          </p>
          <h1 className="font-['Rajdhani'] text-4xl font-bold leading-[0.92] text-white sm:text-5xl lg:text-7xl">
            Join Free Fire Tournaments
          </h1>
          <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
            Fast joins, glowing lobbies and premium rooms crafted for serious players.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <motion.button
              type="button"
              onClick={onJoinNow}
              whileHover={{ scale: 1.03, boxShadow: "0 0 34px rgba(34,211,238,0.4)" }}
              whileTap={{ scale: 0.98 }}
              animate={{ boxShadow: ["0 0 0px rgba(34,211,238,0.0)", "0 0 22px rgba(34,211,238,0.35)", "0 0 0px rgba(34,211,238,0.0)"] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/60 bg-gradient-to-r from-cyan-400/25 via-violet-500/20 to-cyan-400/25 px-6 py-3 text-sm font-semibold text-cyan-100 backdrop-blur-sm"
            >
              Join Now
              <ArrowRight size={16} />
            </motion.button>
            <button
              type="button"
              onClick={onJoinLive}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm text-slate-100 backdrop-blur-md transition hover:border-violet-300/60 hover:text-violet-200"
            >
              Watch Live Rooms
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12 }}
          className="rounded-2xl border border-rose-400/30 bg-black/35 p-5 shadow-[0_0_45px_rgba(251,113,133,0.2)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex animate-pulse items-center gap-2 rounded-full border border-rose-400/55 bg-rose-500/20 px-3 py-1 text-[0.65rem] font-bold tracking-[0.2em] text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> LIVE
            </span>
            <span className="text-xs text-slate-300">Entry ₹{entryFee}</span>
          </div>

          <h3 className="font-['Rajdhani'] text-2xl font-bold text-white">{liveTitle}</h3>
          <p className="mt-2 text-sm text-slate-300">Prize Pool ₹{prizePool}</p>

          <motion.button
            type="button"
            onClick={onJoinLive}
            whileHover={{ scale: 1.02, boxShadow: "0 0 24px rgba(244,63,94,0.45)" }}
            whileTap={{ scale: 0.98 }}
            className="mt-5 w-full rounded-xl border border-rose-300/45 bg-gradient-to-r from-rose-500/35 to-violet-500/25 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Join Match
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
