import { Router } from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  createSubtask,
  toggleSubtask
} from "../controllers/task.controller.js";
import { authenticate } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createTaskValidator,
  updateTaskValidator,
  taskIdParamValidator
} from "../validators/tasks.js";
import { validateFields } from "../middleware/validator.js";

const router = Router();

// Apply auth middleware globally to all task endpoints
router.use(authenticate);

// Route: Get all tasks (supports query param search, filters, pagination, sort)
router.get("/", getTasks);

// Route: Get single task by ID
router.get("/:id", taskIdParamValidator, validateFields, getTaskById);

// Route: Create a new task
router.post("/", createTaskValidator, validateFields, createTask);

// Route: Update task by ID (Supports optional single multipart file upload for attachment)
router.put(
  "/:id",
  taskIdParamValidator,
  upload.single("attachment"),
  updateTaskValidator,
  validateFields,
  updateTask
);

// Route: Delete task by ID
router.delete("/:id", taskIdParamValidator, validateFields, deleteTask);

// Route: Add subtask to a task
router.post("/:taskId/subtasks", createSubtask);

// Route: Toggle subtask completion status
router.patch("/subtasks/:subtaskId/toggle", toggleSubtask);

export default router;
