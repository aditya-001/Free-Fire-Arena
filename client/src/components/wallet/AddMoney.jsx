import { motion } from "framer-motion";
import { CreditCard, IndianRupee, QrCode } from "lucide-react";

const AddMoney = ({ amount, method, onAmountChange, onMethodChange, onSubmit, loading }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.05 }}
    className="rounded-3xl border border-violet-300/25 bg-black/30 p-5 backdrop-blur-xl"
  >
    <p className="text-xs uppercase tracking-[0.25em] text-violet-200">Add Money</p>
    <h3 className="mt-2 text-lg font-semibold text-white">Top-up with Razorpay</h3>

    <label className="mt-4 block text-xs uppercase tracking-[0.2em] text-slate-300">Amount</label>
    <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-300/30 bg-white/[0.04] px-3 py-2">
      <IndianRupee size={16} className="text-violet-200" />
      <input
        type="number"
        min="10"
        className="w-full bg-transparent text-sm text-white outline-none"
        placeholder="Enter amount"
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
      />
    </div>

    <label className="mt-4 block text-xs uppercase tracking-[0.2em] text-slate-300">Method</label>
    <div className="mt-2 grid grid-cols-3 gap-2">
      {[
        { id: "UPI", icon: QrCode, label: "UPI" },
        { id: "CARD", icon: CreditCard, label: "Card" },
        { id: "NETBANKING", icon: CreditCard, label: "Netbank" }
      ].map((item) => {
        const Icon = item.icon;
        const active = method === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onMethodChange(item.id)}
            className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              active
                ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
                : "border-white/15 bg-white/[0.04] text-slate-300 hover:border-violet-300/40"
            }`}
          >
            <Icon size={13} />
            {item.label}
          </button>
        );
      })}
    </div>

    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onSubmit}
      disabled={loading}
      animate={{ boxShadow: loading ? "none" : ["0 0 0 rgba(6,182,212,0)", "0 0 18px rgba(6,182,212,0.35)", "0 0 0 rgba(6,182,212,0)"] }}
      transition={{ duration: 1.8, repeat: Infinity }}
      className="mt-5 w-full rounded-xl border border-cyan-300/45 bg-cyan-400/18 py-2.5 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Processing..." : "Pay with Razorpay"}
    </motion.button>
  </motion.section>
);

export default AddMoney;
