import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sshConnections = pgTable("ssh_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").default(22),
  username: text("username").notNull(),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const sshKeys = pgTable("ssh_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(), // e.g., "My Laptop", "Work Desktop"
  publicKey: text("public_key").notNull(), // The actual public key content
  fingerprint: text("fingerprint").notNull(), // SHA256 fingerprint for identification
  keyType: text("key_type").notNull().default('rsa'), // rsa, ed25519, etc.
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const commands = pgTable("commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").references(() => sshConnections.id),
  plainTextInput: text("plain_text_input").notNull(),
  generatedCommand: text("generated_command").notNull(),
  aiExplanation: text("ai_explanation"),
  output: text("output"),
  exitCode: integer("exit_code"),
  status: text("status").notNull().default('pending'), // pending, running, success, error
  executionTime: integer("execution_time"), // in milliseconds
  createdAt: timestamp("created_at").default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSSHConnectionSchema = createInsertSchema(sshConnections).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertSSHKeySchema = createInsertSchema(sshKeys).omit({
  id: true,
  userId: true,
  fingerprint: true,
  lastUsed: true,
  createdAt: true,
});

export const insertCommandSchema = createInsertSchema(commands).omit({
  id: true,
  output: true,
  exitCode: true,
  status: true,
  executionTime: true,
  createdAt: true,
  completedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SSHConnection = typeof sshConnections.$inferSelect;
export type InsertSSHConnection = z.infer<typeof insertSSHConnectionSchema>;
export type SSHKey = typeof sshKeys.$inferSelect;
export type InsertSSHKey = z.infer<typeof insertSSHKeySchema>;
export type Command = typeof commands.$inferSelect;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
