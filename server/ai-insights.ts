/**
 * AI Recommendations Engine
 * Gathers all analytics data, competitor info, and sends to Claude
 * for actionable recommendations to stay ahead of local competitors
 */
import { storage } from "./storage";
import { getGAOverview, getGATopPages, getGATrafficSources, getGSCPerformance, getGSCQueries } from "./analytics";
import { getGMBReviews, getGMBPerformance } from "./gmb";
import { getAdsCampaignOverview, getAdsKeywords, getAdsSearchTerms } from "./ads";

const CACHE_TTL_MINUTES = 60; // AI insights refresh hourly

// ═══════════════════════════════════════════════════════════════════════════════
// Gather All Data for AI Analysis
// ═══════════════════════════════════════════════════════════════════════════════

async function gatherAnalyticsSnapshot() {
  // Run all data fetches in parallel — they each have their own caching
  const [ga, topPages, traffic, gsc, queries, gmb, gmbPerf, ads, keywords, searchTerms] =
    await Promise.allSettled([
      getGAOverview(),
      getGATopPages(),
      getGATrafficSources(),
      getGSCPerformance(),
      getGSCQueries(),
      getGMBReviews(),
      getGMBPerformance(),
      getAdsCampaignOverview(),
      getAdsKeywords(),
      getAdsSearchTerms(),
    ]);

  const val = (p: PromiseSettledResult<any>) => p.status === "fulfilled" ? p.value : null;

  return {
    googleAnalytics: {
      overview: val(ga),
      topPages: val(topPages),
      trafficSources: val(traffic),
    },
    searchConsole: {
      performance: val(gsc),
      topQueries: val(queries),
    },
    googleMyBusiness: {
      reviews: val(gmb),
      performance: val(gmbPerf),
    },
    googleAds: {
      campaigns: val(ads),
      keywords: val(keywords),
      searchTerms: val(searchTerms),
    },
  };
}

async function getCompetitors() {
  try {
    const { competitors } = require("@shared/schema");
    const { db } = require("./db");
    const { eq } = require("drizzle-orm");
    const comps = await db.select().from(competitors).where(eq(competitors.isActive, true));
    return comps;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Generate AI Recommendations
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateAIInsights(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await storage.getCachedAnalytics("ai", "insights");
    if (cached) return cached;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      error: "ANTHROPIC_API_KEY not set — needed for AI recommendations",
      configured: false,
    };
  }

  // Gather all data
  const [snapshot, competitorList] = await Promise.all([
    gatherAnalyticsSnapshot(),
    getCompetitors(),
  ]);

  const businessContext = {
    name: "Clear The Clutter Junk Removal",
    location: "Oshkosh, WI (Fox Valley area — Appleton, Neenah, Fond du Lac)",
    services: "Junk removal, garage cleanouts, estate cleanouts, appliance removal, demolition",
    website: "ClearTheClutterJunkRemoval.com",
    uniqueSellingPoints: [
      "5.0 stars on Google (137+ reviews)",
      "2025 Nextdoor Favorite",
      "AI-powered online photo estimates via WhatShouldICharge",
      "Same-day service available",
    ],
  };

  const prompt = `You are an expert local SEO and digital marketing analyst for a junk removal company. Analyze the following business data and competitor information, then provide specific, actionable recommendations.

## Business Context
${JSON.stringify(businessContext, null, 2)}

## Current Analytics Data
${JSON.stringify(snapshot, null, 2)}

## Local Competitors
${JSON.stringify(competitorList.map((c: any) => ({
  name: c.name,
  website: c.website,
  rating: c.gmbRating,
  reviews: c.gmbReviewCount,
  categories: c.gmbCategories,
})), null, 2)}

## Your Task
Provide recommendations in EXACTLY this JSON format (no markdown, no code fences, just valid JSON):
{
  "overallScore": <number 1-100 representing overall digital presence health>,
  "insights": [
    {
      "category": "<seo|ads|gmb|website|content>",
      "priority": "<high|medium|low>",
      "title": "<short action-oriented title>",
      "description": "<2-3 sentence explanation with specific data points>",
      "actionItems": ["<step 1>", "<step 2>", "<step 3>"],
      "competitorContext": "<which competitor this relates to, or null>",
      "estimatedImpact": "<what improvement to expect>"
    }
  ],
  "competitorComparison": {
    "strongerAreas": ["<area where CTC leads>"],
    "weakerAreas": ["<area where competitors lead>"],
    "opportunities": ["<untapped opportunities>"]
  },
  "weeklyPriorities": ["<top 3 things to do this week>"]
}

Focus on:
1. SEO gaps — queries where we show up but don't rank top 3
2. GMB optimization — review response time, post frequency, Q&A
3. Ad efficiency — wasted spend, negative keywords needed, quality score improvements
4. Content gaps — what competitors cover that we don't
5. Conversion optimization — website pages with high traffic but low engagement
6. Local ranking opportunities — specific neighborhoods or service types to target

Be SPECIFIC. Use actual numbers from the data. Reference specific competitors by name. Give step-by-step action items, not vague advice.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";

    // Parse JSON response
    let insights;
    try {
      insights = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response if it has surrounding text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Store individual insights in the database for tracking
    if (insights.insights) {
      for (const insight of insights.insights) {
        try {
          const { aiInsights } = require("@shared/schema");
          const { db } = require("./db");
          await db.insert(aiInsights).values({
            category: insight.category,
            priority: insight.priority,
            title: insight.title,
            description: insight.description,
            actionItems: JSON.stringify(insight.actionItems),
            competitorContext: insight.competitorContext,
            status: "new",
          });
        } catch (dbErr) {
          // Non-critical — log and continue
          console.error("Failed to store insight:", dbErr);
        }
      }
    }

    const result = {
      configured: true,
      generatedAt: new Date().toISOString(),
      ...insights,
    };

    await storage.setCachedAnalytics("ai", "insights", result, CACHE_TTL_MINUTES);
    return result;
  } catch (e: any) {
    console.error("AI insights error:", e.message);
    return { error: e.message, configured: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Get Stored Insights History
// ═══════════════════════════════════════════════════════════════════════════════

export async function getInsightsHistory() {
  try {
    const { aiInsights } = require("@shared/schema");
    const { db } = require("./db");
    const { desc } = require("drizzle-orm");
    return await db.select().from(aiInsights).orderBy(desc(aiInsights.generatedAt)).limit(50);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update Insight Status
// ═══════════════════════════════════════════════════════════════════════════════

export async function updateInsightStatus(id: number, status: string) {
  try {
    const { aiInsights } = require("@shared/schema");
    const { db } = require("./db");
    const { eq } = require("drizzle-orm");
    const updates: any = { status };
    if (status === "completed") updates.completedAt = new Date();
    const [result] = await db.update(aiInsights).set(updates).where(eq(aiInsights.id, id)).returning();
    return result;
  } catch (e: any) {
    return { error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Quick Health Check (doesn't use AI — just checks data)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getQuickHealthCheck() {
  const cached = await storage.getCachedAnalytics("ai", "health-check");
  if (cached) return cached;

  const [ga, gsc, gmb, ads] = await Promise.allSettled([
    getGAOverview(),
    getGSCPerformance(),
    getGMBReviews(),
    getAdsCampaignOverview(),
  ]);

  const val = (p: PromiseSettledResult<any>) => p.status === "fulfilled" ? p.value : null;
  const gaData = val(ga);
  const gscData = val(gsc);
  const gmbData = val(gmb);
  const adsData = val(ads);

  const checks = [];

  // GA checks
  if (gaData?.configured && !gaData.error) {
    if (gaData.bounceRate > 70) {
      checks.push({ area: "Website", status: "warning", message: `High bounce rate: ${gaData.bounceRate.toFixed(0)}%` });
    } else {
      checks.push({ area: "Website", status: "good", message: `Bounce rate: ${gaData.bounceRate.toFixed(0)}%` });
    }
    checks.push({ area: "Traffic", status: gaData.sessions > 100 ? "good" : "warning", message: `${gaData.sessions} sessions last 30 days` });
  } else {
    checks.push({ area: "Website", status: "missing", message: "Google Analytics not connected" });
  }

  // GSC checks
  if (gscData?.configured && !gscData.error) {
    const pos = parseFloat(gscData.position);
    checks.push({
      area: "Search Ranking",
      status: pos < 10 ? "good" : pos < 20 ? "warning" : "critical",
      message: `Average position: ${gscData.position} | CTR: ${gscData.ctr}%`,
    });
  } else {
    checks.push({ area: "Search", status: "missing", message: "Search Console not connected" });
  }

  // GMB checks
  if (gmbData?.configured && !gmbData.error) {
    checks.push({
      area: "Google Reviews",
      status: gmbData.averageRating >= 4.5 ? "good" : "warning",
      message: `${gmbData.averageRating} stars (${gmbData.totalReviews} reviews)`,
    });
    if (gmbData.unrepliedCount > 0) {
      checks.push({
        area: "Review Responses",
        status: "warning",
        message: `${gmbData.unrepliedCount} unreplied reviews — respond ASAP`,
      });
    }
  } else {
    checks.push({ area: "GMB", status: "missing", message: "Google My Business not connected" });
  }

  // Ads checks
  if (adsData?.configured && !adsData.error) {
    checks.push({
      area: "Ad Spend",
      status: "info",
      message: `$${adsData.totalSpend.toFixed(0)} spent → ${adsData.totalClicks} clicks → ${adsData.totalConversions} conversions`,
    });
    if (adsData.costPerConversion > 50) {
      checks.push({
        area: "Ad Efficiency",
        status: "warning",
        message: `Cost per conversion: $${adsData.costPerConversion.toFixed(2)} — aim for under $30`,
      });
    }
  } else {
    checks.push({ area: "Ads", status: "missing", message: "Google Ads not connected" });
  }

  const result = { checks, timestamp: new Date().toISOString() };
  await storage.setCachedAnalytics("ai", "health-check", result, CACHE_TTL_MINUTES);
  return result;
}
