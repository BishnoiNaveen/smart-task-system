import { body, query } from "express-validator";
import { prisma } from "../config/db.js";

export const registerValidator = [
  body("email")
    .isEmail().withMessage("Provide a valid email address.")
    .normalizeEmail()
    .custom(async (email) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        throw new Error("Email address is already registered.");
      }
      return true;
    }),
  body("password")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long."),
  body("name")
    .optional()
    .trim()
    .notEmpty().withMessage("Name cannot be empty if provided.")
];

export const loginValidator = [
  body("email")
    .isEmail().withMessage("Provide a valid email address.")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required.")
];

export const forgotPasswordValidator = [
  body("email")
    .isEmail().withMessage("Provide a valid email address.")
    .normalizeEmail()
];

export const resetPasswordValidator = [
  body("token")
    .notEmpty().withMessage("Reset token is required."),
  body("password")
    .isLength({ min: 6 }).withMessage("New password must be at least 6 characters long.")
];

export const verifyEmailValidator = [
  query("token")
    .notEmpty().withMessage("Verification token is required in query params.")
];
