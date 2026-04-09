const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const matchHistorySchema = new mongoose.Schema(
  {
    matchName: { type: String, required: true },
    placement: { type: Number, required: true },
    kills: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    playedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    bio: { type: String, default: "Ready for the next Booyah." },
    profileImage: { type: String, default: "" },
    uid: { type: String, required: true, unique: true, trim: true },
    skills: [{ type: String }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    achievements: [{ type: String }],
    notifications: [notificationSchema],
    matchHistory: [matchHistorySchema],
    location: {
      state: { type: String, default: "Uttar Pradesh" },
      city: { type: String, default: "Mathura" }
    },
    stats: {
      points: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      matches: { type: Number, default: 0 }
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
