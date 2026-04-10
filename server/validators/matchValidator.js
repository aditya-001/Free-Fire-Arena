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

const updateLiveMatchParamsSchema = Joi.object({
  matchId: objectId.required()
});

const resultSchema = Joi.object({
  userId: objectId.required(),
  teamId: objectId.allow(null),
  kills: Joi.number().integer().min(0).default(0),
  booyah: Joi.boolean().default(false),
  rank: Joi.number().integer().min(1).required()
});

const updateLiveMatchBodySchema = Joi.object({
  results: Joi.array().items(resultSchema).min(1),
  status: Joi.string().valid("live", "completed"),
  endMatch: Joi.boolean().default(false)
}).or("results", "status", "endMatch");

module.exports = {
  validateUpdateLiveMatchParams: runParamsValidation(updateLiveMatchParamsSchema),
  validateUpdateLiveMatchBody: runBodyValidation(updateLiveMatchBodySchema)
};
