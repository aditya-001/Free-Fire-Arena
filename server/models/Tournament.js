const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    entryFee: { type: Number, required: true, min: 0 },
    prizePool: { type: Number, required: true, min: 0 },
    dateTime: { type: Date, required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed"],
      default: "upcoming"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tournament", tournamentSchema);
