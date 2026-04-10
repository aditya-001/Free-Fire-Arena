const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const matchRoutes = require("./routes/matchRoutes");
const walletRoutes = require("./routes/walletRoutes");
const messageRoutes = require("./routes/messageRoutes");
const configureSocket = require("./socket");
const seedInitialData = require("./utils/seedData");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const { sendSuccess } = require("./utils/apiResponse");
const logger = require("./utils/logger");
const { API_MESSAGES } = require("./config/constants");
const { apiRateLimiter } = require("./middleware/rateLimiter");

dotenv.config();

process.env.PORT = process.env.PORT || "5000";
process.env.MONGO_URI =
  process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/freefire_arena";
process.env.JWT_SECRET = process.env.JWT_SECRET || "freefire_dev_secret";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin === process.env.CLIENT_URL) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
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
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/messages", messageRoutes);

app.get("/api/health", (req, res) => {
  return sendSuccess(res, {
    message: API_MESSAGES.HEALTH_OK,
    data: {
      status: "ok",
      timestamp: new Date().toISOString()
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
  });
};

startServer();
