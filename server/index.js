const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const tournamentRegistrationRoutes = require("./routes/tournamentRegistrationRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const matchRoutes = require("./routes/matchRoutes");
const walletRoutes = require("./routes/walletRoutes");
const messageRoutes = require("./routes/messageRoutes");
const adminRoutes = require("./routes/adminRoutes");
const configureSocket = require("./socket");
const seedInitialData = require("./utils/seedData");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const { sendSuccess } = require("./utils/apiResponse");
const logger = require("./utils/logger");
const { API_MESSAGES } = require("./config/constants");
const { apiRateLimiter } = require("./middleware/rateLimiter");

dotenv.config();

process.env.PORT = process.env.PORT || "5000";
process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET", "ADMIN_SECRET_KEY", "CLIENT_URL"];
const missingEnvVars = requiredEnvVars.filter((name) => {
  const value = process.env[name];
  return !value || !String(value).trim();
});

if (missingEnvVars.length) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const normalizeOrigin = (value) =>
  (typeof value === "string" ? value.trim().replace(/\/+$/, "") : "");

const configuredOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(",") : [])
]
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = [...new Set(configuredOrigins)];
const isProduction = process.env.NODE_ENV === "production";

const isLoopbackOrigin = (origin) => {
  if (!origin) return false;
  return /^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin);
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalizedOrigin)) return true;
  if (!isProduction && isLoopbackOrigin(normalizedOrigin)) return true;
  return false;
};

const corsOrigin = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error("Not allowed by CORS"));
};

const ensureUploadFolders = () => {
  const uploadRoot = path.join(__dirname, "uploads");
  const requiredPaths = [
    uploadRoot,
    path.join(uploadRoot, "avatars"),
    path.join(uploadRoot, "tournament")
  ];

  requiredPaths.forEach((folderPath) => {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  });
};

const app = express();

const trustProxyEnabled = ["1", "true", "yes"].includes(
  String(process.env.TRUST_PROXY || "").toLowerCase()
);

if (trustProxyEnabled) {
  app.set("trust proxy", 1);
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true
  }
});

configureSocket(io);
app.set("io", io);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/api", apiRateLimiter);
app.use((req, res, next) => {
  req.io = req.app.get("io");
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/tournament", tournamentRegistrationRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

app.get("/healthz", (req, res) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.get("/readyz", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;

  return res.status(dbReady ? 200 : 503).json({
    status: dbReady ? "ready" : "not_ready",
    database: dbReady ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  return sendSuccess(res, {
    message: API_MESSAGES.HEALTH_OK,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development"
    }
  });
});

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  ensureUploadFolders();
  await connectDB();
  await seedInitialData();

  server.listen(process.env.PORT, () => {
    logger.info(`Server running on port ${process.env.PORT}`);
    logger.info(`CORS allowlist: ${allowedOrigins.join(", ")}`);
    if (!isProduction) {
      logger.info("Development localhost origins are enabled for CORS");
    }
  });
};

startServer();
