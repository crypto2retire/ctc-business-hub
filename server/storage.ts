import {
  customers, jobs, scheduleSlots, communications, invoices, invoiceLineItems, squareImports,
  settings, analyticsCache, users, competitors, aiInsights,
  type Customer, type InsertCustomer,
  type Job, type InsertJob,
  type ScheduleSlot, type InsertScheduleSlot,
  type Communication, type InsertCommunication,
  type Invoice, type InsertInvoice,
  type InvoiceLineItem, type InsertLineItem,
  type SquareImport, type InsertSquareImport,
  type User, type InsertUser,
  type Competitor, type InsertCompetitor,
  type AIInsight, type InsertAIInsight,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  getCustomerBySquareId(squareId: string): Promise<Customer | undefined>;

  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  getJobsByCustomer(customerId: number): Promise<Job[]>;
  createJob(data: InsertJob): Promise<Job>;
  updateJob(id: number, data: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;

  // Schedule Slots
  getSlots(date?: string): Promise<ScheduleSlot[]>;
  createSlot(data: InsertScheduleSlot): Promise<ScheduleSlot>;
  updateSlot(id: number, data: Partial<InsertScheduleSlot>): Promise<ScheduleSlot | undefined>;

  // Communications
  getCommunications(jobId?: number, customerId?: number): Promise<Communication[]>;
  createCommunication(data: InsertCommunication): Promise<Communication>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByCustomer(customerId: number): Promise<Invoice[]>;
  getInvoicesByJob(jobId: number): Promise<Invoice[]>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getNextInvoiceNumber(): Promise<string>;

  // Invoice Line Items
  getLineItems(invoiceId: number): Promise<InvoiceLineItem[]>;
  createLineItem(data: InsertLineItem): Promise<InvoiceLineItem>;
  updateLineItem(id: number, data: Partial<InsertLineItem>): Promise<InvoiceLineItem | undefined>;
  deleteLineItem(id: number): Promise<boolean>;
  deleteLineItemsByInvoice(invoiceId: number): Promise<void>;

  // Square
  getSquareImports(): Promise<SquareImport[]>;
  createSquareImport(data: InsertSquareImport): Promise<SquareImport>;
  updateSquareImport(id: number, data: Partial<InsertSquareImport>): Promise<SquareImport | undefined>;
  getSquareSettings(): Promise<{ accessToken: string; connected: boolean } | null>;
  setSquareSettings(accessToken: string): Promise<void>;

  // Settings (key-value)
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  // Analytics Cache
  getCachedAnalytics(source: string, endpoint: string): Promise<any | null>;
  setCachedAnalytics(source: string, endpoint: string, data: any, ttlMinutes: number): Promise<void>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;

  // Stats
  getStats(): Promise<{
    activeJobs: number;
    completedThisMonth: number;
    revenueThisMonth: number;
    pendingEstimates: number;
    invoicesDue: number;
    invoicesPaid: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // ── Customers ─────────────────────────────────────────────────────────────────
  async getCustomers() {
    return db.select().from(customers);
  }
  async getCustomer(id: number) {
    const [c] = await db.select().from(customers).where(eq(customers.id, id));
    return c;
  }
  async createCustomer(data: InsertCustomer) {
    const [c] = await db.insert(customers).values(data).returning();
    return c;
  }
  async updateCustomer(id: number, data: Partial<InsertCustomer>) {
    const [c] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return c;
  }
  async deleteCustomer(id: number) {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }
  async getCustomerBySquareId(squareId: string) {
    const [c] = await db.select().from(customers).where(eq(customers.squareCustomerId, squareId));
    return c;
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────────
  async getJobs() {
    return db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }
  async getJob(id: number) {
    const [j] = await db.select().from(jobs).where(eq(jobs.id, id));
    return j;
  }
  async getJobsByCustomer(customerId: number) {
    return db.select().from(jobs).where(eq(jobs.customerId, customerId));
  }
  async createJob(data: InsertJob) {
    const [j] = await db.insert(jobs).values(data).returning();
    return j;
  }
  async updateJob(id: number, data: Partial<InsertJob>) {
    const [j] = await db.update(jobs).set(data).where(eq(jobs.id, id)).returning();
    return j;
  }
  async deleteJob(id: number) {
    const result = await db.delete(jobs).where(eq(jobs.id, id)).returning();
    return result.length > 0;
  }

  // ── Schedule Slots ────────────────────────────────────────────────────────────
  async getSlots(date?: string) {
    if (date) {
      return db.select().from(scheduleSlots).where(eq(scheduleSlots.date, date));
    }
    return db.select().from(scheduleSlots);
  }
  async createSlot(data: InsertScheduleSlot) {
    const [s] = await db.insert(scheduleSlots).values(data).returning();
    return s;
  }
  async updateSlot(id: number, data: Partial<InsertScheduleSlot>) {
    const [s] = await db.update(scheduleSlots).set(data).where(eq(scheduleSlots.id, id)).returning();
    return s;
  }

  // ── Communications ────────────────────────────────────────────────────────────
  async getCommunications(jobId?: number, customerId?: number) {
    let q = db.select().from(communications).$dynamic();
    if (jobId) q = q.where(eq(communications.jobId, jobId));
    else if (customerId) q = q.where(eq(communications.customerId, customerId));
    return q.orderBy(desc(communications.sentAt));
  }
  async createCommunication(data: InsertCommunication) {
    const [c] = await db.insert(communications).values(data).returning();
    return c;
  }

  // ── Invoices ──────────────────────────────────────────────────────────────────
  async getInvoices() {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }
  async getInvoice(id: number) {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    return inv;
  }
  async getInvoicesByCustomer(customerId: number) {
    return db.select().from(invoices).where(eq(invoices.customerId, customerId));
  }
  async getInvoicesByJob(jobId: number) {
    return db.select().from(invoices).where(eq(invoices.jobId, jobId));
  }
  async createInvoice(data: InsertInvoice) {
    const [inv] = await db.insert(invoices).values(data).returning();
    return inv;
  }
  async updateInvoice(id: number, data: Partial<InsertInvoice>) {
    const [inv] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return inv;
  }
  async deleteInvoice(id: number) {
    const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return result.length > 0;
  }
  async getNextInvoiceNumber() {
    // Use a sequence-style query: count existing invoices + start at 1001
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const count = Number(row?.count ?? 0);
    return `INV-${1001 + count}`;
  }

  // ── Line Items ────────────────────────────────────────────────────────────────
  async getLineItems(invoiceId: number) {
    return db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
  }
  async createLineItem(data: InsertLineItem) {
    const [li] = await db.insert(invoiceLineItems).values(data).returning();
    return li;
  }
  async updateLineItem(id: number, data: Partial<InsertLineItem>) {
    const [li] = await db.update(invoiceLineItems).set(data).where(eq(invoiceLineItems.id, id)).returning();
    return li;
  }
  async deleteLineItem(id: number) {
    const result = await db.delete(invoiceLineItems).where(eq(invoiceLineItems.id, id)).returning();
    return result.length > 0;
  }
  async deleteLineItemsByInvoice(invoiceId: number) {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
  }

  // ── Square ─────────────────────────────────────────────────────────────────────
  async getSquareImports() {
    return db.select().from(squareImports).orderBy(desc(squareImports.startedAt));
  }
  async createSquareImport(data: InsertSquareImport) {
    const [si] = await db.insert(squareImports).values(data).returning();
    return si;
  }
  async updateSquareImport(id: number, data: Partial<InsertSquareImport>) {
    const [si] = await db.update(squareImports).set(data).where(eq(squareImports.id, id)).returning();
    return si;
  }
  async getSquareSettings() {
    // Check DB settings table first, then fall back to env var
    const dbToken = await this.getSetting("square_access_token");
    const token = (dbToken && dbToken.length > 0) ? dbToken : process.env.SQUARE_ACCESS_TOKEN;
    if (token && token.length > 0) return { accessToken: token, connected: true };
    return null;
  }
  async setSquareSettings(accessToken: string) {
    await this.setSetting("square_access_token", accessToken);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const allJobs = await db.select().from(jobs);
    const allInvoices = await db.select().from(invoices);

    const activeJobs = allJobs.filter(j => j.status === "in_progress" || j.status === "scheduled").length;
    const completedThisMonth = allJobs.filter(j => {
      if (j.status !== "completed" || !j.createdAt) return false;
      return new Date(j.createdAt) >= new Date(monthStart);
    }).length;
    const revenueThisMonth = allInvoices
      .filter(i => i.status === "paid" && i.paidAt && new Date(i.paidAt) >= new Date(monthStart))
      .reduce((sum, i) => sum + (i.total ?? 0), 0);
    const pendingEstimates = allJobs.filter(j => j.status === "lead").length;
    const invoicesDue = allInvoices.filter(i => i.status === "sent" || i.status === "overdue").length;
    const invoicesPaid = allInvoices.filter(i => i.status === "paid").length;

    return { activeJobs, completedThisMonth, revenueThisMonth, pendingEstimates, invoicesDue, invoicesPaid };
  }

  // ── Settings ─────────────────────────────────────────────────────────────────
  async getSetting(key: string) {
    const [row] = await db.select().from(settings).where(eq(settings.key, key));
    return row?.value ?? null;
  }
  async setSetting(key: string, value: string) {
    const existing = await this.getSetting(key);
    if (existing !== null) {
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  // ── Analytics Cache ──────────────────────────────────────────────────────────
  async getCachedAnalytics(source: string, endpoint: string) {
    const now = new Date();
    const [row] = await db.select().from(analyticsCache)
      .where(and(
        eq(analyticsCache.source, source),
        eq(analyticsCache.endpoint, endpoint),
        gte(analyticsCache.expiresAt, now),
      ))
      .orderBy(desc(analyticsCache.fetchedAt))
      .limit(1);
    return row?.data ?? null;
  }
  async setCachedAnalytics(source: string, endpoint: string, data: any, ttlMinutes: number) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    // Delete old entries for this source+endpoint
    await db.delete(analyticsCache).where(and(
      eq(analyticsCache.source, source),
      eq(analyticsCache.endpoint, endpoint),
    ));
    await db.insert(analyticsCache).values({ source, endpoint, data, fetchedAt: now, expiresAt });
  }

  // ── Users ─────────────────────────────────────────────────────────────────────
  async getUserByEmail(email: string) {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u;
  }
  async getUserById(id: number) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async createUser(data: InsertUser) {
    const [u] = await db.insert(users).values(data).returning();
    return u;
  }

  // ── Competitors ─────────────────────────────────────────────────────────────
  async getCompetitors() {
    return db.select().from(competitors).where(eq(competitors.isActive, true));
  }
  async getCompetitor(id: number) {
    const [c] = await db.select().from(competitors).where(eq(competitors.id, id));
    return c;
  }
  async createCompetitor(data: InsertCompetitor) {
    const [c] = await db.insert(competitors).values(data).returning();
    return c;
  }
  async updateCompetitor(id: number, data: Partial<InsertCompetitor>) {
    const [c] = await db.update(competitors).set(data).where(eq(competitors.id, id)).returning();
    return c;
  }
  async deleteCompetitor(id: number) {
    const result = await db.update(competitors).set({ isActive: false }).where(eq(competitors.id, id)).returning();
    return result.length > 0;
  }

  // ── AI Insights ─────────────────────────────────────────────────────────────
  async getAIInsights(limit = 50) {
    return db.select().from(aiInsights).orderBy(desc(aiInsights.generatedAt)).limit(limit);
  }
  async updateAIInsight(id: number, data: Partial<InsertAIInsight>) {
    const [i] = await db.update(aiInsights).set(data as any).where(eq(aiInsights.id, id)).returning();
    return i;
  }
}

export const storage = new DatabaseStorage();
