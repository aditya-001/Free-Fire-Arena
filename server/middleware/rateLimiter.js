const rateLimit = require("express-rate-limit");
const { RATE_LIMIT } = require("../config/constants");

const createRateLimiter = (max, message) =>
  rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
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

module.exports = {
  apiRateLimiter,
  authRateLimiter
};
