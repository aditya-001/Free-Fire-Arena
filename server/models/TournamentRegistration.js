const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true
    },
    joinType: {
      type: String,
      enum: ["squad", "solo"],
      required: true,
      lowercase: true,
      trim: true
    },
    teamId: {
      type: String,
      default: null,
      trim: true,
      uppercase: true
    },
    teamName: {
      type: String,
      default: null,
      trim: true
    },
    teamLeaderGameId: {
      type: String,
      default: null,
      trim: true
    },
    players: {
      type: [String],
      default: []
    },
    banner: {
      type: String,
      default: null,
      trim: true
    },
    soloGameId: {
      type: String,
      default: null,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    approvedTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approvalNote: {
      type: String,
      default: null,
      trim: true
    },
    slotNumber: {
      type: Number,
      default: null,
      min: 1
    },
    gatewayOrderId: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentAt: {
      type: Date,
      default: null
    },
    paymentReference: {
      type: String,
      default: null,
      trim: true
    }
  },
  { timestamps: true }
);

registrationSchema.index({ userId: 1, tournamentId: 1, createdAt: -1 });
registrationSchema.index({ tournamentId: 1, status: 1, createdAt: -1 });
registrationSchema.index({ tournamentId: 1, status: 1, approvalStatus: 1, createdAt: -1 });
registrationSchema.index({ teamId: 1, tournamentId: 1 });

module.exports = mongoose.model("TournamentRegistration", registrationSchema);
