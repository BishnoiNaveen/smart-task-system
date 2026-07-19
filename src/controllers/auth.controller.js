import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { sendEmail } from "../utils/mailer.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_change_me_in_production_12345";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "super_secret_refresh_key_change_me_in_production_54321";

// Helper to generate access tokens (shorter expiry, e.g. 15 minutes)
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
};

// Helper to generate refresh tokens (longer expiry, e.g. 7 days)
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

// 1. User Registration Handler
export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Default first user registered on a clean DB to ADMIN role
    const usersCount = await prisma.user.count();
    const role = usersCount === 0 ? "ADMIN" : "USER";

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role,
        verificationToken,
        isVerified: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // Send Verification Email
    const verificationUrl = `http://localhost:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}`;
    const emailHtml = `
      <h3>Welcome to Smart Task System!</h3>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" target="_blank">${verificationUrl}</a>
    `;

    try {
      await sendEmail({
        to: email,
        subject: "Verify Your Email Address",
        html: emailHtml
      });
    } catch (mailErr) {
      console.error("Verification email sending failed:", mailErr.message);
    }

    res.status(201).json({
      message: "User registered successfully. Verification email dispatched.",
      user
    });
  } catch (error) {
    next(error);
  }
};

// 2. User Login Handler
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password credentials." });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save the refresh token in the database to enable token rotation/revocation
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.status(200).json({
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. User Logout Handler
export const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Revoke and clear the refresh token in the database
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });

    res.status(200).json({ message: "Logout successful." });
  } catch (error) {
    next(error);
  }
};

// 4. Token Rotation Handler: issues fresh access tokens using a valid refresh token
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Refresh token is required." });
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    
    // Check if the user exists and the token matches the active db session
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ error: "Invalid or expired refresh session." });
    }

    const newAccessToken = generateAccessToken(user.id);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired refresh session." });
  }
};

// 5. Email Verification Handler
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null
      }
    });

    res.status(200).json({ message: "Email verified successfully! You can now log in." });
  } catch (error) {
    next(error);
  }
};

// 6. Forgot Password Request Handler
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({ message: "If the email exists, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 Hour expiry

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      }
    });

    const resetUrl = `http://localhost:${process.env.PORT || 5000}/api/auth/reset-password?token=${resetToken}`;
    const emailHtml = `
      <p>You requested a password reset. Click the link below to configure a new password:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>This link expires in 1 hour.</p>
    `;

    try {
      await sendEmail({
        to: email,
        subject: "Password Reset Request",
        html: emailHtml
      });
    } catch (mailErr) {
      console.error("Password reset email dispatch failed:", mailErr.message);
    }

    res.status(200).json({ message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
};

// 7. Reset Password Handler
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date() // Not expired yet
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired password reset token." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshToken: null // Revoke existing sessions for security
      }
    });

    res.status(200).json({ message: "Password updated successfully. Please log in with your new password." });
  } catch (error) {
    next(error);
  }
};
