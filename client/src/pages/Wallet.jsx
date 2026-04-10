import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import AddMoney from "../components/wallet/AddMoney";
import TransactionHistory from "../components/wallet/TransactionHistory";
import WalletCard from "../components/wallet/WalletCard";
import Withdraw from "../components/wallet/Withdraw";
import { useAuth } from "../contexts/AuthContext";
import walletService from "../services/walletService";

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load payment gateway"));
    document.body.appendChild(script);
  });

const WalletPage = () => {
  const { user, setUser } = useAuth();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [addAmount, setAddAmount] = useState("");
  const [addMethod, setAddMethod] = useState("UPI");
  const [addMoneyLoading, setAddMoneyLoading] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [adminLoading, setAdminLoading] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);

  const [successType, setSuccessType] = useState("");

  const isAdmin = user?.role === "admin";

  const updateBalanceInState = (nextBalance) => {
    const numericBalance = Number(nextBalance || 0);
    setBalance(numericBalance);
    setUser((current) => {
      if (!current) return current;
      return {
        ...current,
        walletBalance: numericBalance
      };
    });
  };

  const loadWallet = async ({ page = historyPage, initial = false } = {}) => {
    if (initial) {
      setLoading(true);
    } else {
      setHistoryLoading(true);
    }

    try {
      const [balanceResponse, historyResponse] = await Promise.all([
        walletService.getBalance(),
        walletService.getHistory({ page, limit: 20 })
      ]);

      updateBalanceInState(balanceResponse.data?.walletBalance || 0);
      setTransactions(Array.isArray(historyResponse.data?.results) ? historyResponse.data.results : []);
      setHistoryTotalPages(Number(historyResponse.data?.totalPages || 1));
      setHistoryPage(Number(historyResponse.data?.page || page));

      if (isAdmin) {
        const adminResponse = await walletService.getAdminTransactions({
          page: 1,
          limit: 20,
          status: "pending",
          type: "debit"
        });

        const rows = Array.isArray(adminResponse.data?.results) ? adminResponse.data.results : [];
        setPendingWithdrawals(rows.filter((row) => row?.notes?.flow === "withdraw_request"));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load wallet data");
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadWallet({ page: 1, initial: true });
  }, []);

  const triggerSuccess = (type) => {
    setSuccessType(type);
    window.setTimeout(() => setSuccessType(""), 1400);
  };

  const handleAddMoney = async () => {
    const numericAmount = Number(addAmount);

    if (!Number.isFinite(numericAmount) || numericAmount < 10) {
      toast.error("Minimum add money amount is ₹10");
      return;
    }

    setAddMoneyLoading(true);

    try {
      const { data: orderData } = await walletService.createOrder({
        amount: numericAmount,
        method: addMethod
      });

      await loadRazorpayScript();

      const paymentPayload = await new Promise((resolve, reject) => {
        const instance = new window.Razorpay({
          key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: Math.round(Number(orderData.amount || 0) * 100),
          currency: orderData.currency || "INR",
          name: "Free Fire Arena",
          description: "Wallet Top-up",
          order_id: orderData.orderId,
          handler: (response) => {
            resolve(response);
          },
          prefill: {
            name: user?.username || "Player",
            email: user?.email || "",
            contact: user?.phone || ""
          },
          theme: {
            color: "#06b6d4"
          }
        });

        instance.on("payment.failed", (response) => {
          reject(new Error(response?.error?.description || "Payment failed"));
        });

        instance.open();
      });

      const { data } = await walletService.verifyPayment({
        orderId: paymentPayload.razorpay_order_id,
        paymentId: paymentPayload.razorpay_payment_id,
        signature: paymentPayload.razorpay_signature,
        amount: numericAmount,
        method: addMethod
      });

      updateBalanceInState(data.walletBalance);
      setAddAmount("");
      triggerSuccess("add");
      toast.success(data.duplicate ? "Payment already verified" : "Wallet credited successfully");
      await loadWallet({ page: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Payment failed");
    } finally {
      setAddMoneyLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const numericAmount = Number(withdrawAmount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid withdraw amount");
      return;
    }

    setWithdrawLoading(true);

    try {
      const { data } = await walletService.withdraw({ amount: numericAmount });
      updateBalanceInState(data.walletBalance);
      setWithdrawAmount("");
      triggerSuccess("withdraw");
      toast.success("Withdrawal request submitted for admin approval");
      await loadWallet({ page: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleAdminAction = async (transactionId, action) => {
    setAdminLoading(true);

    try {
      if (action === "approve") {
        await walletService.approveWithdraw(transactionId, "Approved from wallet admin panel");
        toast.success("Withdrawal approved");
      } else {
        await walletService.rejectWithdraw(transactionId, "Rejected from wallet admin panel");
        toast.success("Withdrawal rejected and refunded");
      }

      await loadWallet({ page: historyPage });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to process admin action");
    } finally {
      setAdminLoading(false);
    }
  };

  const pendingSummary = useMemo(() => pendingWithdrawals.length, [pendingWithdrawals]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/30 px-5 py-10 text-center text-sm text-slate-200">
        Loading wallet...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Payments</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Wallet & Transactions</h2>
        </div>

        {isAdmin && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-violet-300/35 bg-violet-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-100">
            <ShieldCheck size={14} />
            Pending approvals: {pendingSummary}
          </div>
        )}
      </div>

      <AnimatePresence>
        {successType && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="fixed right-6 top-24 z-50 inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
          >
            <CheckCircle2 size={16} />
            {successType === "add" ? "Wallet credited" : "Withdraw request created"}
          </motion.div>
        )}
      </AnimatePresence>

      <WalletCard balance={balance} />

      <section className="grid gap-5 lg:grid-cols-2">
        <AddMoney
          amount={addAmount}
          method={addMethod}
          onAmountChange={setAddAmount}
          onMethodChange={setAddMethod}
          onSubmit={handleAddMoney}
          loading={addMoneyLoading}
        />
        <Withdraw
          amount={withdrawAmount}
          onAmountChange={setWithdrawAmount}
          onSubmit={handleWithdraw}
          loading={withdrawLoading}
        />
      </section>

      <TransactionHistory
        transactions={transactions}
        loading={historyLoading}
        page={historyPage}
        totalPages={historyTotalPages}
        onPageChange={(nextPage) => loadWallet({ page: nextPage })}
      />

      {isAdmin && (
        <section className="rounded-3xl border border-amber-300/25 bg-black/30 p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <TriangleAlert size={16} className="text-amber-200" />
            <p className="text-xs uppercase tracking-[0.25em] text-amber-200">Admin Withdraw Control</p>
          </div>

          <div className="space-y-2">
            {pendingWithdrawals.length ? (
              pendingWithdrawals.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      ₹{Number(item.amount || 0).toLocaleString("en-IN")} • {item.userId?.username || "User"}
                    </p>
                    <p className="text-xs text-slate-400">{item.userId?.gameId || "-"}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={adminLoading}
                      onClick={() => handleAdminAction(item._id, "approve")}
                      className="rounded-lg border border-emerald-300/45 bg-emerald-500/16 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={adminLoading}
                      onClick={() => handleAdminAction(item._id, "reject")}
                      className="rounded-lg border border-rose-300/45 bg-rose-500/16 px-3 py-1.5 text-xs font-semibold text-rose-100 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                No pending withdrawal requests.
              </div>
            )}
          </div>
        </section>
      )}
    </motion.div>
  );
};

export default WalletPage;
