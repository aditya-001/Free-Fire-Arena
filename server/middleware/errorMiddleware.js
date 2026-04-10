const { sendError } = require("../utils/apiResponse");
const logger = require("../utils/logger");

const notFound = (req, res) => {
  sendError(res, {
    statusCode: 404,
    message: `Route not found: ${req.originalUrl}`,
    data: null
  });
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  logger.error(`${req.method} ${req.originalUrl} -> ${error.message}`);

  return sendError(res, {
    statusCode,
    message: error.message || "Something went wrong",
    data: process.env.NODE_ENV === "production" ? null : { stack: error.stack }
  });
};

module.exports = { notFound, errorHandler };
