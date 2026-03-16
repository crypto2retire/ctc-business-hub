/**
 * Google My Business (Google Business Profile) Integration
 * Connects to Business Profile APIs for reviews, performance, and posts
 * All responses are cached in PostgreSQL to prevent rate limit issues
 */
import { storage } from "./storage";

const CACHE_TTL_MINUTES = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// Google Business Profile Auth
// ═══════════════════════════════════════════════════════════════════════════════

function getGMBAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;
  try {
    const { google } = require("googleapis");
    const key = JSON.parse(keyJson);
    return new google.auth.GoogleAuth({
      credentials: key,
      scopes: [
        "https://www.googleapis.com/auth/business.manage",
      ],
    });
  } catch (e: any) {
    console.error("Failed to init GMB auth:", e.message);
    return null;
  }
}

async function getAccessToken() {
  const auth = getGMBAuth();
  if (!auth) return null;
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token?.token ?? null;
}

async function gmbFetch(url: string, method = "GET", body?: object) {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token available");

  const opts: any = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GMB API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reviews
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGMBReviews() {
  const cached = await storage.getCachedAnalytics("gmb", "reviews");
  if (cached) return cached;

  const accountId = process.env.GMB_ACCOUNT_ID;
  const locationId = process.env.GMB_LOCATION_ID;
  if (!accountId) return { error: "GMB_ACCOUNT_ID not set", configured: false };
  if (!locationId) return { error: "GMB_LOCATION_ID not set", configured: false };

  try {
    const data = await gmbFetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=updateTime desc`
    );

    const reviews = (data.reviews ?? []).map((r: any) => ({
      reviewId: r.reviewId,
      reviewer: r.reviewer?.displayName ?? "Anonymous",
      starRating: r.starRating,
      comment: r.comment ?? "",
      createTime: r.createTime,
      updateTime: r.updateTime,
      hasReply: !!r.reviewReply,
      replyComment: r.reviewReply?.comment ?? null,
    }));

    // Calculate summary stats
    const total = reviews.length;
    const avgRating = total > 0
      ? reviews.reduce((sum: number, r: any) => {
          const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
          return sum + (stars[r.starRating] ?? 0);
        }, 0) / total
      : 0;
    const unreplied = reviews.filter((r: any) => !r.hasReply).length;

    const ratingBreakdown: Record<string, number> = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
    for (const r of reviews) {
      const stars: Record<string, string> = { ONE: "1", TWO: "2", THREE: "3", FOUR: "4", FIVE: "5" };
      const key = stars[r.starRating] ?? "5";
      ratingBreakdown[key]++;
    }

    const result = {
      configured: true,
      totalReviews: data.totalReviewCount ?? total,
      averageRating: parseFloat(avgRating.toFixed(1)),
      unrepliedCount: unreplied,
      ratingBreakdown,
      reviews: reviews.slice(0, 20), // Return latest 20
    };

    await storage.setCachedAnalytics("gmb", "reviews", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GMB reviews error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Performance Metrics (calls, directions, website clicks, searches)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGMBPerformance() {
  const cached = await storage.getCachedAnalytics("gmb", "performance");
  if (cached) return cached;

  const locationName = process.env.GMB_LOCATION_NAME; // e.g., "locations/1234567890"
  if (!locationName) return { error: "GMB_LOCATION_NAME not set", configured: false };

  try {
    // Business Profile Performance API
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (d: Date) => ({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    });

    // Fetch daily metrics
    const data = await gmbFetch(
      `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`,
      "GET"
    );

    // Alternative: use the searchkeywords endpoint
    const searchData = await gmbFetch(
      `https://businessprofileperformance.googleapis.com/v1/${locationName}/searchkeywords/impressions/monthly?monthlyRange.startMonth.year=${startDate.getFullYear()}&monthlyRange.startMonth.month=${startDate.getMonth() + 1}&monthlyRange.endMonth.year=${endDate.getFullYear()}&monthlyRange.endMonth.month=${endDate.getMonth() + 1}`
    ).catch(() => null);

    const result = {
      configured: true,
      metrics: data,
      searchKeywords: searchData?.searchKeywordsCounts ?? [],
    };

    await storage.setCachedAnalytics("gmb", "performance", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GMB performance error:", e.message);
    // Fall back to basic metrics via v4 API
    try {
      return await getGMBInsightsFallback();
    } catch (fallbackErr: any) {
      return { error: e.message, configured: true };
    }
  }
}

async function getGMBInsightsFallback() {
  const accountId = process.env.GMB_ACCOUNT_ID;
  const locationId = process.env.GMB_LOCATION_ID;
  if (!accountId || !locationId) return { error: "GMB not configured", configured: false };

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const body = {
    basicRequest: {
      metricRequests: [
        { metric: "ALL" },
      ],
      timeRange: {
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    },
  };

  const data = await gmbFetch(
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reportInsights`,
    "POST",
    body
  );

  const metrics: Record<string, number> = {};
  for (const result of data.locationMetrics?.[0]?.metricValues ?? []) {
    const total = (result.dimensionalValues ?? []).reduce(
      (sum: number, v: any) => sum + parseInt(v.value ?? "0"), 0
    );
    metrics[result.metric] = total;
  }

  const result = {
    configured: true,
    websiteClicks: metrics["WEBSITE_CLICKS"] ?? 0,
    phoneCallClicks: metrics["ACTIONS_PHONE"] ?? 0,
    directionRequests: metrics["ACTIONS_DRIVING_DIRECTIONS"] ?? 0,
    searchViews: metrics["QUERIES_DIRECT"] ?? 0 + (metrics["QUERIES_INDIRECT"] ?? 0),
    mapViews: metrics["VIEWS_MAPS"] ?? 0,
    searchImpressions: metrics["VIEWS_SEARCH"] ?? 0,
    photoViews: metrics["PHOTOS_VIEWS_MERCHANT"] ?? 0 + (metrics["PHOTOS_VIEWS_CUSTOMERS"] ?? 0),
    raw: metrics,
  };

  await storage.setCachedAnalytics("gmb", "performance", result, CACHE_TTL_MINUTES);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Posts
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGMBPosts() {
  const cached = await storage.getCachedAnalytics("gmb", "posts");
  if (cached) return cached;

  const accountId = process.env.GMB_ACCOUNT_ID;
  const locationId = process.env.GMB_LOCATION_ID;
  if (!accountId || !locationId) return { error: "GMB not configured", configured: false };

  try {
    const data = await gmbFetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts?pageSize=10`
    );

    const posts = (data.localPosts ?? []).map((p: any) => ({
      name: p.name,
      summary: p.summary ?? "",
      topicType: p.topicType,
      state: p.state,
      createTime: p.createTime,
      updateTime: p.updateTime,
      searchUrl: p.searchUrl,
      media: p.media?.[0]?.googleUrl ?? null,
      callToAction: p.callToAction?.actionType ?? null,
      // Post insights
      views: p.metrics?.viewCount ?? 0,
      clicks: p.metrics?.clickCount ?? 0,
    }));

    const result = { configured: true, posts };
    await storage.setCachedAnalytics("gmb", "posts", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GMB posts error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q&A
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGMBQuestions() {
  const cached = await storage.getCachedAnalytics("gmb", "questions");
  if (cached) return cached;

  const accountId = process.env.GMB_ACCOUNT_ID;
  const locationId = process.env.GMB_LOCATION_ID;
  if (!accountId || !locationId) return { error: "GMB not configured", configured: false };

  try {
    const data = await gmbFetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/questions?pageSize=20&orderBy=UPDATE_TIME_DESC`
    );

    const questions = (data.questions ?? []).map((q: any) => ({
      name: q.name,
      text: q.text,
      createTime: q.createTime,
      updateTime: q.updateTime,
      upvoteCount: q.upvoteCount ?? 0,
      totalAnswerCount: q.totalAnswerCount ?? 0,
      topAnswers: (q.topAnswers ?? []).map((a: any) => ({
        text: a.text,
        author: a.author?.displayName ?? "Unknown",
        createTime: a.createTime,
      })),
    }));

    const result = {
      configured: true,
      totalQuestions: data.totalSize ?? questions.length,
      unansweredCount: questions.filter((q: any) => q.totalAnswerCount === 0).length,
      questions,
    };

    await storage.setCachedAnalytics("gmb", "questions", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GMB Q&A error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status check
// ═══════════════════════════════════════════════════════════════════════════════

export function getGMBStatus() {
  return {
    configured: !!process.env.GMB_ACCOUNT_ID && !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    accountId: process.env.GMB_ACCOUNT_ID ? "set" : "missing",
    locationId: process.env.GMB_LOCATION_ID ? "set" : "missing",
    locationName: process.env.GMB_LOCATION_NAME ? "set" : "missing",
    serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? "set" : "missing",
  };
}
