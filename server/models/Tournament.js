const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    game: { type: String, required: true, default: "Free Fire", trim: true },
    entryFee: { type: Number, required: true, min: 0 },
    prizePool: { type: Number, required: true, min: 0 },
    maxPlayers: { type: Number, required: true, min: 1, default: 50 },
    joinedPlayers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: []
    },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed"],
      default: "upcoming"
    },
    startTime: { type: Date, required: true },

    map: String,
    mode: String,
    roomId: String,
    roomPassword: String,
    results: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rank: Number,
        kills: Number,
        winnings: Number
      }
    ],

    // Legacy fields kept so older payloads/UI continue to work.
    name: String,
    dateTime: Date,
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: []
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

tournamentSchema.pre("validate", function syncLegacyAndNewFields(next) {
  if (!this.title && this.name) this.title = this.name;
  if (!this.name && this.title) this.name = this.title;

  if (!this.startTime && this.dateTime) this.startTime = this.dateTime;
  if (!this.dateTime && this.startTime) this.dateTime = this.startTime;

  if (!this.joinedPlayers.length && this.participants.length) {
    this.joinedPlayers = this.participants;
  }

  if (!this.participants.length && this.joinedPlayers.length) {
    this.participants = this.joinedPlayers;
  }

  next();
});

tournamentSchema.index({ startTime: 1, status: 1 });
tournamentSchema.index({ game: 1, startTime: 1 });

module.exports = mongoose.model("Tournament", tournamentSchema);
