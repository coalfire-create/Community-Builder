import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["student", "council", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  role: userRoleEnum("role").notNull().default("student"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
