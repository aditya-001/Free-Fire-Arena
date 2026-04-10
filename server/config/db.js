const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000
    });
    logger.info(`MongoDB connected: ${process.env.MONGO_URI}`);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      logger.error(`MongoDB connection failed: ${error.message}`);
      process.exit(1);
    }

    logger.warn(`MongoDB unavailable, starting in-memory fallback: ${error.message}`);
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    process.env.MONGO_URI = memoryUri;

    // In local development we keep the app bootable even without a system MongoDB service.
    await mongoose.connect(memoryUri);
    logger.info(`MongoDB connected (memory): ${memoryUri}`);
  }
};

module.exports = connectDB;
