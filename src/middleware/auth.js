import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_change_me_in_production_12345";

// Middleware to protect routes: verifies the JWT access token in the Authorization header
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access Denied: No token provided." });
    }

    const token = authHeader.split(" ")[1];
    
    // Decode the token payload
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Retrieve the user from database (omitting the hashed password)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Access Denied: Invalid user account." });
    }

    // Attach user metadata to request object for downstream routes to use
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Unauthorized: Access token has expired." });
    }
    return res.status(401).json({ error: "Unauthorized: Invalid token authentication." });
  }
};

// Middleware to authorize based on user role (e.g. USER, ADMIN)
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to roles: [${allowedRoles.join(", ")}]` });
    }

    next();
  };
};
