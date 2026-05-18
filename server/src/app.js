import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import env from "./config/env.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import superAdminRoutes from "./routes/superAdmin.routes.js";
import examOfficerRoutes from "./routes/examOfficer.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import questionRoutes from "./routes/question.routes.js";
import examRoutes from "./routes/exam.routes.js";
import resultRoutes from "./routes/result.routes.js";
import candidatesRoutes from "./routes/candidates.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

// Error handler
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

// ── Security & Global Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    statusCode: 200,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    message: "Server is healthy",
    success: true,
  });
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/super-admin", superAdminRoutes);
app.use("/api/v1/exam-officer", examOfficerRoutes);
app.use("/api/v1/candidate", candidateRoutes);
app.use("/api/v1/candidates", candidatesRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/exams", examRoutes);
app.use("/api/v1/results", resultRoutes);

// ── 404 Catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: "Route not found",
    errors: [],
    success: false,
  });
});

// ── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export default app;
