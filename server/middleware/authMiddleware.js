const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Not authorized", 401));
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return next(new AppError("User not found", 401));
    }

    if (req.user.isBanned && req.user.role !== "admin") {
      return next(new AppError("Account is banned. Contact support.", 403));
    }

    return next();
  } catch (error) {
    return next(new AppError("Token invalid", 401));
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access required", 403));
  }

  return next();
};

module.exports = { protect, adminOnly };
