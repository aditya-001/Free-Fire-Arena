const mongoose = require("mongoose");

const modeStatsSchema = new mongoose.Schema(
  {
    kills: { type: Number, default: 0, min: 0 },
    booyah: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    matchesPlayed: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: { type: String, required: true, unique: true, trim: true, minlength: 2 },
    players: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: []
    },
    stats: {
      totalKills: { type: Number, default: 0, min: 0 },
      totalBooyah: { type: Number, default: 0, min: 0 },
      totalWins: { type: Number, default: 0, min: 0 },
      matchesPlayed: { type: Number, default: 0, min: 0 },
      modeStats: {
        BR: { type: modeStatsSchema, default: () => ({}) },
        CS: { type: modeStatsSchema, default: () => ({}) }
      }
    }
  },
  { timestamps: true }
);

teamSchema.pre("validate", function ensureTeamId(next) {
  if (!this.teamId) {
    this.teamId = `TEAM-${String(this._id).slice(-6).toUpperCase()}`;
  }

  next();
});

teamSchema.index({ players: 1 });
teamSchema.index({ teamId: 1 }, { unique: true });
teamSchema.index({ "stats.totalBooyah": -1, "stats.totalKills": -1 });
teamSchema.index({ "stats.totalWins": -1, "stats.totalKills": -1 });

module.exports = mongoose.model("Team", teamSchema);
