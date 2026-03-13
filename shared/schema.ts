import { pgTable, text, integer, real, boolean, serial, timestamp } from "drizzle-orm/pg-core";
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
  source: text("source"), // lead source
  squareCustomerId: text("square_customer_id"), // imported from Square
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
  status: text("status").notNull().default("lead"), // lead | scheduled | in_progress | completed | cancelled
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
  type: text("type").notNull(), // sms | email
  direction: text("direction").notNull().default("outbound"), // outbound | inbound
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
  status: text("status").notNull().default("draft"), // draft | sent | paid | overdue | cancelled
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
  paymentMethod: text("payment_method"), // cash | check | square | venmo | other
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
  type: text("type").notNull(), // customers | orders
  status: text("status").notNull().default("pending"), // pending | running | completed | failed
  recordsImported: integer("records_imported").notNull().default(0),
  totalRecords: integer("total_records").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
});

export const insertSquareImportSchema = createInsertSchema(squareImports).omit({ id: true, startedAt: true, completedAt: true });
export type InsertSquareImport = z.infer<typeof insertSquareImportSchema>;
export type SquareImport = typeof squareImports.$inferSelect;
