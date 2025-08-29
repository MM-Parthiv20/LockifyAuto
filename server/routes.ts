import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPasswordRecordSchema, loginSchema, onboardingCompleteSchema } from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Open app mode: use a default public user id for all record operations
const DEFAULT_PUBLIC_USER_ID = "public";

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

  app.get("/api/auth/me", async (req: any, res) => {
    try {
      // Open app: no auth, return a fixed public user
      res.json({ id: DEFAULT_PUBLIC_USER_ID, username: "Public", hasCompletedOnboarding: true });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });



  // Update onboarding status
  app.put("/api/auth/onboarding", async (req: any, res) => {
    try {
      const { hasCompletedOnboarding } = onboardingCompleteSchema.parse(req.body);
      res.json({ hasCompletedOnboarding });
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Password records routes
  app.get("/api/records", async (req: any, res) => {
    try {
      const records = await storage.getPasswordRecords(DEFAULT_PUBLIC_USER_ID);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch records" });
    }
  });

  app.post("/api/records", async (req: any, res) => {
    try {
      const recordData = insertPasswordRecordSchema.parse(req.body);
      const record = await storage.createPasswordRecord({
        ...recordData,
        userId: DEFAULT_PUBLIC_USER_ID
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

  app.put("/api/records/:id", async (req: any, res) => {
    try {
      const recordData = insertPasswordRecordSchema.partial().parse(req.body);
      const updatedRecord = await storage.updatePasswordRecord(
        req.params.id, 
        recordData, 
        DEFAULT_PUBLIC_USER_ID
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

  app.delete("/api/records/:id", async (req: any, res) => {
    try {
      const deleted = await storage.deletePasswordRecord(req.params.id, DEFAULT_PUBLIC_USER_ID);
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
