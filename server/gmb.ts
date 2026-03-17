/**
 * Google My Business (Google Business Profile) Integration
 *
 * Reviews: Uses Google Places API (New) as primary source — works without GBP API approval.
 * Performance: Uses Business Profile Performance API if approved, otherwise returns cached/placeholder data.
 * Posts/Q&A: Uses v4 mybusiness API if enabled, gracefully degrades if not.
 *
 * All responses are cached in PostgreSQL to prevent rate limit issues.
 */
import { storage } from "./storage";

const CACHE_TTL_MINUTES = 30; // Reviews don't change rapidly
const PERF_CACHE_TTL = 60;   // Performance data cached 1 hour

// ═══════════════════════════════════════════════════════════════════════════════
// Google Business Profile Auth (for Performance/Posts/Q&A APIs)
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
// Reviews — Uses Google Places API (New) as primary source
// No special GBP API approval needed, just a Google Maps API key
// Falls back to GBP v4 API if Places API unavailable
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGMBReviews() {
  const cached = await storage.getCachedAnalytics("gmb", "reviews");
  if (cached) return cached;

  // Try Places API first (works without GBP API approval)
  const placeId = process.env.GMB_PLACE_ID; // Google Maps Place ID
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;

  if (placeId && apiKey) {
    try {
      const result = await fetchReviewsFromPlacesAPI(placeId, apiKey);
      await storage.setCachedAnalytics("gmb", "reviews", result, CACHE_TTL_MINUTES);
      return result;
    } catch (e: any) {
      console.error("Places API reviews error:", e.message);
      // Fall through to GBP API
    }
  }

  // Fall back to GBP v4 API (requires mybusiness.googleapis.com to be enabled)
  const accountId = process.env.GMB_ACCOUNT_ID;
  const locationId = process.env.GMB_LOCATION_ID;
  if (!accountId || !locationId) {
    return {
      error: "Set GMB_PLACE_ID + GOOGLE_PLACES_API_KEY for reviews (no GBP API approval needed), or GMB_ACCOUNT_ID + GMB_LOCATION_ID for GBP API",
      configured: false,
      setupGuide: {
        option1: "Add GMB_PLACE_ID (your Google Maps Place ID) and GOOGLE_PLACES_API_KEY to Railway env vars — works immediately",
        option2: "Apply for GBP API access at https://developers.google.com/my-business/content/prereqs and set GMB_ACCOUNT_ID + GMB_LOCATION_ID",
      },
    };
  }

  try {
    const data = await gmbFetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=updateTime desc`
    );
    const result = processGBPReviews(data);
    await storage.setCachedAnalytics("gmb", "reviews", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GMB reviews v4 error:", e.message);

    // Return helpful error with setup instructions
    return {
      error: "GBP Reviews API (mybusiness.googleapis.com) is not enabled. Use Places API instead.",
      configured: true,
      needsApiEnabled: true,
      totalReviews: 0,
      averageRating: 0,
      unrepliedCount: 0,
      reviews: [],
      fix: "Add GMB_PLACE_ID and GOOGLE_PLACES_API_KEY (or GOOGLE_API_KEY) to Railway env vars for instant reviews without GBP API approval",
    };
  }
}

async function fetchReviewsFromPlacesAPI(placeId: string, apiKey: string) {
  // Use the Places API (New) — returns reviews, rating, total reviews
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=displayName,rating,userRatingCount,reviews&key=${apiKey}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API error ${res.status}: ${text}`);
  }

  const data = await res.json();

  const reviews = (data.reviews ?? []).map((r: any) => ({
    reviewId: r.name,
    reviewer: r.authorAttribution?.displayName ?? "Anonymous",
    starRating: starToEnum(r.rating),
    rating: r.rating,
    comment: r.text?.text ?? "",
    createTime: r.publishTime,
    updateTime: r.publishTime,
    hasReply: !!r.googleMapsUri,
    replyComment: null,
    relativeTime: r.relativePublishTimeDescription ?? "",
    profilePhoto: r.authorAttribution?.photoUri ?? null,
  }));

  const totalReviews = data.userRatingCount ?? reviews.length;
  const averageRating = data.rating ?? 0;
  const unreplied = reviews.filter((r: any) => !r.hasReply).length;

  const ratingBreakdown: Record<string, number> = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
  for (const r of reviews) {
    const key = String(r.rating);
    if (ratingBreakdown[key] !== undefined) ratingBreakdown[key]++;
  }

  return {
    configured: true,
    source: "places_api",
    totalReviews,
    averageRating: parseFloat(averageRating.toFixed(1)),
    unrepliedCount: unreplied,
    ratingBreakdown,
    reviews,
    businessName: data.displayName?.text ?? "Clear The Clutter",
  };
}

function starToEnum(rating: number): string {
  const map: Record<number, string> = { 1: "ONE", 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE" };
  return map[Math.round(rating)] ?? "FIVE";
}

function processGBPReviews(data: any) {
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

  return {
    configured: true,
    source: "gbp_api",
    totalReviews: data.totalReviewCount ?? total,
    averageRating: parseFloat(avgRating.toFixed(1)),
    unrepliedCount: unreplied,
    ratingBreakdown,
    reviews: reviews.slice(0, 20),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Performance Metrics (calls, directions, website clicks, searches)
// Uses the Business Profile Performance API — requires quota approval
// If quota is 0, returns cached data or known business stats
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGMBPerformance() {
  const cached = await storage.getCachedAnalytics("gmb", "performance");
  if (cached) return cached;

  const locationName = process.env.GMB_LOCATION_NAME;
  if (!locationName) return { error: "GMB_LOCATION_NAME not set", configured: false };

  try {
    // Build date range for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const metrics = [
      "WEBSITE_CLICKS",
      "CALL_CLICKS",
      "DIRECTION_REQUESTS",
      "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
      "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
      "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
      "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    ];

    const metricResults: Record<string, number> = {};

    for (const metric of metrics) {
      try {
        const url =
          `https://businessprofileperformance.googleapis.com/v1/${locationName}:getDailyMetricsTimeSeries` +
          `?dailyMetric=${metric}` +
          `&dailyRange.startDate.year=${startDate.getFullYear()}` +
          `&dailyRange.startDate.month=${startDate.getMonth() + 1}` +
          `&dailyRange.startDate.day=${startDate.getDate()}` +
          `&dailyRange.endDate.year=${endDate.getFullYear()}` +
          `&dailyRange.endDate.month=${endDate.getMonth() + 1}` +
          `&dailyRange.endDate.day=${endDate.getDate()}`;

        const data = await gmbFetch(url);

        const total = (data.timeSeries?.datedValues ?? []).reduce(
          (sum: number, v: any) => sum + parseInt(v.value ?? "0"), 0
        );
        metricResults[metric] = total;
      } catch (metricErr: any) {
        // If first metric fails with 429 (quota = 0), don't try the rest
        if (metricErr.message.includes("429") || metricErr.message.includes("RESOURCE_EXHAUSTED")) {
          console.error("GMB Performance API quota is 0 — apply at https://developers.google.com/my-business/content/prereqs");
          return {
            configured: true,
            quotaExhausted: true,
            error: "Business Profile Performance API quota is 0. Apply for access.",
            applyUrl: "https://developers.google.com/my-business/content/prereqs",
            websiteClicks: 0,
            phoneCallClicks: 0,
            directionRequests: 0,
            searchImpressions: 0,
            mapViews: 0,
            searchKeywords: [],
            raw: {},
          };
        }
        console.error(`GMB metric ${metric} error:`, metricErr.message);
        metricResults[metric] = 0;
      }
    }

    // Also try search keywords
    let searchKeywords: any[] = [];
    try {
      const searchData = await gmbFetch(
        `https://businessprofileperformance.googleapis.com/v1/${locationName}/searchkeywords/impressions/monthly?monthlyRange.startMonth.year=${startDate.getFullYear()}&monthlyRange.startMonth.month=${startDate.getMonth() + 1}&monthlyRange.endMonth.year=${endDate.getFullYear()}&monthlyRange.endMonth.month=${endDate.getMonth() + 1}`
      );
      searchKeywords = searchData.searchKeywordsCounts ?? [];
    } catch (searchErr: any) {
      console.error("GMB search keywords error:", searchErr.message);
    }

    const result = {
      configured: true,
      websiteClicks: metricResults["WEBSITE_CLICKS"] ?? 0,
      phoneCallClicks: metricResults["CALL_CLICKS"] ?? 0,
      directionRequests: metricResults["DIRECTION_REQUESTS"] ?? 0,
      searchImpressions:
        (metricResults["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"] ?? 0) +
        (metricResults["BUSINESS_IMPRESSIONS_MOBILE_SEARCH"] ?? 0),
      mapViews:
        (metricResults["BUSINESS_IMPRESSIONS_DESKTOP_MAPS"] ?? 0) +
        (metricResults["BUSINESS_IMPRESSIONS_MOBILE_MAPS"] ?? 0),
      searchKeywords,
      raw: metricResults,
    };

    await storage.setCachedAnalytics("gmb", "performance", result, PERF_CACHE_TTL);
    return result;
  } catch (e: any) {
    console.error("GMB performance error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Posts - uses v4 API (graceful degradation)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGMBPosts() {
  const cached = await storage.getCachedAnalytics("gmb", "posts");
  if (cached) return cached;

  const accountId = process.env.GMB_ACCOUNT_ID;
  const locationId = process.env.GMB_LOCATION_ID;
  if (!accountId || !locationId) return { error: "GMB not configured", configured: false, posts: [] };

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
      views: p.metrics?.viewCount ?? 0,
      clicks: p.metrics?.clickCount ?? 0,
    }));

    const result = { configured: true, posts };
    await storage.setCachedAnalytics("gmb", "posts", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("GMB posts error:", e.message);
    return {
      configured: true,
      posts: [],
      unavailable: true,
      reason: "Posts API requires mybusiness.googleapis.com — apply at https://developers.google.com/my-business/content/prereqs",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q&A - uses v4 API (graceful degradation)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGMBQuestions() {
  const cached = await storage.getCachedAnalytics("gmb", "questions");
  if (cached) return cached;

  const accountId = process.env.GMB_ACCOUNT_ID;
  const locationId = process.env.GMB_LOCATION_ID;
  if (!accountId || !locationId) return { error: "GMB not configured", configured: false, questions: [] };

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
    return {
      configured: true,
      questions: [],
      unavailable: true,
      reason: "Q&A API requires mybusiness.googleapis.com — apply at https://developers.google.com/my-business/content/prereqs",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status check
// ═══════════════════════════════════════════════════════════════════════════════

export function getGMBStatus() {
  const hasPlacesSetup = !!(process.env.GMB_PLACE_ID && (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY));
  const hasGBPSetup = !!(process.env.GMB_ACCOUNT_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

  return {
    configured: hasPlacesSetup || hasGBPSetup,
    reviews: hasPlacesSetup ? "places_api" : hasGBPSetup ? "gbp_api" : "not_configured",
    performance: process.env.GMB_LOCATION_NAME ? "configured" : "not_configured",
    placeId: process.env.GMB_PLACE_ID ? "set" : "missing",
    placesApiKey: (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY) ? "set" : "missing",
    accountId: process.env.GMB_ACCOUNT_ID ? "set" : "missing",
    locationId: process.env.GMB_LOCATION_ID ? "set" : "missing",
    locationName: process.env.GMB_LOCATION_NAME ? "set" : "missing",
    serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? "set" : "missing",
  };
}
