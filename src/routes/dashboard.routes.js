import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Route: Get dashboard aggregated statistics and AI predictions
router.get("/", authenticate, getDashboardStats);

export default router;
