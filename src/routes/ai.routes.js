import { Router } from "express";
import {
  handleAIChat,
  handleSmartCreateTask,
  handleTaskPriorityAnalysis,
  handleProductivityAdvice,
  handlePerformanceReport,
  handleTaskSummary
} from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Apply auth middleware globally to all AI features
router.use(authenticate);

// Route: AI Productivity Chatbot
router.post("/chat", handleAIChat);

// Route: Smart Task Creation (Natural Language parsing)
router.post("/smart-task", handleSmartCreateTask);

// Route: Run detailed priority scoring/insights for a task
router.get("/tasks/:taskId/priority", handleTaskPriorityAnalysis);

// Route: Get tailored tips from the AI productivity coach
router.get("/coach", handleProductivityAdvice);

// Route: Generate a weekly or monthly performance report
router.get("/report", handlePerformanceReport);

// Route: Get AI motivation summaries for active workload
router.get("/summary", handleTaskSummary);

export default router;
