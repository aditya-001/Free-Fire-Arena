const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true, minlength: 3 },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, required: true, trim: true },
  gameId: { type: String, unique: true, required: true, trim: true },

  password: { type: String, required: true, minlength: 6 },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  walletBalance: {
    type: Number,
    default: 0
  },

  stats: {
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    kills: { type: Number, default: 0 }
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

module.exports = mongoose.model('User', userSchema);
