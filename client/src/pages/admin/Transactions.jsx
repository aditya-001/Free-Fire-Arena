import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { CheckCircle2, Search, ShieldAlert, XCircle } from "lucide-react";
import adminService from "../../services/adminService";
import AdminModal from "../../components/admin/AdminModal";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20";

const Transactions = () => {
  const [data, setData] = useState({ results: [], page: 1, totalPages: 1, total: 0 });
  const [query, setQuery] = useState({
    page: 1,
    limit: 12,
    status: "",
    type: "",
    onlySuspicious: false
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionModal, setDecisionModal] = useState({
    open: false,
    transaction: null,
    approve: true,
    note: ""
  });

  const fetchTransactions = async (nextQuery = query) => {
    setLoading(true);
    try {
      const { data: response } = await adminService.getTransactions(nextQuery);
      setData(response);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [query.page, query.status, query.type, query.onlySuspicious]);

  const openDecisionModal = (transaction, approve) => {
    setDecisionModal({
      open: true,
      transaction,
      approve,
      note: ""
    });
  };

  const submitDecision = async () => {
    if (!decisionModal.transaction) return;

    setSaving(true);
    try {
      await adminService.approveWithdraw({
        transactionId: decisionModal.transaction._id,
        approve: decisionModal.approve,
        note: decisionModal.note
      });

      toast.success(decisionModal.approve ? "Withdrawal approved" : "Withdrawal rejected");
      setDecisionModal({ open: false, transaction: null, approve: true, note: "" });
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update withdrawal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-white/65">Wallet & Transaction Control</p>
        <h2 className="font-['Rajdhani'] text-3xl font-bold text-white">Monitor Payments and Withdrawals</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            value={query.status}
            onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, status: event.target.value }))}
            className={inputClass}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={query.type}
            onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, type: event.target.value }))}
            className={inputClass}
          >
            <option value="">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>

          <label className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={query.onlySuspicious}
              onChange={(event) =>
                setQuery((prev) => ({
                  ...prev,
                  page: 1,
                  onlySuspicious: event.target.checked
                }))
              }
            />
            Suspicious only
          </label>

          <button
            type="button"
            onClick={() => fetchTransactions()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition hover:border-fuchsia-400/40"
          >
            <Search size={14} />
            Refresh
          </button>
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
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Suspicion</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-white/65" colSpan={7}>
                    Loading transactions...
                  </td>
                </tr>
              ) : null}

              {!loading && !data.results.length ? (
                <tr>
                  <td className="px-4 py-6 text-white/65" colSpan={7}>
                    No transactions found.
                  </td>
                </tr>
              ) : null}

              {data.results.map((transaction) => {
                const isPendingWithdraw =
                  transaction.status === "pending" &&
                  transaction.type === "debit" &&
                  transaction.notes?.flow === "withdraw_request";

                return (
                  <tr key={transaction._id} className="border-t border-white/8 transition hover:bg-fuchsia-500/[0.09]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{transaction.userId?.username || "Unknown"}</p>
                      <p className="text-xs text-white/65">{transaction.userId?.gameId || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-white/80">Rs {Number(transaction.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-white/75 uppercase">{transaction.type}</td>
                    <td className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-fuchsia-200">
                      {transaction.status}
                    </td>
                    <td className="px-4 py-3">
                      {transaction.suspicion?.flagged ? (
                        <div className="flex flex-wrap gap-1">
                          {transaction.suspicion.reasons.map((reason) => (
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
                    <td className="px-4 py-3 text-white/75">{new Date(transaction.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {isPendingWithdraw ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openDecisionModal(transaction, true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/15"
                          >
                            <CheckCircle2 size={12} />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openDecisionModal(transaction, false)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/15"
                          >
                            <XCircle size={12} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-white/50">No actions</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="flex items-center justify-between text-sm text-white/70">
        <p>
          Page {data.page} of {data.totalPages} ({data.total} transactions)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setQuery((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setQuery((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <AdminModal
        isOpen={decisionModal.open}
        title={decisionModal.approve ? "Approve Withdrawal" : "Reject Withdrawal"}
        onClose={() => setDecisionModal({ open: false, transaction: null, approve: true, note: "" })}
      >
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/75">
          <p>
            Transaction: <span className="text-white">{decisionModal.transaction?._id}</span>
          </p>
          <p>
            Amount: <span className="text-white">Rs {Number(decisionModal.transaction?.amount || 0).toLocaleString()}</span>
          </p>
        </div>

        <label className="text-sm text-white/75">
          Admin Note
          <textarea
            value={decisionModal.note}
            onChange={(event) => setDecisionModal((prev) => ({ ...prev, note: event.target.value }))}
            rows={3}
            className={`${inputClass} mt-2`}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDecisionModal({ open: false, transaction: null, approve: true, note: "" })}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitDecision}
            disabled={saving}
            className={`rounded-xl border px-4 py-2 text-sm disabled:opacity-50 ${
              decisionModal.approve
                ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                : "border-rose-400/60 bg-rose-500/20 text-rose-100"
            }`}
          >
            {saving ? "Saving..." : decisionModal.approve ? "Approve" : "Reject"}
          </button>
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-100/80">
          <ShieldAlert size={14} />
          Decisions are logged for audit and moderation review.
        </div>
      </AdminModal>
    </section>
  );
};

export default Transactions;
