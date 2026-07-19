import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

const app = express();

// 1. Global Middleware Setup
// Morgan is an HTTP request logger middleware. "dev" format logs method, url, status, response time.
app.use(morgan("dev"));

// Helmet helps secure Express apps by setting various HTTP headers (security rules).
app.use(helmet());

// CORS (Cross-Origin Resource Sharing) allows the API to receive requests from other domains.
app.use(cors({
  origin: "*", // In production, replace with specific frontend URL
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Express built-in body parsers to convert incoming request body streams to JSON objects.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 2. Rate Limiting Middleware
// Prevents Brute-force/DDoS requests by restricting IPs to 100 requests per 15 minutes.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(globalLimiter);

// 3. Health Check API Endpoint
// Helps load-balancers and checkers verify that the application container is responding.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

// 4. Fallback 404 Route handler
// Matches any HTTP route not explicitly defined above and returns a 404 error.
app.use((req, res, next) => {
  const error = new Error(`Cannot find requested route ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// 5. Centralized Global Error Handler Middleware
// Catch-all middleware for any errors thrown inside routes or services.
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error("Centralized Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack
  });

  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
});

export { app };
