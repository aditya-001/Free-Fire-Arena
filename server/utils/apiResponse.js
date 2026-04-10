const sendSuccess = (res, { statusCode = 200, message = "Success", data = {} } = {}) =>
  res.status(statusCode).json({
    success: true,
    message,
    data
  });

const sendError = (res, { statusCode = 500, message = "Something went wrong", data = null } = {}) =>
  res.status(statusCode).json({
    success: false,
    message,
    data
  });

module.exports = {
  sendSuccess,
  sendError
};
