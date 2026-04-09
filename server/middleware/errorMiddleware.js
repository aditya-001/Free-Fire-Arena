const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: error.message || "Something went wrong",
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });
};

module.exports = { notFound, errorHandler };
