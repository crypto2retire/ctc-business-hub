import { pgTable, text, integer, real, boolean, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  source: text("source"),
  squareCustomerId: text("square_customer_id"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  title: text("title").notNull(),
  serviceType: text("service_type"),
  status: text("status").notNull().default("lead"),
  estimateLow: real("estimate_low"),
  estimateHigh: real("estimate_high"),
  finalPrice: real("final_price"),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  notes: text("notes"),
  leadSource: text("lead_source"),
  estimateRefId: text("estimate_ref_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// ── Schedule Slots ────────────────────────────────────────────────────────────
export const scheduleSlots = pgTable("schedule_slots", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  jobId: integer("job_id"),
});

export const insertScheduleSlotSchema = createInsertSchema(scheduleSlots).omit({ id: true });
export type InsertScheduleSlot = z.infer<typeof insertScheduleSlotSchema>;
export type ScheduleSlot = typeof scheduleSlots.$inferSelect;

// ── Communications ────────────────────────────────────────────────────────────
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"),
  customerId: integer("customer_id"),
  type: text("type").notNull(),
  direction: text("direction").notNull().default("outbound"),
  subject: text("subject"),
  message: text("message").notNull(),
  template: text("template"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({ id: true, sentAt: true });
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: integer("customer_id").notNull(),
  jobId: integer("job_id"),
  status: text("status").notNull().default("draft"),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  subtotal: real("subtotal").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  amountPaid: real("amount_paid").notNull().default(0),
  balanceDue: real("balance_due").notNull().default(0),
  notes: text("notes"),
  paymentMethod: text("payment_method"),
  squarePaymentId: text("square_payment_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, paidAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// ── Invoice Line Items ────────────────────────────────────────────────────────
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  amount: real("amount").notNull().default(0),
});

export const insertLineItemSchema = createInsertSchema(invoiceLineItems).omit({ id: true });
export type InsertLineItem = z.infer<typeof insertLineItemSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

// ── Square Integration ────────────────────────────────────────────────────────
export const squareImports = pgTable("square_imports", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  recordsImported: integer("records_imported").notNull().default(0),
  totalRecords: integer("total_records").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
});

export const insertSquareImportSchema = createInsertSchema(squareImports).omit({ id: true, startedAt: true, completedAt: true });
export type InsertSquareImport = z.infer<typeof insertSquareImportSchema>;
export type SquareImport = typeof squareImports.$inferSelect;

// ── Settings (Key-Value Store) ────────────────────────────────────────────────
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Setting = typeof settings.$inferSelect;

// ── Analytics Cache ───────────────────────────────────────────────────────────
export const analyticsCache = pgTable("analytics_cache", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),         // ga, gsc, ads, fb
  endpoint: text("endpoint").notNull(),     // overview, queries, etc.
  data: jsonb("data"),                      // cached JSON response
  fetchedAt: timestamp("fetched_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type AnalyticsCacheEntry = typeof analyticsCache.$inferSelect;

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
