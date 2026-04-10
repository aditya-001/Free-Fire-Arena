const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema(
  {
    totalKills: { type: Number, default: 0, min: 0, index: true },
    totalBooyah: { type: Number, default: 0, min: 0 },
    matchesPlayed: { type: Number, default: 0, min: 0 },

    // Legacy keys retained for existing frontend payload compatibility.
    kills: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    matches: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 0, min: 0, index: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true, minlength: 3 },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, required: true, trim: true },
  gameId: { type: String, unique: true, required: true, trim: true },
  // Legacy field retained for older DB indexes and frontend payloads.
  uid: { type: String, unique: true, sparse: true, trim: true },

  password: { type: String, required: true, minlength: 6 },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  isBanned: {
    type: Boolean,
    default: false,
    index: true
  },

  bannedAt: {
    type: Date,
    default: null
  },

  bannedReason: {
    type: String,
    default: null,
    trim: true
  },

  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  walletBalance: {
    type: Number,
    default: 0
  },

  walletCreditRefs: {
    type: [String],
    default: [],
    select: false
  },

  walletLock: {
    isLocked: { type: Boolean, default: false },
    lockRef: { type: String, default: null },
    reason: { type: String, default: null },
    lockedAt: { type: Date, default: null }
  },

  stats: {
    type: userStatsSchema,
    default: () => ({})
  },

  isVerified: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false }
  },

  // Retaining some fields from older schema to keep app compiling 
  bio: { type: String, default: 'Ready for the next Booyah.' },
  profileImage: { type: String, default: '' },
  skills: [{ type: String }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  achievements: [{ type: String }],
  location: {
    state: { type: String, default: 'Uttar Pradesh' },
    city: { type: String, default: 'Mathura' }
  },
  notifications: [{
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  matchHistory: [{
    matchName: { type: String, required: true },
    placement: { type: Number, required: true },
    kills: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    playedAt: { type: Date, default: Date.now }
  }],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ "walletLock.isLocked": 1, "walletLock.lockedAt": 1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ role: 1, isBanned: 1, createdAt: -1 });

userSchema.pre("validate", function syncLegacyUid(next) {
  const normalizedGameId = this.gameId?.trim();
  const normalizedUid = this.uid?.trim();

  if (!normalizedGameId && normalizedUid) {
    this.gameId = normalizedUid;
  }

  if (!normalizedUid && normalizedGameId) {
    this.uid = normalizedGameId;
  }

  next();
});

userSchema.pre("validate", function syncStats(next) {
  const stats = this.stats || {};

  const safeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const totalKills = safeNumber(stats.totalKills || stats.kills);
  const totalBooyah = safeNumber(stats.totalBooyah || stats.wins);
  const matchesPlayed = safeNumber(stats.matchesPlayed || stats.matches);

  stats.totalKills = totalKills;
  stats.totalBooyah = totalBooyah;
  stats.matchesPlayed = matchesPlayed;

  stats.kills = totalKills;
  stats.wins = totalBooyah;
  stats.matches = matchesPlayed;
  stats.points = totalKills * 2 + totalBooyah * 10;

  this.stats = stats;
  next();
});

module.exports = mongoose.model('User', userSchema);
