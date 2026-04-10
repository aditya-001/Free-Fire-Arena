const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true
    },
    method: {
      type: String,
      enum: ["UPI", "CARD", "INTERNAL", "NETBANKING"],
      required: true,
      default: "INTERNAL"
    },
    referenceId: {
      type: String,
      default: null
    },
    gatewayOrderId: {
      type: String,
      default: null,
      index: true
    },
    notes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

transactionSchema.index({ referenceId: 1 }, { unique: true, sparse: true });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
