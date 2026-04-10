import { useMemo } from "react";
import { motion } from "framer-motion";
import TournamentCard from "./TournamentCard";

const LiveTournaments = ({ tournaments, onJoin }) => {
  const liveTournaments = useMemo(() => {
    const now = Date.now();
    const source = Array.isArray(tournaments) ? tournaments : [];

    const explicit = source.filter((item) => item?.status === "live");
    if (explicit.length) return explicit;

    const nearStart = source.filter((item) => {
      const raw = item?.startTime || item?.dateTime;
      const value = raw ? new Date(raw).getTime() : Number.NaN;
      if (Number.isNaN(value)) return false;
      return Math.abs(value - now) <= 1000 * 60 * 60;
    });

    if (nearStart.length) return nearStart;
    return source.slice(0, 1);
  }, [tournaments]);

  if (!liveTournaments.length) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.26em] text-rose-300">LIVE TOURNAMENTS</p>
          <h2 className="font-['Rajdhani'] text-3xl font-bold text-white sm:text-4xl">Join Ongoing Battles</h2>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {liveTournaments.slice(0, 2).map((tournament) => (
          <TournamentCard
            key={tournament?._id || `${tournament?.title || tournament?.name}-live`}
            tournament={tournament}
            isLive
            onJoin={onJoin}
          />
        ))}
      </div>
    </motion.section>
  );
};

export default LiveTournaments;
