import { AnimatePresence, motion } from "framer-motion";

const AdminModal = ({
  isOpen,
  title,
  children,
  onClose,
  maxWidthClass = "max-w-xl"
}) => (
  <AnimatePresence>
    {isOpen ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className={`w-full ${maxWidthClass} rounded-2xl border border-fuchsia-400/35 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(217,70,239,0.18)] backdrop-blur-2xl`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-['Rajdhani'] text-2xl font-bold tracking-wide text-white">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white/70 transition hover:border-rose-400/50 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="space-y-4">{children}</div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default AdminModal;
