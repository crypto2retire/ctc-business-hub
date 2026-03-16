import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertJobSchema, insertCommunicationSchema, insertInvoiceSchema, insertLineItemSchema } from "@shared/schema";
import {
  getGAOverview, getGADailySessions, getGATopPages, getGATrafficSources,
  getGSCPerformance, getGSCQueries, getGSCPages,
  getFBPageInsights, getFBRecentPosts,
  getAnalyticsStatus,
} from "./analytics";

export function registerRoutes(httpServer: Server, app: Express) {
  // ── Stats ──────────────────────────────────────────────────────────────────────
  app.get("/api/stats/overview", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // ── Customers ──────────────────────────────────────────────────────────────────
  app.get("/api/customers", async (_req, res) => {
    const all = await storage.getCustomers();
    res.json(all);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const c = await storage.getCustomer(id);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });

  app.post("/api/customers", async (req, res) => {
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const c = await storage.createCustomer(parsed.data);
    res.status(201).json(c);
  });

  app.patch("/api/customers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateCustomer(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteCustomer(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ── Jobs ───────────────────────────────────────────────────────────────────────
  app.get("/api/jobs", async (req, res) => {
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    const jobs = customerId ? await storage.getJobsByCustomer(customerId) : await storage.getJobs();
    res.json(jobs);
  });

  app.get("/api/jobs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const j = await storage.getJob(id);
    if (!j) return res.status(404).json({ error: "Not found" });
    res.json(j);
  });

  app.post("/api/jobs", async (req, res) => {
    const parsed = insertJobSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const j = await storage.createJob(parsed.data);
    res.status(201).json(j);
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateJob(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteJob(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ── Schedule Slots ─────────────────────────────────────────────────────────────
  app.get("/api/schedule-slots", async (req, res) => {
    const date = req.query.date as string | undefined;
    const slots = await storage.getSlots(date);
    res.json(slots);
  });

  app.post("/api/schedule-slots", async (req, res) => {
    const s = await storage.createSlot(req.body);
    res.status(201).json(s);
  });

  app.patch("/api/schedule-slots/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateSlot(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // ── Communications ────────────────────────────────────────────────────────────
  app.get("/api/communications", async (req, res) => {
    const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    const comms = await storage.getCommunications(jobId, customerId);
    res.json(comms);
  });

  app.post("/api/communications", async (req, res) => {
    const parsed = insertCommunicationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const c = await storage.createCommunication(parsed.data);
    res.status(201).json(c);
  });

  // ── Invoices ───────────────────────────────────────────────────────────────────
  app.get("/api/invoices", async (req, res) => {
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
    let invoices;
    if (customerId) invoices = await storage.getInvoicesByCustomer(customerId);
    else if (jobId) invoices = await storage.getInvoicesByJob(jobId);
    else invoices = await storage.getInvoices();
    res.json(invoices);
  });

  app.get("/api/invoices/next-number", async (_req, res) => {
    const num = await storage.getNextInvoiceNumber();
    res.json({ invoiceNumber: num });
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const inv = await storage.getInvoice(id);
    if (!inv) return res.status(404).json({ error: "Not found" });
    res.json(inv);
  });

  app.post("/api/invoices", async (req, res) => {
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const inv = await storage.createInvoice(parsed.data);
    res.status(201).json(inv);
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateInvoice(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteInvoice(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // Mark invoice as paid
  app.post("/api/invoices/:id/mark-paid", async (req, res) => {
    const id = parseInt(req.params.id);
    const { paymentMethod, squarePaymentId } = req.body;
    const updated = await storage.updateInvoice(id, {
      status: "paid",
      amountPaid: (await storage.getInvoice(id))?.total ?? 0,
      balanceDue: 0,
      paymentMethod: paymentMethod || "cash",
      squarePaymentId: squarePaymentId || null,
    } as any);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // ── Invoice Line Items ──────────────────────────────────────────────────────────
  app.get("/api/invoices/:invoiceId/line-items", async (req, res) => {
    const invoiceId = parseInt(req.params.invoiceId);
    const items = await storage.getLineItems(invoiceId);
    res.json(items);
  });

  app.post("/api/invoices/:invoiceId/line-items", async (req, res) => {
    const invoiceId = parseInt(req.params.invoiceId);
    const parsed = insertLineItemSchema.safeParse({ ...req.body, invoiceId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const li = await storage.createLineItem(parsed.data);
    res.status(201).json(li);
  });

  app.patch("/api/line-items/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateLineItem(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/line-items/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteLineItem(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ── Square Integration ──────────────────────────────────────────────────────────
  app.get("/api/square/status", async (_req, res) => {
    const settings = await storage.getSquareSettings();
    res.json({ connected: settings?.connected ?? false });
  });

  app.post("/api/square/connect", async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: "Access token required" });
    await storage.setSquareSettings(accessToken);
    res.json({ connected: true });
  });

  app.post("/api/square/disconnect", async (_req, res) => {
    // Clear the stored token from settings table
    await storage.setSetting("square_access_token", "");
    res.json({ connected: false });
  });

  app.get("/api/square/imports", async (_req, res) => {
    const imports = await storage.getSquareImports();
    res.json(imports);
  });

  // ── Square helpers ────────────────────────────────────────────────────────────
  async function squareFetch(path: string, token: string, method = "GET", body?: object) {
    const url = `https://connect.squareup.com/v2${path}`;
    const opts: any = {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Square-Version": "2024-01-18",
        "Content-Type": "application/json",
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(`Square API error ${r.status}: ${await r.text()}`);
    return r.json();
  }

  // Real Square customer import
  app.post("/api/square/import-customers", async (_req, res) => {
    const settings = await storage.getSquareSettings();
    if (!settings?.connected) return res.status(400).json({ error: "Square not connected" });
    const token = settings.accessToken;

    const importRecord = await storage.createSquareImport({
      type: "customers",
      status: "running",
      recordsImported: 0,
      totalRecords: 0,
    });

    res.status(202).json({ importId: importRecord.id, message: "Import started" });

    // Run async in background
    (async () => {
      try {
        let cursor: string | undefined;
        let imported = 0;
        let total = 0;
        let pages = 0;

        do {
          const url = cursor ? `/customers?cursor=${encodeURIComponent(cursor)}` : "/customers?limit=100";
          const data: any = await squareFetch(url, token);
          const batch: any[] = data.customers ?? [];
          total += batch.length;
          pages++;

          for (const sc of batch) {
            const existing = await storage.getCustomerBySquareId(sc.id);
            if (existing) continue;

            const givenName = sc.given_name ?? "";
            const familyName = sc.family_name ?? "";
            const name = [givenName, familyName].filter(Boolean).join(" ") || sc.company_name || sc.email_address || "Square Customer";
            const phone = sc.phone_number ?? "";
            const email = sc.email_address ?? null;
            const addr = sc.address;

            await storage.createCustomer({
              name,
              phone,
              email,
              address: addr?.address_line_1 ?? null,
              city: addr?.locality ?? null,
              state: addr?.administrative_district_level_1 ?? null,
              zip: addr?.postal_code ?? null,
              notes: sc.note ?? null,
              source: "Square Import",
              squareCustomerId: sc.id,
            } as any);
            imported++;
          }

          cursor = data.cursor;
          // Update progress every page
          await storage.updateSquareImport(importRecord.id, {
            recordsImported: imported,
            totalRecords: total,
          } as any);
        } while (cursor);

        await storage.updateSquareImport(importRecord.id, {
          status: "completed",
          recordsImported: imported,
          totalRecords: total,
          completedAt: new Date() as any,
        } as any);
      } catch (err: any) {
        await storage.updateSquareImport(importRecord.id, {
          status: "failed",
          error: err.message,
          completedAt: new Date() as any,
        } as any);
      }
    })();
  });

  // Real Square sales/orders import
  app.post("/api/square/import-sales", async (_req, res) => {
    const settings = await storage.getSquareSettings();
    if (!settings?.connected) return res.status(400).json({ error: "Square not connected" });
    const token = settings.accessToken;

    const importRecord = await storage.createSquareImport({
      type: "orders",
      status: "running",
      recordsImported: 0,
      totalRecords: 0,
    });

    res.status(202).json({ importId: importRecord.id, message: "Sales import started" });

    (async () => {
      try {
        // Get location
        const locData: any = await squareFetch("/locations", token);
        const locationId = locData.locations?.[0]?.id;
        if (!locationId) throw new Error("No Square location found");

        let cursor: string | undefined;
        let imported = 0;
        let total = 0;

        do {
          const body: any = {
            location_ids: [locationId],
            query: {
              filter: { state_filter: { states: ["COMPLETED"] } },
              sort: { sort_field: "CREATED_AT", sort_order: "DESC" },
            },
            limit: 500,
          };
          if (cursor) body.cursor = cursor;

          const data: any = await squareFetch("/orders/search", token, "POST", body);
          const orders: any[] = data.orders ?? [];
          total += orders.length;

          for (const order of orders) {
            // Find or match customer
            let customerId: number | null = null;
            if (order.customer_id) {
              const existing = await storage.getCustomerBySquareId(order.customer_id);
              customerId = existing?.id ?? null;
            }
            if (!customerId) {
              const allC = await storage.getCustomers();
              customerId = allC[0]?.id ?? null;
            }
            if (!customerId) continue;

            // Build title from line items
            const lineItems: any[] = order.line_items ?? [];
            const itemNames = lineItems.map((li: any) => li.name).filter(Boolean).join(", ");
            const title = itemNames || "Square Order";

            // Total in cents → dollars
            const totalMoney = (order.total_money?.amount ?? 0) / 100;

            // Determine service type
            const titleLower = title.toLowerCase();
            let serviceType = "Junk Removal";
            if (titleLower.includes("garage")) serviceType = "Garage Cleanout";
            else if (titleLower.includes("estate")) serviceType = "Estate Cleanout";
            else if (titleLower.includes("appliance") || titleLower.includes("furniture")) serviceType = "Junk Removal";
            else if (titleLower.includes("demo")) serviceType = "Demolition";

            const createdDate = order.created_at ? order.created_at.split("T")[0] : null;

            await storage.createJob({
              customerId,
              title,
              serviceType,
              status: "completed",
              estimateLow: totalMoney,
              estimateHigh: totalMoney,
              finalPrice: totalMoney,
              scheduledDate: createdDate,
              scheduledTime: null,
              notes: `Imported from Square order ${order.id}`,
              leadSource: "Square",
              estimateRefId: order.id,
            } as any);
            imported++;
          }

          cursor = data.cursor;
          await storage.updateSquareImport(importRecord.id, {
            recordsImported: imported,
            totalRecords: total,
          } as any);
        } while (cursor);

        await storage.updateSquareImport(importRecord.id, {
          status: "completed",
          recordsImported: imported,
          totalRecords: total,
          completedAt: new Date() as any,
        } as any);
      } catch (err: any) {
        await storage.updateSquareImport(importRecord.id, {
          status: "failed",
          error: err.message,
          completedAt: new Date() as any,
        } as any);
      }
    })();
  });

  // ── Analytics (Real integrations with caching) ────────────────────────────────

  // Status endpoint — shows which integrations are configured
  app.get("/api/analytics/status", async (_req, res) => {
    res.json(getAnalyticsStatus());
  });

  // Combined overview — pulls from all configured sources for the dashboard
  app.get("/api/analytics/live", async (_req, res) => {
    try {
      const [ga, gsc] = await Promise.all([
        getGAOverview(),
        getGSCPerformance(),
      ]);

      // Also get daily sessions and queries for the existing frontend
      const [daily, queries] = await Promise.all([
        getGADailySessions(),
        getGSCQueries(),
      ]);

      // Format to match the existing frontend interface
      const gaData = ga as any;
      const gscData = gsc as any;
      const dailyData = daily as any;
      const queryData = queries as any;

      const avgDuration = gaData.avgSessionDuration ?? 0;
      const mins = Math.floor(avgDuration / 60);
      const secs = Math.floor(avgDuration % 60);

      res.json({
        sessions: gaData.sessions ?? 0,
        clicks: gscData.clicks ?? 0,
        avgSession: avgDuration > 0 ? `${mins}m ${secs}s` : "-",
        dailySessions: dailyData.days?.map((d: any) => d.sessions) ?? [],
        topQueries: queryData.queries?.slice(0, 10) ?? [],
        // Extended data for future frontend tabs
        ga: gaData,
        gsc: gscData,
      });
    } catch (e: any) {
      console.error("Analytics live error:", e.message);
      res.json({
        sessions: 0, clicks: 0, avgSession: "-",
        dailySessions: [], topQueries: [],
        error: e.message,
      });
    }
  });

  // Google Analytics endpoints
  app.get("/api/analytics/ga/overview", async (_req, res) => {
    res.json(await getGAOverview());
  });
  app.get("/api/analytics/ga/daily-sessions", async (_req, res) => {
    res.json(await getGADailySessions());
  });
  app.get("/api/analytics/ga/top-pages", async (_req, res) => {
    res.json(await getGATopPages());
  });
  app.get("/api/analytics/ga/traffic-sources", async (_req, res) => {
    res.json(await getGATrafficSources());
  });

  // Google Search Console endpoints
  app.get("/api/analytics/gsc/performance", async (_req, res) => {
    res.json(await getGSCPerformance());
  });
  app.get("/api/analytics/gsc/queries", async (_req, res) => {
    res.json(await getGSCQueries());
  });
  app.get("/api/analytics/gsc/pages", async (_req, res) => {
    res.json(await getGSCPages());
  });

  // Facebook endpoints
  app.get("/api/analytics/fb/page-insights", async (_req, res) => {
    res.json(await getFBPageInsights());
  });
  app.get("/api/analytics/fb/posts", async (_req, res) => {
    res.json(await getFBRecentPosts());
  });
}
