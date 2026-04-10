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

const createOrderSchema = Joi.object({
  amount: Joi.number().positive().min(10).required(),
  method: Joi.string().valid("UPI", "CARD", "NETBANKING").default("UPI")
});

const verifyPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  paymentId: Joi.string().required(),
  signature: Joi.string().required(),
  amount: Joi.number().positive().required(),
  method: Joi.string().valid("UPI", "CARD", "NETBANKING").default("UPI")
});

const withdrawSchema = Joi.object({
  amount: Joi.number().positive().required()
});

const historyQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const adminHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  status: Joi.string().valid("pending", "success", "failed"),
  type: Joi.string().valid("credit", "debit"),
  userId: objectId,
  onlySuspicious: Joi.boolean().default(false)
});

const transactionParamsSchema = Joi.object({
  transactionId: objectId.required()
});

const adminWithdrawDecisionSchema = Joi.object({
  note: Joi.string().allow("").max(300)
});

module.exports = {
  validateCreateOrder: runBodyValidation(createOrderSchema),
  validateVerifyPayment: runBodyValidation(verifyPaymentSchema),
  validateWithdraw: runBodyValidation(withdrawSchema),
  validateWalletHistoryQuery: runQueryValidation(historyQuerySchema),
  validateAdminHistoryQuery: runQueryValidation(adminHistoryQuerySchema),
  validateTransactionParams: runParamsValidation(transactionParamsSchema),
  validateAdminWithdrawDecision: runBodyValidation(adminWithdrawDecisionSchema)
};
