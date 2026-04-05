import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const domainEnum = pgEnum("domain", ["Boss", "Colleague", "Customer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Emotional habit entries — one row per guided cycle entry.
 * Each entry captures the full emotional cycle:
 * Domain → Goal → Intention → Trigger → Emotion Felt → Behaviour → Alternate Response
 */
export const emotionalEntries = pgTable("emotional_entries", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  /** Professional domain context */
  domain: domainEnum("domain").notNull(),
  /** Communication goal for the interaction */
  goal: text("goal").notNull(),
  /** NVC-based intention set before the interaction */
  intention: text("intention").notNull(),
  /** The specific trigger point that activated the emotional response */
  trigger: text("trigger").notNull(),
  /** The emotion felt in response to the trigger */
  emotionFelt: varchar("emotionFelt", { length: 128 }).notNull(),
  /** The default behavioural response (fight/flee/freeze/fawn) */
  behaviour: text("behaviour").notNull(),
  /** The planned alternate response for next time */
  alternateResponse: text("alternateResponse").notNull(),
  /** Optional reflection notes */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmotionalEntry = typeof emotionalEntries.$inferSelect;
export type InsertEmotionalEntry = typeof emotionalEntries.$inferInsert;

export const copingStrategies = pgTable("coping_strategies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: text("type").notNull(), // 'breaking' | 'building'
  content: text("content").notNull(),
  source: text("source").notNull().default("user"), // 'ai' | 'user'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CopingStrategy = typeof copingStrategies.$inferSelect;
