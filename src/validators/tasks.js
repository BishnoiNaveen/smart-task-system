import { body, param } from "express-validator";

export const createTaskValidator = [
  body("title")
    .trim()
    .notEmpty().withMessage("Task title is required."),
  body("dueDate")
    .isISO8601().withMessage("Provide a valid ISO8601 date-time string (e.g. YYYY-MM-DDT00:00:00Z)."),
  body("priority")
    .isIn(["LOW", "MEDIUM", "HIGH"]).withMessage("Priority must be one of: LOW, MEDIUM, HIGH."),
  body("status")
    .isIn(["TODO", "IN_PROGRESS", "COMPLETED"]).withMessage("Status must be one of: TODO, IN_PROGRESS, COMPLETED."),
  body("recurring")
    .isIn(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).withMessage("Recurring must be one of: NONE, DAILY, WEEKLY, MONTHLY."),
  body("difficulty")
    .optional()
    .isIn(["EASY", "MEDIUM", "HARD"]).withMessage("Difficulty must be one of: EASY, MEDIUM, HARD."),
  body("estimatedTime")
    .optional()
    .isFloat({ min: 0 }).withMessage("Estimated time must be a non-negative decimal hours value."),
  body("completionPct")
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage("Completion percentage must be a number between 0 and 100."),
  body("categoryId")
    .optional({ nullable: true })
    .isUUID().withMessage("Category ID must be a valid UUID format.")
];

export const updateTaskValidator = [
  body("title")
    .optional()
    .trim()
    .notEmpty().withMessage("Task title cannot be empty."),
  body("dueDate")
    .optional()
    .isISO8601().withMessage("Provide a valid ISO8601 date-time string."),
  body("priority")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH"]).withMessage("Priority must be one of: LOW, MEDIUM, HIGH."),
  body("status")
    .optional()
    .isIn(["TODO", "IN_PROGRESS", "COMPLETED"]).withMessage("Status must be one of: TODO, IN_PROGRESS, COMPLETED."),
  body("recurring")
    .optional()
    .isIn(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).withMessage("Recurring must be one of: NONE, DAILY, WEEKLY, MONTHLY."),
  body("difficulty")
    .optional()
    .isIn(["EASY", "MEDIUM", "HARD"]).withMessage("Difficulty must be one of: EASY, MEDIUM, HARD."),
  body("estimatedTime")
    .optional()
    .isFloat({ min: 0 }).withMessage("Estimated time must be a non-negative decimal value."),
  body("completionPct")
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage("Completion percentage must be between 0 and 100."),
  body("categoryId")
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && value !== "" && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
        throw new Error("Category ID must be a valid UUID format or null.");
      }
      return true;
    })
];

export const taskIdParamValidator = [
  param("id")
    .isUUID().withMessage("Task ID in parameters must be a valid UUID.")
];
