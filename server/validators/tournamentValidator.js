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
  game: Joi.string().min(2),
  entryFee: Joi.number().min(0).required(),
  prizePool: Joi.number().min(0).required(),
  maxPlayers: Joi.number().integer().min(1),
  startTime: Joi.date().iso(),
  dateTime: Joi.date().iso()
})
  .or("title", "name")
  .or("startTime", "dateTime")
  .messages({
    "object.missing": "title/name and startTime/dateTime are required"
  });

const joinTournamentParamsSchema = Joi.object({
  id: Joi.string().length(24).hex().required()
});

module.exports = {
  validateCreateTournament: runBodyValidation(createTournamentSchema),
  validateJoinTournament: runParamsValidation(joinTournamentParamsSchema)
};
