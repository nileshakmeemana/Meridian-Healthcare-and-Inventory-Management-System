// server.js - Meridian Backend Entry Point
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { initPool } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 5000;
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  }),
);

// ── General Middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRateLimit, require("./routes/auth.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/doctors", require("./routes/doctor.routes"));
app.use("/api/pharmacists", require("./routes/pharmacist.routes"));
app.use("/api/suppliers", require("./routes/supplier.routes"));
app.use("/api/patients", require("./routes/patient.routes"));
app.use("/api/medicines", require("./routes/medicine.routes"));
app.use("/api/appointments", require("./routes/appointment.routes"));
app.use("/api/prescriptions", require("./routes/prescription.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/reports", require("./routes/report.routes"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", app: "Meridian API" }),
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);

// ── Boot ──────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await initPool();
    app.listen(PORT, () =>
      console.log(`🚀 Meridian API running on http://localhost:${PORT}`),
    );
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();

module.exports = app; // for testing
