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
  selectedTeams: Joi.array().items(objectId.required()).min(1).unique().required(),
  startTime: Joi.date(),
  roomId: Joi.string().trim().allow(""),
  roomPassword: Joi.string().trim().allow(""),
  password: Joi.string().trim().allow("")
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

module.exports = {
  validateRegisterTeamBody: runBodyValidation(registerTeamBodySchema),
  validateCreateAdminMatchBody: runBodyValidation(createMatchBodySchema),
  validateQualifiedTeamsBody: runBodyValidation(saveQualifiedTeamsBodySchema),
  validateGetAdminMatchParams: runParamsValidation(getMatchParamsSchema),
  validateUpdateAdminMatchBody: runBodyValidation(updateMatchBodySchema),
  validateEditAdminMatchParams: runParamsValidation(editMatchParamsSchema),
  validateEditAdminMatchBody: runBodyValidation(editMatchBodySchema),
  validateEndAdminMatchBody: runBodyValidation(endMatchBodySchema)
};
