/**
 * Google Ads Integration
 * Connects to Google Ads API for campaign performance, keywords, and spend
 * All responses are cached in PostgreSQL to prevent rate limit issues
 *
 * SETUP REQUIREMENTS:
 * - GOOGLE_ADS_DEVELOPER_TOKEN: Apply at https://ads.google.com/aw/apicenter
 * - GOOGLE_ADS_CUSTOMER_ID: Your Google Ads account ID (no dashes, e.g., 1234567890)
 * - GOOGLE_ADS_LOGIN_CUSTOMER_ID: Manager account ID if using MCC (optional)
 * - Uses the same GOOGLE_SERVICE_ACCOUNT_KEY for auth
 */
import { storage } from "./storage";

const CACHE_TTL_MINUTES = 15; // Ads data changes less frequently

// ═══════════════════════════════════════════════════════════════════════════════
// Google Ads Auth & Fetch
// ═══════════════════════════════════════════════════════════════════════════════

async function getAdsAccessToken() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;
  try {
    const { google } = require("googleapis");
    const key = JSON.parse(keyJson);
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/adwords"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token?.token ?? null;
  } catch (e: any) {
    console.error("Ads auth error:", e.message);
    return null;
  }
}

async function adsQuery(query: string) {
  const token = await getAdsAccessToken();
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  if (!token || !devToken || !customerId) {
    throw new Error("Google Ads not fully configured");
  }

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  const res = await fetch(
    `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // searchStream returns an array of result batches
  const results: any[] = [];
  for (const batch of data) {
    if (batch.results) results.push(...batch.results);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Campaign Overview (last 30 days)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAdsCampaignOverview() {
  const cached = await storage.getCachedAnalytics("ads", "campaign-overview");
  if (cached) return cached;

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!customerId || !devToken) {
    return { error: "GOOGLE_ADS_CUSTOMER_ID or GOOGLE_ADS_DEVELOPER_TOKEN not set", configured: false };
  }

  try {
    const results = await adsQuery(`
      SELECT
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `);

    const campaigns = results.map((r: any) => ({
      name: r.campaign?.name ?? "Unknown",
      status: r.campaign?.status ?? "UNKNOWN",
      channelType: r.campaign?.advertisingChannelType ?? "UNKNOWN",
      impressions: parseInt(r.metrics?.impressions ?? "0"),
      clicks: parseInt(r.metrics?.clicks ?? "0"),
      costMicros: parseInt(r.metrics?.costMicros ?? "0"),
      cost: parseInt(r.metrics?.costMicros ?? "0") / 1_000_000,
      conversions: parseFloat(r.metrics?.conversions ?? "0"),
      conversionValue: parseFloat(r.metrics?.conversionsValue ?? "0"),
      ctr: parseFloat(r.metrics?.ctr ?? "0"),
      avgCpc: parseInt(r.metrics?.averageCpc ?? "0") / 1_000_000,
      costPerConversion: parseInt(r.metrics?.costPerConversion ?? "0") / 1_000_000,
    }));

    // Calculate totals
    const totalSpend = campaigns.reduce((s: number, c: any) => s + c.cost, 0);
    const totalClicks = campaigns.reduce((s: number, c: any) => s + c.clicks, 0);
    const totalImpressions = campaigns.reduce((s: number, c: any) => s + c.impressions, 0);
    const totalConversions = campaigns.reduce((s: number, c: any) => s + c.conversions, 0);

    const result = {
      configured: true,
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      totalClicks,
      totalImpressions,
      totalConversions: parseFloat(totalConversions.toFixed(1)),
      avgCtr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
      avgCostPerClick: totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0,
      costPerConversion: totalConversions > 0 ? parseFloat((totalSpend / totalConversions).toFixed(2)) : 0,
      campaigns,
    };

    await storage.setCachedAnalytics("ads", "campaign-overview", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("Ads campaign overview error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Top Keywords (last 30 days)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAdsKeywords() {
  const cached = await storage.getCachedAnalytics("ads", "keywords");
  if (cached) return cached;

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!customerId || !devToken) {
    return { error: "Google Ads not configured", configured: false };
  }

  try {
    const results = await adsQuery(`
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.quality_info.quality_score,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_position
      FROM keyword_view
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
      LIMIT 30
    `);

    const keywords = results.map((r: any) => ({
      keyword: r.adGroupCriterion?.keyword?.text ?? "Unknown",
      matchType: r.adGroupCriterion?.keyword?.matchType ?? "UNKNOWN",
      qualityScore: r.adGroupCriterion?.qualityInfo?.qualityScore ?? null,
      impressions: parseInt(r.metrics?.impressions ?? "0"),
      clicks: parseInt(r.metrics?.clicks ?? "0"),
      cost: parseInt(r.metrics?.costMicros ?? "0") / 1_000_000,
      conversions: parseFloat(r.metrics?.conversions ?? "0"),
      ctr: parseFloat(r.metrics?.ctr ?? "0"),
      avgCpc: parseInt(r.metrics?.averageCpc ?? "0") / 1_000_000,
    }));

    const result = { configured: true, keywords };
    await storage.setCachedAnalytics("ads", "keywords", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("Ads keywords error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Daily Spend Trend (last 14 days)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAdsDailySpend() {
  const cached = await storage.getCachedAnalytics("ads", "daily-spend");
  if (cached) return cached;

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!customerId || !devToken) {
    return { error: "Google Ads not configured", configured: false };
  }

  try {
    const results = await adsQuery(`
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_14_DAYS
      ORDER BY segments.date ASC
    `);

    // Aggregate by date (campaigns are separate rows)
    const byDate: Record<string, { impressions: number; clicks: number; cost: number; conversions: number }> = {};
    for (const r of results) {
      const date = r.segments?.date;
      if (!date) continue;
      if (!byDate[date]) byDate[date] = { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
      byDate[date].impressions += parseInt(r.metrics?.impressions ?? "0");
      byDate[date].clicks += parseInt(r.metrics?.clicks ?? "0");
      byDate[date].cost += parseInt(r.metrics?.costMicros ?? "0") / 1_000_000;
      byDate[date].conversions += parseFloat(r.metrics?.conversions ?? "0");
    }

    const days = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, m]) => ({
        date,
        impressions: m.impressions,
        clicks: m.clicks,
        cost: parseFloat(m.cost.toFixed(2)),
        conversions: parseFloat(m.conversions.toFixed(1)),
      }));

    const result = { configured: true, days };
    await storage.setCachedAnalytics("ads", "daily-spend", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("Ads daily spend error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Search Terms Report (what people actually searched)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAdsSearchTerms() {
  const cached = await storage.getCachedAnalytics("ads", "search-terms");
  if (cached) return cached;

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!customerId || !devToken) {
    return { error: "Google Ads not configured", configured: false };
  }

  try {
    const results = await adsQuery(`
      SELECT
        search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM search_term_view
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
      LIMIT 25
    `);

    const terms = results.map((r: any) => ({
      searchTerm: r.searchTermView?.searchTerm ?? "Unknown",
      impressions: parseInt(r.metrics?.impressions ?? "0"),
      clicks: parseInt(r.metrics?.clicks ?? "0"),
      cost: parseFloat((parseInt(r.metrics?.costMicros ?? "0") / 1_000_000).toFixed(2)),
      conversions: parseFloat(r.metrics?.conversions ?? "0"),
    }));

    const result = { configured: true, terms };
    await storage.setCachedAnalytics("ads", "search-terms", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("Ads search terms error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status check
// ═══════════════════════════════════════════════════════════════════════════════

export function getAdsStatus() {
  return {
    configured: !!process.env.GOOGLE_ADS_CUSTOMER_ID && !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID ? "set" : "missing",
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? "set" : "missing",
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ? "set" : "not set (optional)",
    serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? "set" : "missing",
  };
}
