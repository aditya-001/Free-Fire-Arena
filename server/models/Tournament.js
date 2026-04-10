const mongoose = require("mongoose");
const { TOURNAMENT_STATUS, TOURNAMENT_MODES } = require("../config/constants");

const TOURNAMENT_TYPES = Object.freeze(["solo", "duo", "squad"]);
const TYPE_PLAYERS_MAP = Object.freeze({
  solo: 1,
  duo: 2,
  squad: 4
});

const tournamentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    game: { type: String, required: true, default: "Free Fire", trim: true },
    entryFee: { type: Number, required: true, min: 0 },
    prizePool: { type: Number, required: true, min: 0 },
    maxPlayers: { type: Number, required: true, min: 1, default: 50 },
    maxTeams: { type: Number, required: true, min: 1, default: 12 },
    playersPerTeam: { type: Number, required: true, min: 1, default: 4 },
    maxSlots: { type: Number, required: true, min: 1, default: 50 },
    filledSlots: { type: Number, required: true, min: 0, default: 0 },
    joinedPlayers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: []
    },
    status: {
      type: String,
      enum: TOURNAMENT_STATUS,
      default: "upcoming"
    },
    startTime: { type: Date, required: true },
    tournamentStartTime: { type: Date, required: true },
    registrationStartTime: { type: Date, default: Date.now },
    registrationEndTime: { type: Date },
    isRegistrationClosed: {
      type: Boolean,
      default: false,
      index: true
    },

    map: String,
    mode: {
      type: String,
      enum: TOURNAMENT_MODES,
      default: "BR",
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: TOURNAMENT_TYPES,
      default: "squad",
      lowercase: true,
      trim: true
    },
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

  if (!this.startTime && this.tournamentStartTime) this.startTime = this.tournamentStartTime;
  if (!this.tournamentStartTime && this.startTime) this.tournamentStartTime = this.startTime;
  if (!this.dateTime && this.tournamentStartTime) this.dateTime = this.tournamentStartTime;
  if (!this.tournamentStartTime && this.dateTime) this.tournamentStartTime = this.dateTime;

  const normalizedType = String(this.type || "squad").toLowerCase();
  this.type = TOURNAMENT_TYPES.includes(normalizedType) ? normalizedType : "squad";

  const requiredPlayersPerTeam = TYPE_PLAYERS_MAP[this.type] || 4;
  this.playersPerTeam = requiredPlayersPerTeam;

  if (!this.registrationStartTime) {
    this.registrationStartTime = new Date();
  }

  if (!this.registrationEndTime && this.startTime) {
    this.registrationEndTime = this.startTime;
  }

  if (
    this.registrationStartTime &&
    this.registrationEndTime &&
    this.registrationStartTime.getTime() > this.registrationEndTime.getTime()
  ) {
    this.invalidate("registrationEndTime", "registrationEndTime must be after registrationStartTime");
  }

  if (!this.joinedPlayers.length && this.participants.length) {
    this.joinedPlayers = this.participants;
  }

  if (!this.participants.length && this.joinedPlayers.length) {
    this.participants = this.joinedPlayers;
  }

  const parsedMaxTeams = Number.parseInt(this.maxTeams, 10);
  const fallbackTeamsFromSlots = Number.parseInt(this.maxSlots, 10);
  const fallbackTeamsFromPlayers = Number.parseInt(
    Number(this.maxPlayers || 0) / Number(this.playersPerTeam || 1),
    10
  );

  this.maxTeams =
    Number.isFinite(parsedMaxTeams) && parsedMaxTeams > 0
      ? parsedMaxTeams
      : Number.isFinite(fallbackTeamsFromSlots) && fallbackTeamsFromSlots > 0
        ? fallbackTeamsFromSlots
        : Number.isFinite(fallbackTeamsFromPlayers) && fallbackTeamsFromPlayers > 0
          ? fallbackTeamsFromPlayers
          : 12;

  this.maxSlots = this.maxTeams;

  const normalizedMaxPlayers = this.maxTeams * this.playersPerTeam;
  this.maxPlayers = normalizedMaxPlayers;

  const joinedCount = Array.isArray(this.joinedPlayers) ? this.joinedPlayers.length : 0;
  if (!Number.isFinite(this.filledSlots) || this.filledSlots < joinedCount) {
    this.filledSlots = joinedCount;
  }

  if (Number(this.filledSlots || 0) >= Number(this.maxSlots || 0)) {
    this.isRegistrationClosed = true;
  }

  const registrationEndMs = this.registrationEndTime
    ? new Date(this.registrationEndTime).getTime()
    : null;
  if (registrationEndMs !== null && Number.isFinite(registrationEndMs) && Date.now() > registrationEndMs) {
    this.isRegistrationClosed = true;
  }

  next();
});

tournamentSchema.index({ startTime: 1, status: 1 });
tournamentSchema.index({ mode: 1, status: 1, startTime: -1 });
tournamentSchema.index({ game: 1, startTime: 1 });
tournamentSchema.index({ title: 1, createdAt: -1 });
tournamentSchema.index({ name: 1, createdAt: -1 });

module.exports = mongoose.model("Tournament", tournamentSchema);
