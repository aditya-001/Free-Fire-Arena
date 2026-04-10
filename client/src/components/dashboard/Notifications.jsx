import { motion } from "framer-motion";
import { BellRing } from "lucide-react";
import { formatRelativeTime } from "../../utils/formatters";

const Notifications = ({ notifications, onMarkRead }) => {
  const sorted = [...(notifications || [])].sort(
    (first, second) => new Date(second?.createdAt || 0).getTime() - new Date(first?.createdAt || 0).getTime()
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.22em] text-violet-300">NOTIFICATIONS</p>
          <h3 className="mt-1 font-['Rajdhani'] text-3xl font-bold text-white">Alerts</h3>
        </div>

        <button
          type="button"
          onClick={onMarkRead}
          className="rounded-lg border border-violet-300/45 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100"
        >
          Mark Read
        </button>
      </div>

      <div className="space-y-2">
        {sorted.length ? (
          sorted.slice(0, 6).map((item) => (
            <article
              key={item?._id || `${item?.title}-${item?.createdAt}`}
              className={`rounded-xl border p-3 text-sm ${item?.read ? "border-white/10 bg-black/20 text-slate-300" : "border-cyan-300/35 bg-cyan-500/10 text-cyan-100"}`}
            >
              <p className="font-semibold">{item?.title}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">{item?.body}</p>
              <p className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] opacity-70">{formatRelativeTime(item?.createdAt)}</p>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-4 text-sm text-slate-300">
            <p className="inline-flex items-center gap-2"><BellRing size={15} /> No alerts yet</p>
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default Notifications;
