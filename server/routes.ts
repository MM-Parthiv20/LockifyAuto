import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPasswordRecordSchema, loginSchema, onboardingCompleteSchema } from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// JWT auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: '24h'
      });

      res.json({ 
        user: { id: user.id, username: user.username, hasCompletedOnboarding: user.hasCompletedOnboarding }, 
        token 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(loginData.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: '24h'
      });

      res.json({ 
        user: { id: user.id, username: user.username, hasCompletedOnboarding: user.hasCompletedOnboarding }, 
        token 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ id: user.id, username: user.username, hasCompletedOnboarding: user.hasCompletedOnboarding });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });



  // Update onboarding status
  app.put("/api/auth/onboarding", authenticateToken, async (req: any, res) => {
    try {
      const { hasCompletedOnboarding } = onboardingCompleteSchema.parse(req.body);
      const updatedUser = await storage.updateUserOnboarding(req.user.userId, hasCompletedOnboarding);
      if (!updatedUser) return res.status(404).json({ message: "User not found" });
      res.json({ hasCompletedOnboarding: updatedUser.hasCompletedOnboarding });
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Password records routes
  app.get("/api/records", authenticateToken, async (req: any, res) => {
    try {
      const records = await storage.getPasswordRecords(req.user.userId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch records" });
    }
  });

  app.post("/api/records", authenticateToken, async (req: any, res) => {
    try {
      const recordData = insertPasswordRecordSchema.parse(req.body);
      const record = await storage.createPasswordRecord({
        ...recordData,
        userId: req.user.userId
      });
      res.status(201).json(record);
    } catch (error: any) {
      if (error.issues) {
        res.status(400).json({ message: "Validation failed", errors: error.issues });
      } else {
        res.status(400).json({ message: "Invalid input data" });
      }
    }
  });

  app.put("/api/records/:id", authenticateToken, async (req: any, res) => {
    try {
      const recordData = insertPasswordRecordSchema.partial().parse(req.body);
      const updatedRecord = await storage.updatePasswordRecord(
        req.params.id, 
        recordData, 
        req.user.userId
      );
      
      if (!updatedRecord) {
        return res.status(404).json({ message: "Record not found" });
      }

      res.json(updatedRecord);
    } catch (error: any) {
      if (error.issues) {
        res.status(400).json({ message: "Validation failed", errors: error.issues });
      } else {
        res.status(400).json({ message: "Invalid input data" });
      }
    }
  });

  app.delete("/api/records/:id", authenticateToken, async (req: any, res) => {
    try {
      const deleted = await storage.deletePasswordRecord(req.params.id, req.user.userId);
      if (!deleted) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.json({ message: "Record deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete record" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
