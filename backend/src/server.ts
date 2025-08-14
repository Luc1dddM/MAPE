import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import logger from "./utils/logger.js";
import errorHandler from "./middleware/errorHandler.js";
import promptRoutes from "./routes/promptRoutes.js";
import evaluationRoutes from "./routes/evaluationRoutes.js";
import optimizeRoutes from './routes/optimizeRoutes.js';

const app = express();
const PORT = process.env["PORT"] || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env["NODE_ENV"] === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000"],
    credentials: true,
  }),
);

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs:
    parseInt(process.env["RATE_LIMIT_WINDOW_MS"] || "900000") || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] || "100") || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/prompts", promptRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use('/api/optimize', optimizeRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`MAPE Backend server running on port ${PORT}`);
  logger.info(`Environment: ${process.env["NODE_ENV"]}`);
});
