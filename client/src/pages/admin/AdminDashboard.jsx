import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeIndianRupee, Swords, Trophy, Users } from "lucide-react";
import adminService from "../../services/adminService";
import StatCard from "../../components/admin/StatCard";

const cardAccent = ["#f43f5e", "#a855f7", "#fb7185", "#8b5cf6"];

const rowClass =
  "flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm transition hover:border-rose-400/40 hover:bg-rose-500/10";

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getDashboard();
      setDashboard(data);
    } catch (error) {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const overview = dashboard?.overview || {
    totalUsers: 0,
    totalMatches: 0,
    totalRevenue: 0,
    activeTournaments: 0
  };

  const cards = useMemo(
    () => [
      { title: "Total Users", value: overview.totalUsers, icon: Users },
      { title: "Total Matches", value: overview.totalMatches, icon: Swords },
      {
        title: "Total Revenue",
        value: overview.totalRevenue,
        prefix: "Rs ",
        icon: BadgeIndianRupee
      },
      {
        title: "Active Tournaments",
        value: overview.activeTournaments,
        icon: Trophy
      }
    ],
    [overview]
  );

  const latestJoins = dashboard?.recentActivity?.latestJoins || [];
  const latestTransactions = dashboard?.recentActivity?.latestTransactions || [];
  const safety = dashboard?.safety || {
    suspiciousUsers24h: 0,
    rapidJoinUsers1h: 0,
    highPendingWithdrawals: 0,
    bannedUsers: 0
  };

  return (
    <section className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-fuchsia-400/25 bg-slate-900/55 p-5 backdrop-blur-xl"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200/75">Operations Overview</p>
        <h2 className="mt-2 font-['Rajdhani'] text-4xl font-bold text-white">Tournament Command Dashboard</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65">
          Monitor user growth, match activity, transaction flow, and safety signals from one command hub.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <StatCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={card.value}
            prefix={card.prefix}
            accent={cardAccent[index % cardAccent.length]}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-['Rajdhani'] text-2xl font-semibold text-white">Latest Joins</h3>
            <button
              type="button"
              onClick={fetchDashboard}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/70 transition hover:border-fuchsia-400/50 hover:text-white"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-2">
            {loading ? <p className="text-sm text-white/60">Loading activity...</p> : null}
            {!loading && !latestJoins.length ? <p className="text-sm text-white/60">No join activity found.</p> : null}

            {latestJoins.map((join) => (
              <div key={join._id} className={rowClass}>
                <div>
                  <p className="font-medium text-white">{join.username}</p>
                  <p className="text-xs text-white/60">{join.gameId || join.email}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.14em] text-fuchsia-200/80">
                  {new Date(join.joinedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 backdrop-blur-xl"
        >
          <h3 className="mb-4 font-['Rajdhani'] text-2xl font-semibold text-white">Latest Transactions</h3>
          <div className="space-y-2">
            {loading ? <p className="text-sm text-white/60">Loading transactions...</p> : null}
            {!loading && !latestTransactions.length ? (
              <p className="text-sm text-white/60">No transaction activity found.</p>
            ) : null}

            {latestTransactions.map((transaction) => (
              <div key={transaction._id} className={rowClass}>
                <div>
                  <p className="font-medium text-white">{transaction.user?.username || "Unknown"}</p>
                  <p className="text-xs text-white/60">{transaction.type.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">Rs {Number(transaction.amount || 0).toLocaleString()}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-white/60">{transaction.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="rounded-2xl border border-rose-400/30 bg-rose-500/[0.08] p-5 backdrop-blur-xl"
      >
        <h3 className="font-['Rajdhani'] text-2xl font-semibold text-white">Fraud & Safety Signals</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/70">Suspicious Users (24h)</p>
            <p className="mt-2 font-['Rajdhani'] text-3xl font-bold text-rose-300">{safety.suspiciousUsers24h}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/70">Rapid Join Users (1h)</p>
            <p className="mt-2 font-['Rajdhani'] text-3xl font-bold text-fuchsia-300">{safety.rapidJoinUsers1h}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/70">High Pending Withdrawals</p>
            <p className="mt-2 font-['Rajdhani'] text-3xl font-bold text-rose-300">{safety.highPendingWithdrawals}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/70">Banned Users</p>
            <p className="mt-2 font-['Rajdhani'] text-3xl font-bold text-fuchsia-300">{safety.bannedUsers}</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default AdminDashboard;
