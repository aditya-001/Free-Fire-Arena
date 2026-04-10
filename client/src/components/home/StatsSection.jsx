import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const AnimatedValue = ({ value, prefix = "", suffix = "" }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1100;
    const target = Number(value || 0);
    const startTime = performance.now();
    let animationFrame;

    const animate = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      setDisplay(Math.round(target * progress));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <span>{prefix}{display.toLocaleString("en-IN")}{suffix}</span>;
};

const StatsSection = ({ stats }) => {
  const items = [
    { label: "Total Players", value: stats?.totalPlayers || 0 },
    { label: "Total Matches", value: stats?.totalMatches || 0 },
    { label: "Prize Distributed", value: stats?.totalPrize || 0, prefix: "₹" }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6"
    >
      <p className="text-xs font-semibold tracking-[0.26em] text-violet-300">PLATFORM STATS</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <motion.article
            key={item.label}
            whileHover={{ y: -4, boxShadow: "0 0 26px rgba(139,92,246,0.34)" }}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <h3 className="text-sm text-slate-300">{item.label}</h3>
            <p className="mt-2 font-['Rajdhani'] text-3xl font-bold text-white">
              <AnimatedValue value={item.value} prefix={item.prefix} suffix={item.suffix} />
            </p>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
};

export default StatsSection;
