import { motion } from "framer-motion";
import { Crown } from "lucide-react";

const podiumTheme = [
  {
    label: "GOLD",
    border: "border-yellow-300/50",
    glow: "shadow-[0_0_34px_rgba(250,204,21,0.35)]",
    tone: "text-yellow-200"
  },
  {
    label: "SILVER",
    border: "border-slate-300/45",
    glow: "shadow-[0_0_34px_rgba(148,163,184,0.35)]",
    tone: "text-slate-200"
  },
  {
    label: "BRONZE",
    border: "border-amber-700/55",
    glow: "shadow-[0_0_34px_rgba(180,83,9,0.35)]",
    tone: "text-amber-300"
  }
];

const TopPlayers = ({ players }) => {
  const topThree = (Array.isArray(players) ? players : []).slice(0, 3);

  if (!topThree.length) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45 }}
      className="space-y-5"
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.26em] text-cyan-300">TOP PLAYERS</p>
        <h2 className="font-['Rajdhani'] text-3xl font-bold text-white sm:text-4xl">Hall of Champions</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {topThree.map((player, index) => {
          const theme = podiumTheme[index] || podiumTheme[2];
          const identifier = player?.gameId || player?.uid || "FF-PLAYER";
          const wins = Number(player?.wins ?? 0);
          const kills = Number(player?.kills ?? player?.points ?? 0);

          return (
            <motion.article
              key={player?._id || `${player?.playerName || "player"}-${index}`}
              whileHover={{ y: -6, scale: 1.03 }}
              className={`rounded-2xl border bg-white/[0.03] p-5 backdrop-blur-xl ${theme.border} ${theme.glow}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={`text-xs font-bold tracking-[0.2em] ${theme.tone}`}>{theme.label}</span>
                <Crown size={16} className={theme.tone} />
              </div>

              <h3 className="font-['Rajdhani'] text-2xl font-bold text-white">{player?.playerName || player?.username || "Player"}</h3>
              <p className="mt-1 text-xs text-slate-300">{identifier}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                  <p className="text-slate-400">Wins</p>
                  <p className="font-semibold text-white">{wins}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                  <p className="text-slate-400">Kills</p>
                  <p className="font-semibold text-white">{kills}</p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
};

export default TopPlayers;
