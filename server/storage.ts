import { type User, type InsertUser, type PasswordRecord, type InsertPasswordRecord } from "@shared/schema";
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
      starred: (record as any).starred ?? false,
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
}

// In-memory fallback storage (used if no valid Mongo URI is provided)
class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private passwordRecords: Map<string, PasswordRecord> = new Map();

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
      starred: (record as any).starred ?? false,
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
}

const mongoUri = process.env.MONGO_URI || "";
export const storage: IStorage = /^mongodb(\+srv)?:\/\//.test(mongoUri)
  ? new MongoStorage(mongoUri)
  : new MemStorage();
