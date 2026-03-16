/**
 * Analytics Integration Module
 * Connects to Google Analytics (GA4), Google Search Console, and Facebook
 * All responses are cached in PostgreSQL to prevent rate limit issues
 */
import { storage } from "./storage";

const CACHE_TTL_MINUTES = 10; // Cache all analytics for 10 minutes

// ═══════════════════════════════════════════════════════════════════════════════
// Google Auth Helper
// ═══════════════════════════════════════════════════════════════════════════════

function getGoogleAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;
  try {
    const { google } = require("googleapis");
    const key = JSON.parse(keyJson);
    return new google.auth.GoogleAuth({
      credentials: key,
      scopes: [
        "https://www.googleapis.com/auth/analytics.readonly",
        "https://www.googleapis.com/auth/webmasters.readonly",
        "https://www.googleapis.com/auth/business.manage",
      ],
    });
  } catch (e: any) {
    console.error("Failed to init Google auth:", e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Google Analytics (GA4) via Data API
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGAOverview() {
  // Check cache first
  const cached = await storage.getCachedAnalytics("ga", "overview");
  if (cached) return cached;

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return { error: "GA4_PROPERTY_ID not set", configured: false };

  const auth = getGoogleAuth();
  if (!auth) return { error: "GOOGLE_SERVICE_ACCOUNT_KEY not set", configured: false };

  try {
    const { BetaAnalyticsDataClient } = require("@google-analytics/data");
    const client = new BetaAnalyticsDataClient({ auth });

    // Get last 30 days overview
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
      ],
    });

    const row = response.rows?.[0];
    const result = {
      configured: true,
      sessions: parseInt(row?.metricValues?.[0]?.value ?? "0"),
      users: parseInt(row?.metricValues?.[1]?.value ?? "0"),
      pageviews: parseInt(row?.metricValues?.[2]?.value ?? "0"),
      avgSessionDuration: parseFloat(row?.metricValues?.[3]?.value ?? "0"),
      bounceRate: parseFloat(row?.metricValues?.[4]?.value ?? "0"),
    };

    await storage.setCachedAnalytics("ga", "overview", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GA4 overview error:", e.message);
    return { error: e.message, configured: true };
  }
}

export async function getGADailySessions() {
  const cached = await storage.getCachedAnalytics("ga", "daily-sessions");
  if (cached) return cached;

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return { error: "GA4_PROPERTY_ID not set", configured: false };

  const auth = getGoogleAuth();
  if (!auth) return { error: "GOOGLE_SERVICE_ACCOUNT_KEY not set", configured: false };

  try {
    const { BetaAnalyticsDataClient } = require("@google-analytics/data");
    const client = new BetaAnalyticsDataClient({ auth });

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    });

    const days = (response.rows ?? []).map((row: any) => ({
      date: row.dimensionValues?.[0]?.value,
      sessions: parseInt(row.metricValues?.[0]?.value ?? "0"),
    }));

    const result = { configured: true, days };
    await storage.setCachedAnalytics("ga", "daily-sessions", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GA4 daily sessions error:", e.message);
    return { error: e.message, configured: true };
  }
}

export async function getGATopPages() {
  const cached = await storage.getCachedAnalytics("ga", "top-pages");
  if (cached) return cached;

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return { error: "GA4_PROPERTY_ID not set", configured: false };

  const auth = getGoogleAuth();
  if (!auth) return { error: "GOOGLE_SERVICE_ACCOUNT_KEY not set", configured: false };

  try {
    const { BetaAnalyticsDataClient } = require("@google-analytics/data");
    const client = new BetaAnalyticsDataClient({ auth });

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    });

    const pages = (response.rows ?? []).map((row: any) => ({
      path: row.dimensionValues?.[0]?.value,
      pageviews: parseInt(row.metricValues?.[0]?.value ?? "0"),
      sessions: parseInt(row.metricValues?.[1]?.value ?? "0"),
    }));

    const result = { configured: true, pages };
    await storage.setCachedAnalytics("ga", "top-pages", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GA4 top pages error:", e.message);
    return { error: e.message, configured: true };
  }
}

export async function getGATrafficSources() {
  const cached = await storage.getCachedAnalytics("ga", "traffic-sources");
  if (cached) return cached;

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return { error: "GA4_PROPERTY_ID not set", configured: false };

  const auth = getGoogleAuth();
  if (!auth) return { error: "GOOGLE_SERVICE_ACCOUNT_KEY not set", configured: false };

  try {
    const { BetaAnalyticsDataClient } = require("@google-analytics/data");
    const client = new BetaAnalyticsDataClient({ auth });

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    });

    const sources = (response.rows ?? []).map((row: any) => ({
      channel: row.dimensionValues?.[0]?.value,
      sessions: parseInt(row.metricValues?.[0]?.value ?? "0"),
      users: parseInt(row.metricValues?.[1]?.value ?? "0"),
    }));

    const result = { configured: true, sources };
    await storage.setCachedAnalytics("ga", "traffic-sources", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GA4 traffic sources error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Google Search Console
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGSCPerformance() {
  const cached = await storage.getCachedAnalytics("gsc", "performance");
  if (cached) return cached;

  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) return { error: "GSC_SITE_URL not set", configured: false };

  const auth = getGoogleAuth();
  if (!auth) return { error: "GOOGLE_SERVICE_ACCOUNT_KEY not set", configured: false };

  try {
    const { google } = require("googleapis");
    const searchconsole = google.searchconsole({ version: "v1", auth });

    // Get last 30 days performance
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        dimensions: [],
        rowLimit: 1,
      },
    });

    const row = response.data.rows?.[0];
    const result = {
      configured: true,
      clicks: row?.clicks ?? 0,
      impressions: row?.impressions ?? 0,
      ctr: row?.ctr ? (row.ctr * 100).toFixed(1) : "0",
      position: row?.position ? row.position.toFixed(1) : "0",
    };

    await storage.setCachedAnalytics("gsc", "performance", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GSC performance error:", e.message);
    return { error: e.message, configured: true };
  }
}

export async function getGSCQueries() {
  const cached = await storage.getCachedAnalytics("gsc", "queries");
  if (cached) return cached;

  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) return { error: "GSC_SITE_URL not set", configured: false };

  const auth = getGoogleAuth();
  if (!auth) return { error: "GOOGLE_SERVICE_ACCOUNT_KEY not set", configured: false };

  try {
    const { google } = require("googleapis");
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        dimensions: ["query"],
        rowLimit: 20,
        orderBy: "clicks",
        orderDirection: "descending",
      },
    });

    const queries = (response.data.rows ?? []).map((row: any) => ({
      query: row.keys?.[0],
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ? (row.ctr * 100).toFixed(1) : "0",
      position: row.position ? row.position.toFixed(1) : "0",
    }));

    const result = { configured: true, queries };
    await storage.setCachedAnalytics("gsc", "queries", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GSC queries error:", e.message);
    return { error: e.message, configured: true };
  }
}

export async function getGSCPages() {
  const cached = await storage.getCachedAnalytics("gsc", "pages");
  if (cached) return cached;

  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) return { error: "GSC_SITE_URL not set", configured: false };

  const auth = getGoogleAuth();
  if (!auth) return { error: "GOOGLE_SERVICE_ACCOUNT_KEY not set", configured: false };

  try {
    const { google } = require("googleapis");
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        dimensions: ["page"],
        rowLimit: 15,
        orderBy: "clicks",
        orderDirection: "descending",
      },
    });

    const pages = (response.data.rows ?? []).map((row: any) => ({
      page: row.keys?.[0],
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ? (row.ctr * 100).toFixed(1) : "0",
      position: row.position ? row.position.toFixed(1) : "0",
    }));

    const result = { configured: true, pages };
    await storage.setCachedAnalytics("gsc", "pages", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GSC pages error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Facebook / Meta Page Insights
// ═══════════════════════════════════════════════════════════════════════════════

async function fbFetch(path: string) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!token || !pageId) return null;

  const url = `https://graph.facebook.com/v19.0/${pageId}${path}&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Facebook API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getFBPageInsights() {
  const cached = await storage.getCachedAnalytics("fb", "page-insights");
  if (cached) return cached;

  if (!process.env.FB_PAGE_ACCESS_TOKEN || !process.env.FB_PAGE_ID) {
    return { error: "FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID not set", configured: false };
  }

  try {
    const data: any = await fbFetch(
      `/insights?metric=page_impressions,page_engaged_users,page_fans&period=day&date_preset=last_30d`
    );

    const metrics: Record<string, any[]> = {};
    for (const item of data?.data ?? []) {
      metrics[item.name] = item.values ?? [];
    }

    const sum = (arr: any[]) => arr.reduce((s, v) => s + (v.value ?? 0), 0);

    const result = {
      configured: true,
      impressions: sum(metrics["page_impressions"] ?? []),
      engagedUsers: sum(metrics["page_engaged_users"] ?? []),
      totalFans: metrics["page_fans"]?.slice(-1)[0]?.value ?? 0,
    };

    await storage.setCachedAnalytics("fb", "page-insights", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("FB page insights error:", e.message);
    return { error: e.message, configured: true };
  }
}

export async function getFBRecentPosts() {
  const cached = await storage.getCachedAnalytics("fb", "posts");
  if (cached) return cached;

  if (!process.env.FB_PAGE_ACCESS_TOKEN || !process.env.FB_PAGE_ID) {
    return { error: "FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID not set", configured: false };
  }

  try {
    const data: any = await fbFetch(
      `/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares&limit=10`
    );

    const posts = (data?.data ?? []).map((post: any) => ({
      id: post.id,
      message: post.message?.substring(0, 100) ?? "(no text)",
      createdAt: post.created_time,
      likes: post.likes?.summary?.total_count ?? 0,
      comments: post.comments?.summary?.total_count ?? 0,
      shares: post.shares?.count ?? 0,
    }));

    const result = { configured: true, posts };
    await storage.setCachedAnalytics("fb", "posts", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("FB posts error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Connection status check
// ═══════════════════════════════════════════════════════════════════════════════

export function getAnalyticsStatus() {
  return {
    ga: {
      configured: !!process.env.GA4_PROPERTY_ID && !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      propertyId: process.env.GA4_PROPERTY_ID ? "set" : "missing",
      serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? "set" : "missing",
    },
    gsc: {
      configured: !!process.env.GSC_SITE_URL && !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      siteUrl: process.env.GSC_SITE_URL ?? "missing",
      serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? "set" : "missing",
    },
    fb: {
      configured: !!process.env.FB_PAGE_ACCESS_TOKEN && !!process.env.FB_PAGE_ID,
      pageId: process.env.FB_PAGE_ID ? "set" : "missing",
      accessToken: process.env.FB_PAGE_ACCESS_TOKEN ? "set" : "missing",
    },
  };
}
