const Joi = require("joi");
const AppError = require("../utils/AppError");

const objectId = Joi.string().length(24).hex();

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

const playerResultSchema = Joi.object({
  userId: objectId.required(),
  kills: Joi.number().integer().min(0).required()
});

const teamResultSchema = Joi.object({
  teamId: objectId.required(),
  rank: Joi.number().integer().min(1).required(),
  totalKills: Joi.number().integer().min(0).required(),
  booyah: Joi.boolean().required(),
  players: Joi.array().items(playerResultSchema).min(1).required()
});

const registerTeamBodySchema = Joi.object({
  teamName: Joi.string().trim().min(2).required(),
  players: Joi.array().items(objectId.required()).min(1).unique().required()
});

const createMatchBodySchema = Joi.object({
  tournamentId: objectId.required(),
  matchNumber: Joi.number().integer().min(1),
  mode: Joi.string().valid("BR", "CS"),
  selectedTeams: Joi.array().items(objectId.required()).min(1).unique(),
  startTime: Joi.date(),
  roomId: Joi.string().trim().allow(""),
  roomPassword: Joi.string().trim().allow(""),
  password: Joi.string().trim().allow("")
});

const getTournamentBracketParamsSchema = Joi.object({
  id: objectId.required()
});

const getTournamentRegistrationsParamsSchema = Joi.object({
  id: objectId.required()
});

const createTournamentBracketBodySchema = Joi.object({
  tournamentId: objectId.required(),
  teamIds: Joi.array().items(objectId.required()).length(8).unique().required(),
  startTime: Joi.date().iso()
});

const saveBracketResultBodySchema = Joi.object({
  matchId: objectId.required(),
  winnerTeamId: objectId.required()
});

const saveQualifiedTeamsBodySchema = Joi.object({
  matchId: objectId.required(),
  qualifiedTeams: Joi.array().items(objectId.required()).min(1).unique().required()
});

const getMatchParamsSchema = Joi.object({
  id: objectId.required()
});

const updateMatchBodySchema = Joi.object({
  matchId: objectId.required(),
  results: Joi.array().items(teamResultSchema).min(1).unique("rank").required()
});

const editMatchParamsSchema = Joi.object({
  id: objectId.required()
});

const editMatchBodySchema = Joi.object({
  results: Joi.array().items(teamResultSchema).min(1).unique("rank").required()
});

const endMatchBodySchema = Joi.object({
  matchId: objectId.required()
});

const updateTournamentTimeBodySchema = Joi.object({
  tournamentId: objectId.required(),
  registrationStartTime: Joi.date().iso(),
  registrationEndTime: Joi.date().iso()
})
  .or("registrationStartTime", "registrationEndTime")
  .messages({
    "object.missing": "registrationStartTime or registrationEndTime is required"
  });

const reviewTournamentRegistrationBodySchema = Joi.object({
  registrationId: objectId.required(),
  approve: Joi.boolean().default(true),
  note: Joi.string().trim().allow("").max(300)
});

const closeTournamentRegistrationBodySchema = Joi.object({
  tournamentId: objectId.required()
});

const openTournamentRegistrationBodySchema = Joi.object({
  tournamentId: objectId.required(),
  registrationEndTime: Joi.date().iso(),
  minutes: Joi.number().integer().min(1).max(10080)
});

const increaseTournamentTimeBodySchema = Joi.object({
  tournamentId: objectId.required(),
  minutes: Joi.number().integer().min(1).max(720).required()
});

const startTournamentBodySchema = Joi.object({
  tournamentId: objectId.required()
});

const assignTournamentMatchBodySchema = Joi.object({
  tournamentId: objectId.required(),
  teamIds: Joi.array().items(objectId.required()).min(1).unique().required(),
  mode: Joi.string().valid("BR", "CS"),
  matchNumber: Joi.number().integer().min(1),
  startTime: Joi.date().iso()
});

module.exports = {
  validateRegisterTeamBody: runBodyValidation(registerTeamBodySchema),
  validateCreateAdminMatchBody: runBodyValidation(createMatchBodySchema),
  validateGetTournamentBracketParams: runParamsValidation(getTournamentBracketParamsSchema),
  validateGetTournamentRegistrationsParams: runParamsValidation(getTournamentRegistrationsParamsSchema),
  validateCreateTournamentBracketBody: runBodyValidation(createTournamentBracketBodySchema),
  validateSaveBracketResultBody: runBodyValidation(saveBracketResultBodySchema),
  validateQualifiedTeamsBody: runBodyValidation(saveQualifiedTeamsBodySchema),
  validateGetAdminMatchParams: runParamsValidation(getMatchParamsSchema),
  validateUpdateAdminMatchBody: runBodyValidation(updateMatchBodySchema),
  validateEditAdminMatchParams: runParamsValidation(editMatchParamsSchema),
  validateEditAdminMatchBody: runBodyValidation(editMatchBodySchema),
  validateEndAdminMatchBody: runBodyValidation(endMatchBodySchema),
  validateUpdateTournamentTimeBody: runBodyValidation(updateTournamentTimeBodySchema),
  validateReviewTournamentRegistrationBody: runBodyValidation(reviewTournamentRegistrationBodySchema),
  validateCloseTournamentRegistrationBody: runBodyValidation(closeTournamentRegistrationBodySchema),
  validateOpenTournamentRegistrationBody: runBodyValidation(openTournamentRegistrationBodySchema),
  validateIncreaseTournamentTimeBody: runBodyValidation(increaseTournamentTimeBodySchema),
  validateStartTournamentBody: runBodyValidation(startTournamentBodySchema),
  validateAssignTournamentMatchBody: runBodyValidation(assignTournamentMatchBodySchema)
};
