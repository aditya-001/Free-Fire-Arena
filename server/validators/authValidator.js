const Joi = require("joi");
const AppError = require("../utils/AppError");

const runValidation = (schema) => (req, res, next) => {
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

const registerSchema = Joi.object({
  username: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).required(),
  password: Joi.string().min(6).required(),
  gameId: Joi.string().min(3),
  uid: Joi.string().min(3),
  ffGameId: Joi.string().min(3),
  state: Joi.string().allow(""),
  city: Joi.string().allow("")
})
  .or("gameId", "uid", "ffGameId")
  .messages({ "object.missing": "gameId is required" });

const availabilitySchema = Joi.object({
  username: Joi.string().min(3),
  email: Joi.string().email(),
  phone: Joi.string().min(10),
  gameId: Joi.string().min(3),
  uid: Joi.string().min(3),
  ffGameId: Joi.string().min(3)
})
  .or("username", "email", "phone", "gameId", "uid", "ffGameId")
  .messages({ "object.missing": "At least one field is required" });

const loginSchema = Joi.object({
  identifier: Joi.string(),
  email: Joi.string().email(),
  username: Joi.string(),
  phone: Joi.string(),
  gameId: Joi.string(),
  uid: Joi.string(),
  password: Joi.string().min(1).required()
})
  .or("identifier", "email", "username", "phone", "gameId", "uid")
  .messages({ "object.missing": "Identifier is required" });

const adminRegisterSchema = Joi.object({
  username: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).required(),
  password: Joi.string().min(6).required(),
  adminKey: Joi.string().min(3).required()
});

const adminLoginSchema = Joi.object({
  adminId: Joi.string().min(3).required(),
  password: Joi.string().min(1).required()
});

module.exports = {
  validateRegister: runValidation(registerSchema),
  validateAvailability: runValidation(availabilitySchema),
  validateLogin: runValidation(loginSchema),
  validateAdminRegister: runValidation(adminRegisterSchema),
  validateAdminLogin: runValidation(adminLoginSchema)
};
