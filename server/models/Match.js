const mongoose = require("mongoose");
const { TOURNAMENT_MODES, MATCH_STATUS } = require("../config/constants");

const playerResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kills: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    totalKills: { type: Number, default: 0, min: 0 },
    booyah: { type: Boolean, default: false },
    rank: { type: Number, required: true, min: 1 },
    players: {
      type: [playerResultSchema],
      default: []
    },

    // Legacy fields retained for compatibility with old match payloads.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    kills: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true
    },
    matchNumber: { type: Number, required: true, min: 1 },
    mode: {
      type: String,
      enum: TOURNAMENT_MODES,
      required: true,
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: MATCH_STATUS,
      default: "live"
    },
    roomId: {
      type: String,
      trim: true,
      default: null
    },
    roomPassword: {
      type: String,
      trim: true,
      default: null
    },
    startTime: { type: Date, required: true },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: []
    },
    selectedTeams: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
      default: []
    },
    qualifiedTeams: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
      default: []
    },
    results: {
      type: [resultSchema],
      default: []
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    lockedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

matchSchema.index({ tournamentId: 1, matchNumber: 1 }, { unique: true });
matchSchema.index({ startTime: -1 });
matchSchema.index({ status: 1 });
matchSchema.index({ status: 1, startTime: -1 });
matchSchema.index({ mode: 1, status: 1, startTime: -1 });
matchSchema.index({ selectedTeams: 1 });
matchSchema.index({ qualifiedTeams: 1 });
matchSchema.index({ "results.user": 1 });
matchSchema.index({ "results.teamId": 1 });
matchSchema.index({ "results.players.userId": 1 });

module.exports = mongoose.model("Match", matchSchema);
