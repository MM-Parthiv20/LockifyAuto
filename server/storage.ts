import { type User, type InsertUser, type PasswordRecord, type InsertPasswordRecord } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnboarding(userId: string, hasCompletedOnboarding: boolean): Promise<User | undefined>;
  
  // Password record methods
  getPasswordRecords(userId: string): Promise<PasswordRecord[]>;
  getPasswordRecord(id: string, userId: string): Promise<PasswordRecord | undefined>;
  createPasswordRecord(record: InsertPasswordRecord & { userId: string }): Promise<PasswordRecord>;
  updatePasswordRecord(id: string, record: Partial<InsertPasswordRecord>, userId: string): Promise<PasswordRecord | undefined>;
  deletePasswordRecord(id: string, userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private passwordRecords: Map<string, PasswordRecord>;

  constructor() {
    this.users = new Map();
    this.passwordRecords = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = { 
      ...insertUser, 
      id, 
      password: hashedPassword,
      hasCompletedOnboarding: false,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getPasswordRecords(userId: string): Promise<PasswordRecord[]> {
    return Array.from(this.passwordRecords.values()).filter(
      (record) => record.userId === userId
    );
  }

  async getPasswordRecord(id: string, userId: string): Promise<PasswordRecord | undefined> {
    const record = this.passwordRecords.get(id);
    return record?.userId === userId ? record : undefined;
  }

  async createPasswordRecord(record: InsertPasswordRecord & { userId: string }): Promise<PasswordRecord> {
    const id = randomUUID();
    const now = new Date();
    const passwordRecord: PasswordRecord = {
      id,
      userId: record.userId,
      email: record.email,
      password: record.password,
      description: record.description || null,
      createdAt: now,
      updatedAt: now,
    };
    this.passwordRecords.set(id, passwordRecord);
    return passwordRecord;
  }

  async updatePasswordRecord(
    id: string, 
    record: Partial<InsertPasswordRecord>, 
    userId: string
  ): Promise<PasswordRecord | undefined> {
    const existing = this.passwordRecords.get(id);
    if (!existing || existing.userId !== userId) {
      return undefined;
    }

    const updated: PasswordRecord = {
      ...existing,
      ...record,
      updatedAt: new Date(),
    };
    this.passwordRecords.set(id, updated);
    return updated;
  }

  async deletePasswordRecord(id: string, userId: string): Promise<boolean> {
    const record = this.passwordRecords.get(id);
    if (!record || record.userId !== userId) {
      return false;
    }
    return this.passwordRecords.delete(id);
  }



  async updateUserOnboarding(userId: string, hasCompletedOnboarding: boolean): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      hasCompletedOnboarding,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
}

export const storage = new MemStorage();
