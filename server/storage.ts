import { type User, type InsertUser, type PasswordRecord, type InsertPasswordRecord, type HistoryEvent, type InsertHistoryEvent } from "@shared/schema";
import bcrypt from "bcryptjs";
import { MongoClient, ServerApiVersion } from "mongodb";
import { randomUUID } from "crypto";

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
  
  // History methods
  getHistoryEvents(userId: string): Promise<HistoryEvent[]>;
  createHistoryEvent(event: InsertHistoryEvent & { userId: string }): Promise<HistoryEvent>;
  deleteHistoryEvents(userId: string): Promise<number>;
}

// Mongo-backed storage
class MongoStorage implements IStorage {
  private client: MongoClient;
  private ready: Promise<void>;
  private dbName: string;

  constructor(uri: string) {
    this.client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    const url = new URL(uri);
    // mongodb+srv doesn't include db in pathname reliably, allow override via env
    this.dbName = process.env.MONGO_DB_NAME || (url.pathname.replace(/^\//, "") || "recordDB");
    this.ready = this.client.connect().then(() => this.ensureIndexes());
  }

  private async ensureIndexes() {
    const db = this.client.db(this.dbName);
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    await db.collection("password_records").createIndex({ userId: 1 });
    await db.collection("history_events").createIndex({ userId: 1 });
    await db.collection("history_events").createIndex({ timestamp: -1 });
  }

  private async getDb() {
    await this.ready;
    return this.client.db(this.dbName);
  }

  async getUser(id: string): Promise<User | undefined> {
    const db = await this.getDb();
    const u = await db.collection<User>("users").findOne({ id });
    return u || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await this.getDb();
    const u = await db.collection<User>("users").findOne({ username });
    return u || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await this.getDb();
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = {
      id,
      username: insertUser.username,
      password: hashedPassword,
      hasCompletedOnboarding: false,
      createdAt: new Date(),
    } as unknown as User;
    await db.collection<User>("users").insertOne(user);
    return user;
  }

  async getPasswordRecords(userId: string): Promise<PasswordRecord[]> {
    const db = await this.getDb();
    return db.collection<PasswordRecord>("password_records").find({ userId }).toArray();
  }

  async getPasswordRecord(id: string, userId: string): Promise<PasswordRecord | undefined> {
    const db = await this.getDb();
    const r = await db.collection<PasswordRecord>("password_records").findOne({ id, userId });
    return r || undefined;
  }

  async createPasswordRecord(record: InsertPasswordRecord & { userId: string }): Promise<PasswordRecord> {
    const db = await this.getDb();
    const now = new Date();
    const rec: PasswordRecord = {
      id: crypto.randomUUID(),
      userId: record.userId,
      email: record.email,
      password: record.password,
      description: record.description || null,
      userType: (record as any).userType || "gmail",
      starred: (record as any).starred ?? false,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    } as unknown as PasswordRecord;
    await db.collection<PasswordRecord>("password_records").insertOne(rec);
    return rec;
  }

  async updatePasswordRecord(id: string, record: Partial<InsertPasswordRecord>, userId: string): Promise<PasswordRecord | undefined> {
    const db = await this.getDb();
    const existing = await db.collection<PasswordRecord>("password_records").findOne({ id, userId });
    if (!existing) return undefined;
    const updated: PasswordRecord = { ...(existing as any), ...(record as any), updatedAt: new Date() } as PasswordRecord;
    await db.collection<PasswordRecord>("password_records").updateOne({ id, userId }, { $set: updated });
    return updated;
  }

  async deletePasswordRecord(id: string, userId: string): Promise<boolean> {
    const db = await this.getDb();
    const res = await db.collection<PasswordRecord>("password_records").deleteOne({ id, userId });
    return res.deletedCount === 1;
  }

  async updateUserOnboarding(userId: string, hasCompletedOnboarding: boolean): Promise<User | undefined> {
    const db = await this.getDb();
    const res = await db.collection<User>("users").findOneAndUpdate(
      { id: userId },
      { $set: { hasCompletedOnboarding } },
      { returnDocument: "after" },
    );
    return res.value || undefined;
  }

  async getHistoryEvents(userId: string): Promise<HistoryEvent[]> {
    const db = await this.getDb();
    return db.collection<HistoryEvent>("history_events")
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(300)
      .toArray();
  }

  async createHistoryEvent(event: InsertHistoryEvent & { userId: string }): Promise<HistoryEvent> {
    const db = await this.getDb();
    const historyEvent: HistoryEvent = {
      id: crypto.randomUUID(),
      userId: event.userId,
      type: event.type,
      summary: event.summary,
      details: event.details || null,
      timestamp: event.timestamp,
      createdAt: new Date(),
    } as unknown as HistoryEvent;
    await db.collection<HistoryEvent>("history_events").insertOne(historyEvent);
    return historyEvent;
  }

  async deleteHistoryEvents(userId: string): Promise<number> {
    const db = await this.getDb();
    const result = await db.collection<HistoryEvent>("history_events").deleteMany({ userId });
    return result.deletedCount;
  }
}

// In-memory fallback storage (used if no valid Mongo URI is provided)
class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private passwordRecords: Map<string, PasswordRecord> = new Map();
  private historyEvents: Map<string, HistoryEvent> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = { 
      id, 
      username: insertUser.username,
      password: hashedPassword as any,
      hasCompletedOnboarding: false,
      createdAt: new Date(),
    } as unknown as User;
    this.users.set(id, user);
    return user;
  }

  async getPasswordRecords(userId: string): Promise<PasswordRecord[]> {
    return Array.from(this.passwordRecords.values()).filter((r) => r.userId === userId);
  }

  async getPasswordRecord(id: string, userId: string): Promise<PasswordRecord | undefined> {
    const r = this.passwordRecords.get(id);
    return r && r.userId === userId ? r : undefined;
  }

  async createPasswordRecord(record: InsertPasswordRecord & { userId: string }): Promise<PasswordRecord> {
    const now = new Date();
    const rec: PasswordRecord = {
      id: randomUUID(),
      userId: record.userId,
      email: record.email,
      password: record.password,
      description: record.description || null,
      userType: (record as any).userType || "gmail",
      starred: (record as any).starred ?? false,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    } as unknown as PasswordRecord;
    this.passwordRecords.set(rec.id, rec);
    return rec;
  }

  async updatePasswordRecord(id: string, record: Partial<InsertPasswordRecord>, userId: string): Promise<PasswordRecord | undefined> {
    const existing = this.passwordRecords.get(id);
    if (!existing || existing.userId !== userId) return undefined;
    const updated: PasswordRecord = { ...(existing as any), ...(record as any), updatedAt: new Date() } as PasswordRecord;
    this.passwordRecords.set(id, updated);
    return updated;
  }

  async deletePasswordRecord(id: string, userId: string): Promise<boolean> {
    const existing = this.passwordRecords.get(id);
    if (!existing || existing.userId !== userId) return false;
    return this.passwordRecords.delete(id);
  }

  async updateUserOnboarding(userId: string, hasCompletedOnboarding: boolean): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = { ...(user as any), hasCompletedOnboarding } as User;
    this.users.set(userId, updated);
    return updated;
  }

  async getHistoryEvents(userId: string): Promise<HistoryEvent[]> {
    return Array.from(this.historyEvents.values())
      .filter((e) => e.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 300);
  }

  async createHistoryEvent(event: InsertHistoryEvent & { userId: string }): Promise<HistoryEvent> {
    const historyEvent: HistoryEvent = {
      id: randomUUID(),
      userId: event.userId,
      type: event.type,
      summary: event.summary,
      details: event.details || null,
      timestamp: event.timestamp,
      createdAt: new Date(),
    } as unknown as HistoryEvent;
    this.historyEvents.set(historyEvent.id, historyEvent);
    return historyEvent;
  }

  async deleteHistoryEvents(userId: string): Promise<number> {
    const toDelete = Array.from(this.historyEvents.values()).filter((e) => e.userId === userId);
    toDelete.forEach((e) => this.historyEvents.delete(e.id));
    return toDelete.length;
  }
}

const mongoUri = process.env.MONGO_URI || "";
export const storage: IStorage = /^mongodb(\+srv)?:\/\//.test(mongoUri)
  ? new MongoStorage(mongoUri)
  : new MemStorage();
