import { motion } from "framer-motion";
import CountUpValue from "./CountUpValue";

const StatCard = ({ icon: Icon, title, value, prefix = "", suffix = "", accent = "#f43f5e" }) => (
  <motion.article
    whileHover={{ y: -4, boxShadow: `0 0 24px ${accent}66` }}
    className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
    style={{
      backgroundImage: `linear-gradient(135deg, ${accent}22, rgba(15, 23, 42, 0.35))`
    }}
  >
    <div className="mb-4 flex items-center justify-between">
      <div className="rounded-xl border border-white/20 p-2" style={{ color: accent }}>
        <Icon size={20} />
      </div>
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
    </div>

    <p className="text-xs uppercase tracking-[0.18em] text-white/65">{title}</p>
    <p className="mt-2 font-['Rajdhani'] text-4xl font-bold text-white">
      <CountUpValue value={value} prefix={prefix} suffix={suffix} />
    </p>
  </motion.article>
);

export default StatCard;
