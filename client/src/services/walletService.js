import api from "../api/axiosInstance";

const walletService = {
  getBalance: () => api.get("/wallet/balance"),
  getHistory: (params = {}) => api.get("/wallet/history", { params }),
  createOrder: (payload) => api.post("/wallet/create-order", payload),
  verifyPayment: (payload) => api.post("/wallet/verify-payment", payload),
  withdraw: (payload) => api.post("/wallet/withdraw", payload),
  getAdminTransactions: (params = {}) => api.get("/wallet/admin/transactions", { params }),
  approveWithdraw: (transactionId, note = "") =>
    api.post(`/wallet/admin/withdrawals/${transactionId}/approve`, { note }),
  rejectWithdraw: (transactionId, note = "") =>
    api.post(`/wallet/admin/withdrawals/${transactionId}/reject`, { note })
};

export default walletService;
