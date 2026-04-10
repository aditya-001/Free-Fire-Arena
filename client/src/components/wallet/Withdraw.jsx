import { motion } from "framer-motion";
import { ArrowUpToLine, IndianRupee } from "lucide-react";

const Withdraw = ({ amount, onAmountChange, onSubmit, loading }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.1 }}
    className="rounded-3xl border border-rose-300/25 bg-black/30 p-5 backdrop-blur-xl"
  >
    <p className="text-xs uppercase tracking-[0.25em] text-rose-200">Withdraw</p>
    <h3 className="mt-2 text-lg font-semibold text-white">Request payout</h3>

    <label className="mt-4 block text-xs uppercase tracking-[0.2em] text-slate-300">Amount</label>
    <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-300/30 bg-white/[0.04] px-3 py-2">
      <IndianRupee size={16} className="text-rose-200" />
      <input
        type="number"
        min="100"
        className="w-full bg-transparent text-sm text-white outline-none"
        placeholder="Min 100"
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
      />
    </div>

    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onSubmit}
      disabled={loading}
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/45 bg-rose-500/16 py-2.5 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ArrowUpToLine size={14} />
      {loading ? "Submitting..." : "Request Withdraw"}
    </motion.button>
  </motion.section>
);

export default Withdraw;
