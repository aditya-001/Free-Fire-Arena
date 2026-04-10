import { motion } from "framer-motion";
import { CalendarDays, CircleDot } from "lucide-react";

const statusClassMap = {
  success: "text-emerald-200 border-emerald-300/35 bg-emerald-500/15",
  failed: "text-rose-200 border-rose-300/35 bg-rose-500/15",
  pending: "text-amber-200 border-amber-300/35 bg-amber-500/15"
};

const methodLabelMap = {
  INTERNAL: "Internal",
  UPI: "UPI",
  CARD: "Card",
  NETBANKING: "Netbanking"
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const TransactionHistory = ({ transactions, loading, page, totalPages, onPageChange }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.15 }}
    className="rounded-3xl border border-white/10 bg-black/30 p-5 backdrop-blur-xl"
  >
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Transaction History</p>
        <h3 className="mt-1 text-lg font-semibold text-white">Recent activity</h3>
      </div>
      <span className="text-xs text-slate-400">Page {page}</span>
    </div>

    <div className="space-y-2">
      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-300">
          Loading transactions...
        </div>
      ) : transactions.length ? (
        transactions.map((item) => {
          const statusClass = statusClassMap[item.status] || statusClassMap.pending;
          return (
            <div
              key={item._id}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.type === "credit" ? "Credit" : "Debit"} • ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{methodLabelMap[item.method] || item.method}</p>
                </div>

                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${statusClass}`}>
                  <CircleDot size={12} />
                  {item.status}
                </span>
              </div>

              <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400">
                <CalendarDays size={12} />
                {formatDate(item.createdAt)}
              </p>
            </div>
          );
        })
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-300">
          No transactions yet.
        </div>
      )}
    </div>

    <div className="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </button>
      <button
        type="button"
        className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  </motion.section>
);

export default TransactionHistory;
