const rateLimit = require("express-rate-limit");
const { RATE_LIMIT } = require("../config/constants");
const { ipKeyGenerator } = rateLimit;

const createRateLimiter = (max, message, options = {}) =>
  rateLimit({
    windowMs: options.windowMs || RATE_LIMIT.WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        data: null
      });
    }
  });

const apiRateLimiter = createRateLimiter(
  Number(process.env.RATE_LIMIT_MAX || RATE_LIMIT.MAX_REQUESTS),
  "Too many requests, please try again later"
);

const authRateLimiter = createRateLimiter(
  Number(process.env.AUTH_RATE_LIMIT_MAX || RATE_LIMIT.AUTH_MAX_REQUESTS),
  "Too many auth attempts, please try again later"
);

const walletRateLimiter = createRateLimiter(
  Number(process.env.WALLET_RATE_LIMIT_MAX || RATE_LIMIT.WALLET_MAX_REQUESTS),
  "Too many wallet requests, please try again later",
  {
    keyGenerator: (req) =>
      req.user?._id ? `user:${String(req.user._id)}` : ipKeyGenerator(req.ip)
  }
);

const userActionRateLimiter = createRateLimiter(
  Number(process.env.USER_ACTION_RATE_LIMIT_MAX || 30),
  "Too many actions in a short period, please slow down",
  {
    windowMs: Number(process.env.USER_ACTION_RATE_LIMIT_WINDOW_MS || 60 * 1000),
    keyGenerator: (req) =>
      req.user?._id ? `user:${String(req.user._id)}` : ipKeyGenerator(req.ip)
  }
);

module.exports = {
  apiRateLimiter,
  authRateLimiter,
  walletRateLimiter,
  userActionRateLimiter
};
