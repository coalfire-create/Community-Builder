import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const allowedStudentIdsTable = pgTable("allowed_student_ids", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AllowedStudentId = typeof allowedStudentIdsTable.$inferSelect;
