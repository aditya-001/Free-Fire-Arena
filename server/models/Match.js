const mongoose = require("mongoose");
const { TOURNAMENT_MODES, MATCH_STATUS } = require("../config/constants");

const resultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    kills: { type: Number, default: 0, min: 0 },
    booyah: { type: Boolean, default: false },
    rank: { type: Number, required: true, min: 1 }
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
    startTime: { type: Date, required: true },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: []
    },
    results: {
      type: [resultSchema],
      default: []
    }
  },
  { timestamps: true }
);

matchSchema.index({ tournamentId: 1, matchNumber: 1 }, { unique: true });
matchSchema.index({ startTime: -1 });
matchSchema.index({ status: 1 });
matchSchema.index({ status: 1, startTime: -1 });
matchSchema.index({ mode: 1, status: 1, startTime: -1 });
matchSchema.index({ "results.user": 1 });
matchSchema.index({ "results.teamId": 1 });

module.exports = mongoose.model("Match", matchSchema);
