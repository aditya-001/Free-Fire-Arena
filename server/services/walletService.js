const crypto = require("crypto");
const Razorpay = require("razorpay");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");

const RAZORPAY_CURRENCY = process.env.RAZORPAY_CURRENCY || "INR";
const MIN_WITHDRAW_AMOUNT = Number(process.env.WALLET_MIN_WITHDRAW_AMOUNT || 100);
const FRAUD_AMOUNT_THRESHOLD = Number(process.env.FRAUD_AMOUNT_THRESHOLD || 25000);

let razorpayClient = null;

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new AppError("Razorpay credentials are not configured", 500);
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }

  return razorpayClient;
};

const normalizeAmount = (amount) => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError("Amount must be greater than 0", 400);
  }

  return Number(parsed.toFixed(2));
};

const toPaisa = (amount) => Math.round(normalizeAmount(amount) * 100);

const createLockRef = (prefix) => {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const createTransaction = (payload) => Transaction.create(payload);

const acquireWalletLock = async (userId, minBalance, reason) => {
  const lockRef = createLockRef("lock");

  const lockedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      walletBalance: { $gte: minBalance },
      "walletLock.isLocked": { $ne: true }
    },
    {
      $set: {
        "walletLock.isLocked": true,
        "walletLock.lockRef": lockRef,
        "walletLock.reason": reason,
        "walletLock.lockedAt": new Date()
      }
    },
    {
      new: true,
      select: "_id walletBalance walletLock"
    }
  );

  if (lockedUser) {
    return { lockRef, user: lockedUser };
  }

  const currentUser = await User.findById(userId).select("walletBalance walletLock");
  if (!currentUser) {
    throw new AppError("User not found", 404);
  }

  if (currentUser.walletLock?.isLocked) {
    throw new AppError("Wallet is busy with another request. Please try again.", 409);
  }

  throw new AppError("Insufficient wallet balance", 400);
};

const releaseWalletLock = async (userId, lockRef) => {
  if (!lockRef) return;

  await User.updateOne(
    {
      _id: userId,
      "walletLock.lockRef": lockRef
    },
    {
      $set: {
        "walletLock.isLocked": false,
        "walletLock.lockRef": null,
        "walletLock.reason": null,
        "walletLock.lockedAt": null
      }
    }
  );
};

const debitWhileLocked = async ({ userId, amount, lockRef }) => {
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      walletBalance: { $gte: amount },
      "walletLock.isLocked": true,
      "walletLock.lockRef": lockRef
    },
    {
      $inc: { walletBalance: -amount },
      $set: {
        "walletLock.isLocked": false,
        "walletLock.lockRef": null,
        "walletLock.reason": null,
        "walletLock.lockedAt": null
      }
    },
    {
      new: true,
      select: "_id walletBalance"
    }
  );

  if (!updatedUser) {
    throw new AppError("Unable to debit wallet", 409);
  }

  return updatedUser;
};

const creditWallet = async (userId, amount) => {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true, select: "_id walletBalance" }
  );

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  return updatedUser;
};

const creditWalletOnce = async ({ userId, amount, referenceId }) => {
  if (!referenceId) {
    const user = await creditWallet(userId, amount);
    return { user, credited: true };
  }

  const creditedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      walletCreditRefs: { $ne: referenceId }
    },
    {
      $inc: { walletBalance: amount },
      $push: {
        walletCreditRefs: {
          $each: [referenceId],
          $slice: -250
        }
      }
    },
    {
      new: true,
      select: "_id walletBalance"
    }
  );

  if (creditedUser) {
    return { user: creditedUser, credited: true };
  }

  const user = await User.findById(userId).select("_id walletBalance");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return { user, credited: false };
};

const createWalletOrder = async (userId, payload) => {
  const amount = normalizeAmount(payload.amount);
  const method = payload.method || "UPI";
  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: toPaisa(amount),
    currency: RAZORPAY_CURRENCY,
    receipt: `wallet_${String(userId)}_${Date.now()}`,
    notes: {
      userId: String(userId),
      flow: "wallet_add"
    }
  });

  await createTransaction({
    userId,
    type: "credit",
    amount,
    status: "pending",
    method,
    gatewayOrderId: order.id,
    notes: {
      flow: "wallet_add",
      provider: "razorpay"
    }
  });

  return {
    orderId: order.id,
    amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID
  };
};

const verifyWalletPayment = async (userId, payload) => {
  const requestedAmount = normalizeAmount(payload.amount);
  const method = payload.method || "UPI";

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${payload.orderId}|${payload.paymentId}`)
    .digest("hex");

  if (generatedSignature !== payload.signature) {
    await Transaction.findOneAndUpdate(
      { userId, gatewayOrderId: payload.orderId, status: "pending" },
      {
        $set: {
          status: "failed",
          referenceId: payload.paymentId,
          notes: {
            flow: "wallet_add",
            reason: "invalid_signature"
          }
        }
      }
    );

    throw new AppError("Invalid payment signature", 400);
  }

  const pendingTransaction = await Transaction.findOneAndUpdate(
    {
      userId,
      gatewayOrderId: payload.orderId,
      status: "pending"
    },
    {
      $set: {
        status: "success",
        method,
        referenceId: payload.paymentId,
        notes: {
          flow: "wallet_add",
          provider: "razorpay",
          signatureVerified: true
        }
      }
    },
    { new: true }
  );

  let transaction = pendingTransaction;

  if (!transaction) {
    transaction = await Transaction.findOne({
      userId,
      $or: [{ referenceId: payload.paymentId }, { gatewayOrderId: payload.orderId }],
      status: "success"
    });
  }

  if (!transaction) {
    try {
      transaction = await createTransaction({
        userId,
        type: "credit",
        amount: requestedAmount,
        status: "success",
        method,
        referenceId: payload.paymentId,
        gatewayOrderId: payload.orderId,
        notes: {
          flow: "wallet_add",
          provider: "razorpay",
          reconstructed: true
        }
      });
    } catch (error) {
      if (error?.code === 11000) {
        transaction = await Transaction.findOne({
          userId,
          referenceId: payload.paymentId,
          status: "success"
        });

        if (!transaction) {
          transaction = await Transaction.findOne({
            userId,
            gatewayOrderId: payload.orderId,
            status: "success"
          });
        }
      } else {
        throw error;
      }
    }
  }

  const amountToCredit = Number(transaction?.amount || requestedAmount);
  const { user: creditedUser, credited } = await creditWalletOnce({
    userId,
    amount: amountToCredit,
    referenceId: payload.paymentId
  });

  return {
    walletBalance: Number(creditedUser.walletBalance || 0),
    transactionId: transaction?._id || null,
    duplicate: !credited
  };
};

const withdrawFromWallet = async (userId, payload) => {
  const amount = normalizeAmount(payload.amount);

  if (amount < MIN_WITHDRAW_AMOUNT) {
    throw new AppError(`Minimum withdraw amount is ${MIN_WITHDRAW_AMOUNT}`, 400);
  }

  const { lockRef } = await acquireWalletLock(userId, amount, "withdraw_request");

  try {
    const updatedUser = await debitWhileLocked({ userId, amount, lockRef });

    const transaction = await createTransaction({
      userId,
      type: "debit",
      amount,
      status: "pending",
      method: "INTERNAL",
      referenceId: createLockRef("wd"),
      notes: {
        flow: "withdraw_request"
      }
    });

    return {
      walletBalance: Number(updatedUser.walletBalance || 0),
      transaction
    };
  } catch (error) {
    await releaseWalletLock(userId, lockRef);
    throw error;
  }
};

const getWalletHistory = async (userId, query = {}) => {
  const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
  const limitRaw = Number.parseInt(query.limit, 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("type amount status method referenceId createdAt")
      .lean(),
    Transaction.countDocuments({ userId })
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    results: transactions
  };
};

const getWalletBalance = async (userId) => {
  const user = await User.findById(userId).select("walletBalance");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    walletBalance: Number(user.walletBalance || 0)
  };
};

const debitTournamentEntryFee = async ({ userId, tournament }) => {
  const entryFee = normalizeAmount(tournament.entryFee || 0);

  if (entryFee <= 0) {
    const user = await User.findById(userId).select("walletBalance");
    return {
      walletBalance: Number(user?.walletBalance || 0),
      transaction: null,
      charged: 0
    };
  }

  const { lockRef } = await acquireWalletLock(userId, entryFee, `join_tournament:${tournament._id}`);

  try {
    const updatedUser = await debitWhileLocked({ userId, amount: entryFee, lockRef });

    const transaction = await createTransaction({
      userId,
      type: "debit",
      amount: entryFee,
      status: "success",
      method: "INTERNAL",
      referenceId: createLockRef("join"),
      notes: {
        flow: "tournament_join",
        tournamentId: String(tournament._id),
        title: tournament.title || tournament.name || "Tournament"
      }
    });

    return {
      walletBalance: Number(updatedUser.walletBalance || 0),
      transaction,
      charged: entryFee
    };
  } catch (error) {
    await releaseWalletLock(userId, lockRef);
    throw error;
  }
};

const refundTournamentEntryFee = async ({ userId, amount, tournamentId, reason }) => {
  const refundAmount = normalizeAmount(amount || 0);
  if (refundAmount <= 0) return null;

  const updatedUser = await creditWallet(userId, refundAmount);

  const transaction = await createTransaction({
    userId,
    type: "credit",
    amount: refundAmount,
    status: "success",
    method: "INTERNAL",
    referenceId: createLockRef("refund"),
    notes: {
      flow: "tournament_refund",
      tournamentId: String(tournamentId),
      reason: reason || "Join rollback"
    }
  });

  return {
    walletBalance: Number(updatedUser.walletBalance || 0),
    transaction
  };
};

const getAdminTransactions = async (query = {}) => {
  const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
  const limitRaw = Number.parseInt(query.limit, 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 25;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.userId) filter.userId = query.userId;

  const [transactions, total, failedByUser] = await Promise.all([
    Transaction.find(filter)
      .populate("userId", "username gameId email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      {
        $match: {
          status: "failed",
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: "$userId",
          failedCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const failMap = new Map(failedByUser.map((entry) => [String(entry._id), entry.failedCount]));

  const enriched = transactions.map((transaction) => {
    const userId = String(transaction.userId?._id || transaction.userId || "");
    const flags = [];

    if (Number(transaction.amount || 0) >= FRAUD_AMOUNT_THRESHOLD) {
      flags.push("HIGH_AMOUNT");
    }

    if ((failMap.get(userId) || 0) >= 3) {
      flags.push("MULTIPLE_FAILED_24H");
    }

    return {
      ...transaction,
      suspicion: {
        flagged: flags.length > 0,
        reasons: flags
      }
    };
  });

  const filtered = query.onlySuspicious ? enriched.filter((item) => item.suspicion.flagged) : enriched;

  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    results: filtered
  };
};

const approveWithdraw = async ({ transactionId, adminUserId, note }) => {
  const transaction = await Transaction.findOneAndUpdate(
    {
      _id: transactionId,
      type: "debit",
      status: "pending",
      "notes.flow": "withdraw_request"
    },
    {
      $set: {
        status: "success",
        notes: {
          flow: "withdraw_request",
          approvedBy: String(adminUserId),
          approvedAt: new Date().toISOString(),
          note: note || ""
        }
      }
    },
    { new: true }
  );

  if (!transaction) {
    throw new AppError("Pending withdrawal transaction not found", 404);
  }

  return transaction;
};

const rejectWithdraw = async ({ transactionId, adminUserId, note }) => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    type: "debit",
    status: "pending",
    "notes.flow": "withdraw_request"
  });

  if (!transaction) {
    throw new AppError("Pending withdrawal transaction not found", 404);
  }

  await creditWallet(transaction.userId, Number(transaction.amount || 0));

  transaction.status = "failed";
  transaction.notes = {
    flow: "withdraw_request",
    rejectedBy: String(adminUserId),
    rejectedAt: new Date().toISOString(),
    note: note || ""
  };
  await transaction.save();

  await createTransaction({
    userId: transaction.userId,
    type: "credit",
    amount: Number(transaction.amount || 0),
    status: "success",
    method: "INTERNAL",
    referenceId: createLockRef("wd-revert"),
    notes: {
      flow: "withdraw_refund",
      linkedTransactionId: String(transaction._id)
    }
  });

  return transaction;
};

module.exports = {
  createWalletOrder,
  verifyWalletPayment,
  withdrawFromWallet,
  getWalletHistory,
  getWalletBalance,
  debitTournamentEntryFee,
  refundTournamentEntryFee,
  getAdminTransactions,
  approveWithdraw,
  rejectWithdraw
};
