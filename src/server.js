import "dotenv/config";
import { app } from "./app.js";

const PORT = process.env.PORT || 5000;

// Start the Express HTTP listener socket
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Smart Task System API Server Started!`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`⚙️  Environment:  ${process.env.NODE_ENV || "development"}`);
  console.log(`===============================================`);
});

// Graceful Shutdown Helpers
// Ensures the server stops accepting new connections and finishes active requests before exit.
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log("🛑 HTTP server closed.");
    console.log("👋 Process exit clean.");
    process.exit(0);
  });

  // Force close after 10 seconds if connections are hanging
  setTimeout(() => {
    console.error("☠️  Force shut down: Active connections did not close in time.");
    process.exit(1);
  }, 10000);
};

// Listen for process termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { server };
