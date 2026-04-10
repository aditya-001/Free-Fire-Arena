const Joi = require("joi");
const AppError = require("../utils/AppError");

const objectId = Joi.string().length(24).hex();

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

const runQueryValidation = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return next(new AppError(error.details.map((item) => item.message).join(", "), 400));
  }

  req.query = value;
  return next();
};

const matchParamsSchema = Joi.object({
  matchId: objectId.required()
});

const historyQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(10).default(10)
});

const playersQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(100)
});

const teamsQuerySchema = Joi.object({
  mode: Joi.string().valid("BR", "CS").uppercase().default("BR"),
  limit: Joi.number().integer().min(1).max(100).default(100)
});

module.exports = {
  validateMatchParams: runParamsValidation(matchParamsSchema),
  validateHistoryQuery: runQueryValidation(historyQuerySchema),
  validatePlayersQuery: runQueryValidation(playersQuerySchema),
  validateTeamsQuery: runQueryValidation(teamsQuerySchema)
};
