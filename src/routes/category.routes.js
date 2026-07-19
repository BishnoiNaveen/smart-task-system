import { Router } from "express";
import {
  getCategories,
  createCategory,
  deleteCategory
} from "../controllers/category.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Apply auth middleware globally to all category endpoints
router.use(authenticate);

// Route: Get all categories for user
router.get("/", getCategories);

// Route: Create a new category
router.post("/", createCategory);

// Route: Delete category by ID
router.delete("/:id", deleteCategory);

export default router;
