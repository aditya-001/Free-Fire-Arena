import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, WalletCards } from "lucide-react";

const BalanceCounter = ({ balance }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(balance || 0);
    const start = performance.now();
    const duration = 900;
    let frame = 0;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(target * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [balance]);

  return <span>₹{display.toLocaleString("en-IN")}</span>;
};

const WalletCard = ({ balance }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="relative overflow-hidden rounded-3xl border border-cyan-300/35 bg-gradient-to-br from-cyan-500/12 via-violet-500/10 to-fuchsia-500/12 p-6 shadow-[0_20px_60px_rgba(34,211,238,0.2)] backdrop-blur-xl"
  >
    <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-400/25 blur-3xl" />
    <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-violet-500/25 blur-3xl" />

    <div className="relative z-10 flex items-center justify-between">
      <p className="text-xs uppercase tracking-[0.26em] text-cyan-200">Wallet Balance</p>
      <WalletCards size={18} className="text-cyan-200" />
    </div>

    <motion.div
      className="relative z-10 mt-3 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100"
      animate={{ boxShadow: ["0 0 0 rgba(34,211,238,0)", "0 0 22px rgba(34,211,238,0.3)", "0 0 0 rgba(34,211,238,0)"] }}
      transition={{ duration: 2.2, repeat: Infinity }}
    >
      <Sparkles size={12} />
      Live Wallet
    </motion.div>

    <p className="relative z-10 mt-4 font-['Rajdhani'] text-5xl font-bold text-white drop-shadow-[0_0_16px_rgba(34,211,238,0.45)]">
      <BalanceCounter balance={balance} />
    </p>
  </motion.section>
);

export default WalletCard;
