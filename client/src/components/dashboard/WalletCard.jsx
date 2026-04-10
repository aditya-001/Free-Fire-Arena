import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, WalletCards } from "lucide-react";

const WalletCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const duration = 900;
    const start = performance.now();
    let frame;

    const step = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      setDisplayValue(Math.round(target * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>₹{displayValue.toLocaleString("en-IN")}</span>;
};

const WalletCard = ({ balance, summary, onAddMoney, onWithdraw }) => (
  <motion.section
    initial={{ opacity: 0, y: 22 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, boxShadow: "0 22px 55px rgba(139,92,246,0.24)" }}
    transition={{ duration: 0.35 }}
    className="rounded-2xl border border-violet-300/25 bg-gradient-to-b from-violet-500/10 to-cyan-500/5 p-5 backdrop-blur-xl"
  >
    <div className="flex items-center justify-between">
      <p className="text-xs tracking-[0.22em] text-violet-200">WALLET OVERVIEW</p>
      <WalletCards size={18} className="text-violet-200" />
    </div>

    <p className="mt-3 font-['Rajdhani'] text-4xl font-bold text-cyan-100 drop-shadow-[0_0_14px_rgba(34,211,238,0.45)]">
      <WalletCounter value={balance} />
    </p>

    <div className="mt-4 grid grid-cols-2 gap-3">
      <motion.button
        type="button"
        onClick={onAddMoney}
        whileHover={{ scale: 1.03, boxShadow: "0 0 22px rgba(34,197,94,0.35)" }}
        whileTap={{ scale: 0.98 }}
        animate={{ boxShadow: ["0 0 0px rgba(34,197,94,0)", "0 0 14px rgba(34,197,94,0.26)", "0 0 0px rgba(34,197,94,0)"] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100"
      >
        <ArrowDownCircle size={16} />
        Add Money
      </motion.button>

      <motion.button
        type="button"
        onClick={onWithdraw}
        whileHover={{ scale: 1.03, boxShadow: "0 0 22px rgba(248,113,113,0.35)" }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100"
      >
        <ArrowUpCircle size={16} />
        Withdraw
      </motion.button>
    </div>

    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <p className="text-slate-400">Joined</p>
        <p className="text-sm font-semibold text-white">{summary?.joined || 0}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <p className="text-slate-400">Live</p>
        <p className="text-sm font-semibold text-rose-200">{summary?.live || 0}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <p className="text-slate-400">Alerts</p>
        <p className="text-sm font-semibold text-cyan-200">{summary?.unread || 0}</p>
      </div>
    </div>
  </motion.section>
);

export default WalletCard;
