import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Globe, MousePointerClick, Clock, TrendingUp, Search,
  Facebook, Activity, ExternalLink, AlertCircle, Star, MapPin,
  DollarSign, Megaphone, MessageSquare
} from "lucide-react";

interface AnalyticsData {
  sessions: number;
  clicks: number;
  avgSession: string;
  dailySessions: number[];
  topQueries: { query: string; clicks: number; impressions: number; ctr?: string; position?: string }[];
  ga?: any;
  gsc?: any;
  error?: string;
}

interface AnalyticsStatus {
  ga: { configured: boolean; propertyId: string; serviceAccount: string };
  gsc: { configured: boolean; siteUrl: string; serviceAccount: string };
  fb: { configured: boolean; pageId: string; accessToken: string };
  gmb?: { configured: boolean; accountId: string; locationId: string };
  ads?: { configured: boolean; customerId: string; developerToken: string };
  ai?: { configured: boolean; apiKey: string };
}

interface GATopPages { configured: boolean; pages: { path: string; pageviews: number; sessions: number }[]; error?: string }
interface GATrafficSources { configured: boolean; sources: { channel: string; sessions: number; users: number }[]; error?: string }
interface FBInsights { configured: boolean; impressions: number; engagedUsers: number; totalFans: number; error?: string }
interface FBPosts { configured: boolean; posts: { id: string; message: string; createdAt: string; likes: number; comments: number; shares: number }[]; error?: string }

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading } = useQuery<AnalyticsData>({ queryKey: ["/api/analytics/live"] });
  const { data: status } = useQuery<AnalyticsStatus>({ queryKey: ["/api/analytics/status"] });
  const { data: topPages } = useQuery<GATopPages>({ queryKey: ["/api/analytics/ga/top-pages"], enabled: activeTab === "ga" });
  const { data: trafficSources } = useQuery<GATrafficSources>({ queryKey: ["/api/analytics/ga/traffic-sources"], enabled: activeTab === "ga" });
  const { data: fbInsights } = useQuery<FBInsights>({ queryKey: ["/api/analytics/fb/page-insights"], enabled: activeTab === "facebook" });
  const { data: fbPosts } = useQuery<FBPosts>({ queryKey: ["/api/analytics/fb/posts"], enabled: activeTab === "facebook" });

  // GMB data
  const { data: gmbReviews } = useQuery<any>({ queryKey: ["/api/gmb/reviews"], enabled: activeTab === "gmb" });
  const { data: gmbPerformance } = useQuery<any>({ queryKey: ["/api/gmb/performance"], enabled: activeTab === "gmb" });
  const { data: gmbPosts } = useQuery<any>({ queryKey: ["/api/gmb/posts"], enabled: activeTab === "gmb" });

  // Ads data
  const { data: adsCampaigns } = useQuery<any>({ queryKey: ["/api/ads/campaigns"], enabled: activeTab === "ads" });
  const { data: adsKeywords } = useQuery<any>({ queryKey: ["/api/ads/keywords"], enabled: activeTab === "ads" });
  const { data: adsDailySpend } = useQuery<any>({ queryKey: ["/api/ads/daily-spend"], enabled: activeTab === "ads" });

  const stats = [
    { title: "Total Sessions", value: data?.sessions?.toLocaleString() ?? "0", icon: Globe, iconBg: "bg-blue-500/10", iconColor: "text-blue-400", subtitle: "Last 30 days" },
    { title: "Search Clicks", value: data?.clicks?.toLocaleString() ?? "0", icon: MousePointerClick, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400", subtitle: "From Google" },
    { title: "Avg Session", value: data?.avgSession ?? "-", icon: Clock, iconBg: "bg-amber-500/10", iconColor: "text-amber-400", subtitle: "Duration" },
  ];

  const maxSession = Math.max(...(data?.dailySessions ?? [1]), 1);
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function ConfigBanner({ service, fields }: { service: string; fields: Record<string, string> }) {
    const missing = Object.entries(fields).filter(([, v]) => v === "missing");
    if (missing.length === 0) return null;
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-amber-300 font-medium">{service} not configured</p>
            <p className="text-xs text-slate-400 mt-1">
              Missing env vars: {missing.map(([k]) => k).join(", ")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-slate-400 text-sm">Website, search, ads & reputation performance</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-[#2d3344] bg-[#1d2332]">
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-3 bg-slate-700/50 rounded w-24" />
                  <div className="h-8 bg-slate-700/50 rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {stats.map((s) => (
              <Card key={s.title} className="border-[#2d3344] bg-[#1d2332] hover:border-[#363d4f] transition-all duration-200 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{s.title}</p>
                      <p className="text-3xl font-bold text-white tracking-tight">{s.value}</p>
                      <p className="text-[11px] text-slate-500">{s.subtitle}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                      <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="bg-[#1d2332] border border-[#2d3344] flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#2d3344] data-[state=active]:text-white text-slate-400">
                <Activity className="w-3.5 h-3.5 mr-1.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="ga" className="data-[state=active]:bg-[#2d3344] data-[state=active]:text-white text-slate-400">
                <Globe className="w-3.5 h-3.5 mr-1.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="search" className="data-[state=active]:bg-[#2d3344] data-[state=active]:text-white text-slate-400">
                <Search className="w-3.5 h-3.5 mr-1.5" /> Search
              </TabsTrigger>
              <TabsTrigger value="gmb" className="data-[state=active]:bg-[#2d3344] data-[state=active]:text-white text-slate-400">
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> Google Business
              </TabsTrigger>
              <TabsTrigger value="ads" className="data-[state=active]:bg-[#2d3344] data-[state=active]:text-white text-slate-400">
                <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Google Ads
              </TabsTrigger>
              <TabsTrigger value="facebook" className="data-[state=active]:bg-[#2d3344] data-[state=active]:text-white text-slate-400">
                <Facebook className="w-3.5 h-3.5 mr-1.5" /> Facebook
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="border-[#2d3344] bg-[#1d2332]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                      Daily Sessions (Last 7 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data?.dailySessions && data.dailySessions.length > 0 ? (
                      <div className="flex items-end gap-3 h-44 pt-4">
                        {data.dailySessions.map((val, i) => {
                          const height = (val / maxSession) * 100;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-medium">{val}</span>
                              <div className="w-full relative group">
                                <div
                                  className="w-full rounded-t-md bg-gradient-to-t from-orange-600 to-orange-400 group-hover:from-orange-500 group-hover:to-orange-300 transition-all duration-300 min-h-[4px]"
                                  style={{ height: `${Math.max(height, 4)}px` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">{dayLabels[i] ?? ""}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
                        {status?.ga.configured ? "Loading session data..." : "Configure Google Analytics to see session data"}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-[#2d3344] bg-[#1d2332]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Search className="w-4 h-4 text-orange-400" />
                      Top Search Queries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data?.topQueries && data.topQueries.length > 0 ? (
                      <div className="space-y-1">
                        {data.topQueries.map((q, i) => (
                          <div key={i} className="flex items-center justify-between py-3 border-b border-[#2d3344] last:border-0 group hover:bg-white/[0.01] -mx-2 px-2 rounded transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-600 font-mono w-5">{i + 1}.</span>
                              <span className="text-sm text-white font-medium">{q.query}</span>
                            </div>
                            <div className="flex gap-6 text-xs">
                              <span className="text-orange-400 font-medium">{q.clicks} <span className="text-slate-500">clicks</span></span>
                              <span className="text-slate-400">{q.impressions} <span className="text-slate-500">imp</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
                        {status?.gsc.configured ? "Loading search data..." : "Configure Search Console to see query data"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Google Analytics Tab */}
            <TabsContent value="ga" className="space-y-5">
              {status && <ConfigBanner service="Google Analytics" fields={{ GA4_PROPERTY_ID: status.ga.propertyId, GOOGLE_SERVICE_ACCOUNT_KEY: status.ga.serviceAccount }} />}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="border-[#2d3344] bg-[#1d2332]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-400" /> Traffic Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trafficSources?.sources && trafficSources.sources.length > 0 ? (
                      <div className="space-y-2">
                        {trafficSources.sources.map((s, i) => {
                          const maxSessions = trafficSources.sources[0]?.sessions ?? 1;
                          const pct = Math.round((s.sessions / maxSessions) * 100);
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-white font-medium">{s.channel}</span>
                                <span className="text-slate-400">{s.sessions} sessions</span>
                              </div>
                              <div className="w-full bg-[#2d3344] rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                        {status?.ga.configured ? "Loading traffic sources..." : "Not configured"}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-[#2d3344] bg-[#1d2332]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" /> Top Pages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topPages?.pages && topPages.pages.length > 0 ? (
                      <div className="space-y-1">
                        {topPages.pages.slice(0, 8).map((p, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-[#2d3344] last:border-0">
                            <span className="text-sm text-white font-mono truncate max-w-[60%]">{p.path}</span>
                            <span className="text-xs text-slate-400">{p.pageviews} views</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                        {status?.ga.configured ? "Loading pages..." : "Not configured"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Search Console Tab */}
            <TabsContent value="search" className="space-y-5">
              {status && <ConfigBanner service="Search Console" fields={{ GSC_SITE_URL: status.gsc.siteUrl, GOOGLE_SERVICE_ACCOUNT_KEY: status.gsc.serviceAccount }} />}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: "Clicks", value: data?.gsc?.clicks?.toLocaleString() ?? "0", color: "text-blue-400" },
                  { title: "Impressions", value: data?.gsc?.impressions?.toLocaleString() ?? "0", color: "text-emerald-400" },
                  { title: "Avg CTR", value: `${data?.gsc?.ctr ?? 0}%`, color: "text-amber-400" },
                  { title: "Avg Position", value: data?.gsc?.position ?? "-", color: "text-purple-400" },
                ].map((m) => (
                  <Card key={m.title} className="border-[#2d3344] bg-[#1d2332]">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{m.title}</p>
                      <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-[#2d3344] bg-[#1d2332]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Search className="w-4 h-4 text-orange-400" /> Search Queries (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.topQueries && data.topQueries.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#2d3344]">
                            <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2 font-semibold">Query</th>
                            <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2 font-semibold">Clicks</th>
                            <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2 font-semibold">Impressions</th>
                            <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2 font-semibold">CTR</th>
                            <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2 font-semibold">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topQueries.map((q, i) => (
                            <tr key={i} className="border-b border-[#2d3344] last:border-0 hover:bg-white/[0.01]">
                              <td className="py-2.5 text-white font-medium">{q.query}</td>
                              <td className="py-2.5 text-right text-orange-400 font-medium">{q.clicks}</td>
                              <td className="py-2.5 text-right text-slate-400">{q.impressions}</td>
                              <td className="py-2.5 text-right text-slate-400">{q.ctr ?? "-"}%</td>
                              <td className="py-2.5 text-right text-slate-400">{q.position ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                      {status?.gsc.configured ? "Loading queries..." : "Configure Search Console to see query data"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Google My Business Tab */}
            <TabsContent value="gmb" className="space-y-5">
              {status?.gmb && <ConfigBanner service="Google Business Profile" fields={{ GMB_ACCOUNT_ID: status.gmb.accountId, GMB_LOCATION_ID: status.gmb.locationId ?? "missing" }} />}

              {/* Review Summary */}
              {gmbReviews?.configured && !gmbReviews.error && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-[#2d3344] bg-[#1d2332]">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Rating</p>
                        <div className="flex items-center justify-center gap-2">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          <p className="text-2xl font-bold text-yellow-400">{gmbReviews.averageRating}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-[#2d3344] bg-[#1d2332]">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Reviews</p>
                        <p className="text-2xl font-bold text-blue-400">{gmbReviews.totalReviews}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-[#2d3344] bg-[#1d2332]">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Unreplied</p>
                        <p className={`text-2xl font-bold ${gmbReviews.unrepliedCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                          {gmbReviews.unrepliedCount}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-[#2d3344] bg-[#1d2332]">
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Breakdown</p>
                        {gmbReviews.ratingBreakdown && Object.entries(gmbReviews.ratingBreakdown).reverse().map(([stars, count]) => (
                          <div key={stars} className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 w-3">{stars}</span>
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <div className="flex-1 bg-[#2d3344] rounded-full h-1.5">
                              <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${gmbReviews.totalReviews > 0 ? ((count as number) / gmbReviews.totalReviews * 100) : 0}%` }} />
                            </div>
                            <span className="text-slate-500 w-5 text-right">{count as number}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Reviews */}
                  <Card className="border-[#2d3344] bg-[#1d2332]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-yellow-400" /> Recent Reviews
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(gmbReviews.reviews ?? []).slice(0, 10).map((r: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-[#161b28] border border-[#2d3344]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white font-medium">{r.reviewer}</span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, s) => {
                                  const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
                                  const rating = stars[r.starRating] ?? 5;
                                  return (
                                    <Star key={s} className={`w-3 h-3 ${s < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-600"}`} />
                                  );
                                })}
                              </div>
                            </div>
                            {r.comment && <p className="text-sm text-slate-300">{r.comment.substring(0, 200)}{r.comment.length > 200 ? "..." : ""}</p>}
                            {r.hasReply && (
                              <div className="mt-2 pl-3 border-l-2 border-orange-500/30">
                                <p className="text-xs text-slate-400">{r.replyComment?.substring(0, 150)}</p>
                              </div>
                            )}
                            {!r.hasReply && (
                              <p className="text-xs text-red-400 mt-2">Needs reply</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* GMB Performance */}
              {gmbPerformance?.configured && !gmbPerformance.error && gmbPerformance.websiteClicks !== undefined && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: "Website Clicks", value: gmbPerformance.websiteClicks, color: "text-blue-400" },
                    { title: "Phone Calls", value: gmbPerformance.phoneCallClicks, color: "text-emerald-400" },
                    { title: "Direction Requests", value: gmbPerformance.directionRequests, color: "text-purple-400" },
                    { title: "Search Views", value: gmbPerformance.searchImpressions, color: "text-amber-400" },
                  ].map((m) => (
                    <Card key={m.title} className="border-[#2d3344] bg-[#1d2332]">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{m.title}</p>
                        <p className={`text-2xl font-bold ${m.color}`}>{(m.value ?? 0).toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500 mt-1">Last 30 days</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {(!gmbReviews || gmbReviews.error) && (!gmbPerformance || gmbPerformance.error) && (
                <Card className="border-[#2d3344] bg-[#1d2332]">
                  <CardContent className="p-8 text-center">
                    <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">
                      {gmbReviews?.error || gmbPerformance?.error || "Configure Google Business Profile to see reviews & performance"}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Required: GMB_ACCOUNT_ID, GMB_LOCATION_ID, GOOGLE_SERVICE_ACCOUNT_KEY
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Google Ads Tab */}
            <TabsContent value="ads" className="space-y-5">
              {status?.ads && <ConfigBanner service="Google Ads" fields={{ GOOGLE_ADS_CUSTOMER_ID: status.ads.customerId, GOOGLE_ADS_DEVELOPER_TOKEN: status.ads.developerToken }} />}

              {adsCampaigns?.configured && !adsCampaigns.error && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { title: "Total Spend", value: `$${adsCampaigns.totalSpend?.toLocaleString() ?? "0"}`, color: "text-red-400" },
                      { title: "Total Clicks", value: adsCampaigns.totalClicks?.toLocaleString() ?? "0", color: "text-blue-400" },
                      { title: "Conversions", value: adsCampaigns.totalConversions?.toFixed(0) ?? "0", color: "text-emerald-400" },
                      { title: "Cost/Conversion", value: `$${adsCampaigns.costPerConversion?.toFixed(2) ?? "0"}`, color: "text-amber-400" },
                    ].map((m) => (
                      <Card key={m.title} className="border-[#2d3344] bg-[#1d2332]">
                        <CardContent className="p-4 text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{m.title}</p>
                          <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                          <p className="text-[11px] text-slate-500 mt-1">Last 30 days</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Campaign Table */}
                  <Card className="border-[#2d3344] bg-[#1d2332]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-orange-400" /> Campaigns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#2d3344]">
                              <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2">Campaign</th>
                              <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2">Spend</th>
                              <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2">Clicks</th>
                              <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2">CTR</th>
                              <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2">Conv.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(adsCampaigns.campaigns ?? []).map((c: any, i: number) => (
                              <tr key={i} className="border-b border-[#2d3344] last:border-0 hover:bg-white/[0.01]">
                                <td className="py-2.5">
                                  <span className="text-white font-medium">{c.name}</span>
                                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${c.status === "ENABLED" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                                    {c.status}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right text-red-400">${c.cost?.toFixed(2)}</td>
                                <td className="py-2.5 text-right text-slate-300">{c.clicks?.toLocaleString()}</td>
                                <td className="py-2.5 text-right text-slate-400">{(c.ctr * 100)?.toFixed(1)}%</td>
                                <td className="py-2.5 text-right text-emerald-400">{c.conversions?.toFixed(0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Keywords */}
              {adsKeywords?.configured && !adsKeywords.error && adsKeywords.keywords?.length > 0 && (
                <Card className="border-[#2d3344] bg-[#1d2332]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-400" /> Top Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#2d3344]">
                            <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2">Keyword</th>
                            <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2">Clicks</th>
                            <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2">Cost</th>
                            <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2">Conv.</th>
                            <th className="text-right text-xs text-slate-400 uppercase tracking-wider py-2">QS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adsKeywords.keywords.slice(0, 15).map((k: any, i: number) => (
                            <tr key={i} className="border-b border-[#2d3344] last:border-0 hover:bg-white/[0.01]">
                              <td className="py-2.5 text-white font-medium">{k.keyword}</td>
                              <td className="py-2.5 text-right text-slate-300">{k.clicks}</td>
                              <td className="py-2.5 text-right text-red-400">${k.cost?.toFixed(2)}</td>
                              <td className="py-2.5 text-right text-emerald-400">{k.conversions?.toFixed(0)}</td>
                              <td className="py-2.5 text-right">
                                <span className={`${k.qualityScore >= 7 ? "text-emerald-400" : k.qualityScore >= 5 ? "text-amber-400" : "text-red-400"}`}>
                                  {k.qualityScore ?? "-"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(!adsCampaigns || adsCampaigns.error) && (
                <Card className="border-[#2d3344] bg-[#1d2332]">
                  <CardContent className="p-8 text-center">
                    <Megaphone className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">
                      {adsCampaigns?.error || "Configure Google Ads to see campaign performance"}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Required: GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Facebook Tab */}
            <TabsContent value="facebook" className="space-y-5">
              {status && <ConfigBanner service="Facebook" fields={{ FB_PAGE_ID: status.fb.pageId, FB_PAGE_ACCESS_TOKEN: status.fb.accessToken }} />}
              {fbInsights?.configured && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Page Impressions", value: fbInsights.impressions?.toLocaleString() ?? "0", color: "text-blue-400" },
                    { title: "Engaged Users", value: fbInsights.engagedUsers?.toLocaleString() ?? "0", color: "text-emerald-400" },
                    { title: "Total Fans", value: fbInsights.totalFans?.toLocaleString() ?? "0", color: "text-purple-400" },
                  ].map((m) => (
                    <Card key={m.title} className="border-[#2d3344] bg-[#1d2332]">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{m.title}</p>
                        <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <Card className="border-[#2d3344] bg-[#1d2332]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-500" /> Recent Posts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fbPosts?.posts && fbPosts.posts.length > 0 ? (
                    <div className="space-y-3">
                      {fbPosts.posts.map((post, i) => (
                        <div key={i} className="p-3 rounded-lg bg-[#161b28] border border-[#2d3344]">
                          <p className="text-sm text-white">{post.message}</p>
                          <div className="flex gap-4 mt-2 text-xs text-slate-400">
                            <span>{post.likes} likes</span>
                            <span>{post.comments} comments</span>
                            <span>{post.shares} shares</span>
                            <span className="ml-auto">{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                      {status?.fb.configured ? "Loading posts..." : "Configure Facebook to see post data"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
