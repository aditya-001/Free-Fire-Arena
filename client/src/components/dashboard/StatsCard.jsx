import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const Counter = ({ value, suffix = "" }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const duration = 850;
    const start = performance.now();
    let frame;

    const step = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      setDisplay(target * progress);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span>
      {Number.isInteger(value) ? Math.round(display).toLocaleString("en-IN") : display.toFixed(1)}
      {suffix}
    </span>
  );
};

const StatTile = ({ label, value, suffix }) => (
  <motion.article
    whileHover={{ y: -4, boxShadow: "0 0 22px rgba(34,211,238,0.24)" }}
    className="rounded-xl border border-white/10 bg-black/20 p-3"
  >
    <p className="text-xs text-slate-400">{label}</p>
    <p className="mt-1 font-['Rajdhani'] text-3xl font-bold text-white">
      <Counter value={value} suffix={suffix} />
    </p>
  </motion.article>
);

const StatsCard = ({ matches, wins, kills, winRate }) => (
  <motion.section
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.25 }}
    transition={{ duration: 0.4 }}
    className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl"
  >
    <p className="text-xs tracking-[0.22em] text-cyan-300">STATS</p>
    <h3 className="mt-1 font-['Rajdhani'] text-3xl font-bold text-white">Performance</h3>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <StatTile label="Matches Played" value={matches} />
      <StatTile label="Wins" value={wins} />
      <StatTile label="Total Kills" value={kills} />
      <StatTile label="Win Rate" value={winRate} suffix="%" />
    </div>
  </motion.section>
);

export default StatsCard;
