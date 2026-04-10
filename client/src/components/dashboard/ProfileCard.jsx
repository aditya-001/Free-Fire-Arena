import { motion } from "framer-motion";
import { PencilLine, ShieldCheck } from "lucide-react";
import { resolveAsset } from "../../api/axiosInstance";

const tierStyleMap = {
  Bronze: "border-amber-700/60 bg-amber-500/10 text-amber-300",
  Silver: "border-slate-300/60 bg-slate-400/10 text-slate-200",
  Gold: "border-yellow-300/70 bg-yellow-400/10 text-yellow-200"
};

const ProfileCard = ({ user, rankTier, onEditProfile }) => {
  const badgeStyle = tierStyleMap[rankTier] || tierStyleMap.Bronze;

  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 22px 55px rgba(34,211,238,0.15)" }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.profileImage ? (
            <img
              alt={user?.username || "Player"}
              className="h-16 w-16 rounded-2xl border border-cyan-300/35 object-cover"
              src={resolveAsset(user.profileImage)}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-400/10 font-['Rajdhani'] text-3xl font-bold text-cyan-200">
              {(user?.username || "P").slice(0, 1)}
            </div>
          )}

          <div>
            <p className="text-xs tracking-[0.22em] text-slate-400">PLAYER PROFILE</p>
            <h2 className="font-['Rajdhani'] text-4xl font-bold leading-none text-white">{user?.username}</h2>
            <p className="mt-1 text-sm text-slate-300">{user?.gameId || user?.uid || "FF-ID pending"}</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] ${badgeStyle}`}>
          <ShieldCheck size={14} />
          {rankTier}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-2">
          <p className="text-xs tracking-[0.2em] text-cyan-200">WALLET</p>
          <p className="font-['Rajdhani'] text-2xl font-bold text-white">₹{Number(user?.walletBalance || 0).toLocaleString("en-IN")}</p>
        </div>

        <motion.button
          type="button"
          onClick={onEditProfile}
          whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(139,92,246,0.45)" }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-300/50 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100"
        >
          <PencilLine size={15} />
          Edit Profile
        </motion.button>
      </div>
    </motion.section>
  );
};

export default ProfileCard;
