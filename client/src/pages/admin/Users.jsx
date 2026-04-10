import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Ban, Search, ShieldCheck } from "lucide-react";
import adminService from "../../services/adminService";
import AdminModal from "../../components/admin/AdminModal";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20";

const Users = () => {
  const [usersData, setUsersData] = useState({ results: [], page: 1, totalPages: 1, total: 0 });
  const [query, setQuery] = useState({ page: 1, limit: 12, search: "", banned: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [banModal, setBanModal] = useState({
    open: false,
    user: null,
    ban: true,
    reason: ""
  });

  const fetchUsers = async (nextQuery = query) => {
    setLoading(true);
    try {
      const { data } = await adminService.getUsers(nextQuery);
      setUsersData(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [query.page, query.banned]);

  const openBanModal = (user, ban) => {
    setBanModal({
      open: true,
      user,
      ban,
      reason: ban ? "Suspicious activity" : ""
    });
  };

  const submitBanDecision = async () => {
    if (!banModal.user) return;

    setSaving(true);
    try {
      await adminService.banUser({
        userId: banModal.user._id,
        ban: banModal.ban,
        reason: banModal.reason
      });
      toast.success(banModal.ban ? "User banned" : "User unbanned");
      setBanModal({ open: false, user: null, ban: true, reason: "" });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user moderation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-white/65">User Management</p>
        <h2 className="font-['Rajdhani'] text-3xl font-bold text-white">Search, Review and Moderate Users</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-white/45" size={16} />
            <input
              value={query.search}
              onChange={(event) => setQuery((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search by username, email, UID"
              className={`${inputClass} pl-9`}
            />
          </label>

          <div className="flex gap-2">
            <select
              value={query.banned}
              onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, banned: event.target.value }))}
              className={inputClass}
            >
              <option value="">All users</option>
              <option value="false">Active only</option>
              <option value="true">Banned only</option>
            </select>

            <button
              type="button"
              onClick={() => setQuery((prev) => ({ ...prev, page: 1 }))}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-fuchsia-400/40"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 backdrop-blur-xl"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.15em] text-white/60">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Stats</th>
                <th className="px-4 py-3">Suspicion</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-white/65">
                    Loading users...
                  </td>
                </tr>
              ) : null}

              {!loading && !usersData.results.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-white/65">
                    No users found.
                  </td>
                </tr>
              ) : null}

              {usersData.results.map((user) => (
                <tr key={user._id} className="border-t border-white/8 transition hover:bg-fuchsia-500/[0.09]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{user.username}</p>
                    <p className="text-xs text-white/65">{user.gameId || user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-white/75">Rs {Number(user.walletBalance || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-white/75">
                    K {user.stats?.totalKills || 0} | B {user.stats?.totalBooyah || 0} | M {user.stats?.matchesPlayed || 0}
                  </td>
                  <td className="px-4 py-3">
                    {user.suspicion?.flagged ? (
                      <div className="flex flex-wrap gap-1">
                        {user.suspicion.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full border border-rose-400/50 bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-200"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-300">Clean</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-[0.12em]">
                    {user.isBanned ? <span className="text-rose-200">Banned</span> : <span className="text-emerald-300">Active</span>}
                  </td>
                  <td className="px-4 py-3">
                    {user.isBanned ? (
                      <button
                        type="button"
                        onClick={() => openBanModal(user, false)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/15"
                      >
                        <ShieldCheck size={12} />
                        Unban
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openBanModal(user, true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/15"
                      >
                        <Ban size={12} />
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="flex items-center justify-between text-sm text-white/70">
        <p>
          Page {usersData.page} of {usersData.totalPages} ({usersData.total} users)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={usersData.page <= 1}
            onClick={() => setQuery((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={usersData.page >= usersData.totalPages}
            onClick={() => setQuery((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <AdminModal isOpen={banModal.open} title={banModal.ban ? "Ban User" : "Unban User"} onClose={() => setBanModal({ open: false, user: null, ban: true, reason: "" })}>
        <p className="text-sm text-white/75">
          {banModal.ban
            ? "This user will be blocked from protected APIs and login."
            : "This user will regain full platform access."}
        </p>

        <textarea
          value={banModal.reason}
          onChange={(event) => setBanModal((prev) => ({ ...prev, reason: event.target.value }))}
          placeholder="Reason"
          rows={3}
          className={inputClass}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBanModal({ open: false, user: null, ban: true, reason: "" })}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitBanDecision}
            disabled={saving}
            className={`rounded-xl border px-4 py-2 text-sm disabled:opacity-50 ${
              banModal.ban
                ? "border-rose-400/60 bg-rose-500/20 text-rose-100"
                : "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
            }`}
          >
            {saving ? "Saving..." : banModal.ban ? "Confirm Ban" : "Confirm Unban"}
          </button>
        </div>
      </AdminModal>
    </section>
  );
};

export default Users;
