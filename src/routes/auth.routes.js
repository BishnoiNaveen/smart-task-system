import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller.js";
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator
} from "../validators/auth.js";
import { validateFields } from "../middleware/validator.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Route: Register new account
router.post("/register", registerValidator, validateFields, register);

// Route: Login and acquire session tokens
router.post("/login", loginValidator, validateFields, login);

// Route: Logout (Requires active authorization session)
router.post("/logout", authenticate, logout);

// Route: Rotate access token
router.post("/refresh-token", refreshToken);

// Route: Verify email token
router.get("/verify-email", verifyEmailValidator, validateFields, verifyEmail);

// Route: Request password reset link
router.post("/forgot-password", forgotPasswordValidator, validateFields, forgotPassword);

// Route: Set new password using token
router.post("/reset-password", resetPasswordValidator, validateFields, resetPassword);

export default router;
