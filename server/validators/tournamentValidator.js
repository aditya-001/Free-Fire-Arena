const Joi = require("joi");
const AppError = require("../utils/AppError");

const runBodyValidation = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return next(new AppError(error.details.map((item) => item.message).join(", "), 400));
  }

  req.body = value;
  return next();
};

const runParamsValidation = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return next(new AppError(error.details.map((item) => item.message).join(", "), 400));
  }

  req.params = value;
  return next();
};

const createTournamentSchema = Joi.object({
  title: Joi.string().min(3),
  name: Joi.string().min(3),
  mode: Joi.string().valid("BR", "CS").uppercase(),
  game: Joi.string().min(2),
  entryFee: Joi.number().min(0).required(),
  prizePool: Joi.number().min(0).required(),
  maxPlayers: Joi.number().integer().min(1),
  maxSlots: Joi.number().integer().min(1),
  type: Joi.string().valid("solo", "duo", "squad"),
  maxTeams: Joi.number().integer().min(1),
  tournamentStartTime: Joi.date().iso(),
  startTime: Joi.date().iso(),
  dateTime: Joi.date().iso(),
  registrationStartTime: Joi.date().iso(),
  registrationEndTime: Joi.date().iso()
})
  .or("title", "name")
  .or("startTime", "dateTime", "tournamentStartTime")
  .messages({
    "object.missing": "title/name and startTime/dateTime/tournamentStartTime are required"
  });

const joinTournamentParamsSchema = Joi.object({
  id: Joi.string().length(24).hex().required()
});

const joinTournamentBodySchema = Joi.object({
  tournamentId: Joi.string().length(24).hex().required()
});

const createTournamentPaymentOrderSchema = Joi.object({
  registrationId: Joi.string().length(24).hex().required(),
  method: Joi.string().valid("UPI", "CARD", "NETBANKING").optional()
});

const verifyTournamentPaymentSchema = Joi.object({
  registrationId: Joi.string().length(24).hex().required(),
  orderId: Joi.string().trim().min(3).required(),
  paymentId: Joi.string().trim().min(3).required(),
  signature: Joi.string().trim().min(10).required(),
  method: Joi.string().valid("UPI", "CARD", "NETBANKING").optional()
});

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const parsePlayers = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeString(entry))
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeString(entry))
        .filter(Boolean);
    }
  } catch (error) {
    // Fallback to comma/newline format below.
  }

  return trimmed
    .split(/[\n,]/)
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
};

const validateTournamentRegistration = (req, res, next) => {
  const tournamentId = normalizeString(req.body?.tournamentId);
  const joinTypeRaw = normalizeString(req.body?.joinType || req.body?.type);
  const joinType = joinTypeRaw ? joinTypeRaw.toLowerCase() : "";

  if (!Joi.string().length(24).hex().validate(tournamentId).error) {
    // valid
  } else {
    return next(new AppError("tournamentId is required and must be valid", 400));
  }

  if (!["squad", "solo"].includes(joinType)) {
    return next(new AppError("joinType must be squad or solo", 400));
  }

  if (joinType === "squad") {
    const teamName = normalizeString(req.body?.teamName);
    const teamLeaderGameId = normalizeString(req.body?.teamLeaderGameId);
    const players = parsePlayers(req.body?.players);
    const uniquePlayers = [...new Set(players.map((entry) => entry.toUpperCase()))];

    if (!teamName || teamName.length < 2) {
      return next(new AppError("teamName is required for squad registration", 400));
    }

    if (!teamLeaderGameId || teamLeaderGameId.length < 3) {
      return next(new AppError("teamLeaderGameId is required for squad registration", 400));
    }

    if (uniquePlayers.length !== 4) {
      return next(new AppError("Exactly 4 unique player IDs are required for squad registration", 400));
    }

    if (!req.file) {
      return next(new AppError("Team banner image is required for squad registration", 400));
    }

    req.body = {
      tournamentId,
      joinType,
      teamName,
      teamLeaderGameId,
      players: uniquePlayers,
      gameId: null
    };

    return next();
  }

  const gameId = normalizeString(req.body?.gameId || req.body?.soloGameId);
  if (!gameId || gameId.length < 3) {
    return next(new AppError("gameId is required for solo registration", 400));
  }

  req.body = {
    tournamentId,
    joinType,
    teamName: null,
    teamLeaderGameId: null,
    players: [gameId.toUpperCase()],
    gameId
  };

  return next();
};

module.exports = {
  validateCreateTournament: runBodyValidation(createTournamentSchema),
  validateGetTournamentDetails: runParamsValidation(joinTournamentParamsSchema),
  validateJoinTournament: runParamsValidation(joinTournamentParamsSchema),
  validateJoinTournamentBody: runBodyValidation(joinTournamentBodySchema),
  validateTournamentRegistration,
  validateCreateTournamentPaymentOrderBody: runBodyValidation(createTournamentPaymentOrderSchema),
  validateTournamentPaymentVerifyBody: runBodyValidation(verifyTournamentPaymentSchema)
};
