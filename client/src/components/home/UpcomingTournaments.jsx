import { useMemo } from "react";
import { motion } from "framer-motion";
import TournamentCard from "./TournamentCard";

const UpcomingTournaments = ({ tournaments, onJoin }) => {
  const upcoming = useMemo(() => {
    const now = Date.now();
    return (Array.isArray(tournaments) ? tournaments : [])
      .filter((item) => {
        if (item?.status === "live") return false;
        if (item?.status === "completed") return false;
        const raw = item?.startTime || item?.dateTime;
        const value = raw ? new Date(raw).getTime() : Number.NaN;
        if (Number.isNaN(value)) return true;
        return value >= now;
      })
      .sort((first, second) => {
        const one = new Date(first?.startTime || first?.dateTime || 0).getTime();
        const two = new Date(second?.startTime || second?.dateTime || 0).getTime();
        return one - two;
      });
  }, [tournaments]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.26em] text-cyan-300">UPCOMING</p>
        <h2 className="font-['Rajdhani'] text-3xl font-bold text-white sm:text-4xl">Reserve Your Next Match</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {upcoming.slice(0, 6).map((tournament) => (
          <TournamentCard
            key={tournament?._id || `${tournament?.title || tournament?.name}-upcoming`}
            tournament={tournament}
            onJoin={onJoin}
          />
        ))}
      </div>
    </motion.section>
  );
};

export default UpcomingTournaments;
