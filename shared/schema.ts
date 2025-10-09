import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordRecords = pgTable("password_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  password: text("password").notNull(),
  description: text("description"),
  userType: text("user_type").default("gmail"),
  starred: boolean("starred").default(false).notNull(),
  // Soft delete fields for Trash
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const historyEvents = pgTable("history_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  details: text("details"), // JSON string
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  hasCompletedOnboarding: true,
  createdAt: true,
}).extend({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const insertPasswordRecordSchema = createInsertSchema(passwordRecords).pick({
  email: true,
  password: true,
  description: true,
  starred: true,
  userType: true,
}).extend({
  email: z.string().min(1, "Email/Username is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  description: z.string().max(200, "Description cannot exceed 200 characters").optional(),
  starred: z.boolean().optional(),
  userType: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.string().datetime().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});



export const onboardingCompleteSchema = z.object({
  hasCompletedOnboarding: z.boolean(),
});

export const insertHistoryEventSchema = createInsertSchema(historyEvents).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  type: z.string().min(1, "Type is required"),
  summary: z.string().min(1, "Summary is required"),
  details: z.string().optional(),
  timestamp: z.coerce.date(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPasswordRecord = z.infer<typeof insertPasswordRecordSchema>;
export type PasswordRecord = typeof passwordRecords.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type OnboardingData = z.infer<typeof onboardingCompleteSchema>;
export type InsertHistoryEvent = z.infer<typeof insertHistoryEventSchema>;
export type HistoryEvent = typeof historyEvents.$inferSelect;
