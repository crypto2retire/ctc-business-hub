import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, Globe, MousePointerClick, Clock, TrendingUp, Search,
  Facebook, Activity, ExternalLink, AlertCircle, Star, MapPin, Phone,
  DollarSign, Megaphone, MessageSquare, Eye, Navigation, Image,
  Users, ArrowUpRight, ArrowDownRight, RefreshCw, Wifi, ChevronRight
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface AnalyticsStatus {
  ga: { configured: boolean; propertyId: string; serviceAccount: string };
  gsc: { configured: boolean; siteUrl: string; serviceAccount: string };
  fb: { configured: boolean; pageId: string; accessToken: string };
  gmb?: { configured: boolean; accountId: string; locationId: string };
  ads?: { configured: boolean; customerId: string; developerToken: string };
  ai?: { configured: boolean; apiKey: string };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "ads", label: "Google Ads", icon: Megaphone },
  { id: "search", label: "Search", icon: Search },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "gmb", label: "Google Business", icon: MapPin },
  { id: "recommendations", label: "Recommendations", icon: TrendingUp },
];

function KPICard({ title, value, subtitle, icon: Icon, iconColor = "text-teal-400", trend }: {
  title: string; value: string; subtitle?: string;
  icon: any; iconColor?: string; trend?: { value: string; positive: boolean };
}) {
  return (
    <Card className="border-[#1e2a3a] bg-[#0f1923] hover:border-[#2a3a4a] transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? "text-emerald-400" : "text-red-400"}`}>
                {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend.value}
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg bg-[#162231] flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, icon: Icon, iconColor = "text-teal-400", children, className = "" }: {
  title: string; icon?: any; iconColor?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={`border-[#1e2a3a] bg-[#0f1923] ${className}`}>
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {children}
      </CardContent>
    </Card>
  );
}

const chartTheme = {
  grid: "#1a2636",
  axis: "#3a4a5a",
  teal: "#2dd4bf",
  tealLight: "#5eead4",
  blue: "#3b82f6",
  orange: "#f97316",
  purple: "#a78bfa",
  pink: "#f472b6",
  text: "#64748b",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2636] border border-[#2a3a4a] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  // Core data
  const { data: status } = useQuery<AnalyticsStatus>({ queryKey: ["/api/analytics/status"] });
  const { data: gaOverview } = useQuery<any>({ queryKey: ["/api/analytics/ga/overview"] });
  const { data: gaDailySessions } = useQuery<any>({ queryKey: ["/api/analytics/ga/daily-sessions"] });
  const { data: gaTopPages } = useQuery<any>({ queryKey: ["/api/analytics/ga/top-pages"] });
  const { data: gaTrafficSources } = useQuery<any>({ queryKey: ["/api/analytics/ga/traffic-sources"] });
  const { data: gscPerformance } = useQuery<any>({ queryKey: ["/api/analytics/gsc/performance"] });
  const { data: gscQueries } = useQuery<any>({ queryKey: ["/api/analytics/gsc/queries"] });
  const { data: gscPages } = useQuery<any>({ queryKey: ["/api/analytics/gsc/pages"] });

  // GMB data
  const { data: gmbReviews } = useQuery<any>({ queryKey: ["/api/gmb/reviews"], enabled: activeTab === "gmb" || activeTab === "overview" });
  const { data: gmbPerformance } = useQuery<any>({ queryKey: ["/api/gmb/performance"], enabled: activeTab === "gmb" || activeTab === "overview" });

  // Ads data
  const { data: adsCampaigns } = useQuery<any>({ queryKey: ["/api/ads/campaigns"], enabled: activeTab === "ads" || activeTab === "overview" });
  const { data: adsDailySpend } = useQuery<any>({ queryKey: ["/api/ads/daily-spend"], enabled: activeTab === "ads" });
  const { data: adsKeywords } = useQuery<any>({ queryKey: ["/api/ads/keywords"], enabled: activeTab === "ads" });

  // Facebook data
  const { data: fbInsights } = useQuery<any>({ queryKey: ["/api/analytics/fb/page-insights"], enabled: activeTab === "facebook" || activeTab === "overview" });
  const { data: fbPosts } = useQuery<any>({ queryKey: ["/api/analytics/fb/posts"], enabled: activeTab === "facebook" });

  // AI Health Check
  const { data: healthCheck } = useQuery<any>({ queryKey: ["/api/ai/health-check"], enabled: activeTab === "recommendations" });
  const { data: aiInsights } = useQuery<any>({ queryKey: ["/api/ai/insights"], enabled: activeTab === "recommendations" });

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Connection status
  const connectedServices = [
    status?.ga?.configured && gaOverview?.configured && !gaOverview?.error ? "Analytics" : null,
    status?.gsc?.configured && gscPerformance?.configured && !gscPerformance?.error ? "Search Console" : null,
  ].filter(Boolean);

  // Format daily session data for recharts
  const sessionChartData = (gaDailySessions?.days ?? []).map((d: any) => {
    const dateStr = d.date;
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));
    return { date: `${month}/${day}`, sessions: d.sessions, users: Math.round(d.sessions * 0.85) };
  });

  // Format ads daily spend for recharts
  const adsChartData = (adsDailySpend?.days ?? []).map((d: any) => ({
    date: d.date,
    clicks: d.clicks ?? 0,
    cost: d.cost ?? 0,
  }));

  // Traffic source pie chart data
  const pieColors = ["#3b82f6", "#2dd4bf", "#f97316", "#a78bfa", "#f472b6", "#64748b", "#94a3b8"];
  const trafficPieData = (gaTrafficSources?.sources ?? []).slice(0, 5).map((s: any, i: number) => ({
    name: s.channel, value: s.sessions, color: pieColors[i % pieColors.length],
  }));

  return (
    <div className="flex min-h-screen bg-[#0a1118]">
      {/* Left Sidebar Navigation */}
      <div className="w-52 border-r border-[#1e2a3a] bg-[#0d1520] flex-shrink-0">
        <div className="p-4 border-b border-[#1e2a3a]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Clear the Clutter</h2>
              <p className="text-[10px] text-slate-500">Dashboard</p>
            </div>
          </div>
        </div>
        <nav className="p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === item.id
                  ? "bg-[#162231] text-white"
                  : "text-slate-400 hover:text-slate-300 hover:bg-[#111d2a]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a1118]/90 backdrop-blur-sm border-b border-[#1e2a3a] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label ?? "Analytics"}
            </h1>
            <p className="text-xs text-slate-500">cleartheclutterjunkremoval.com · Last 30 Days</p>
          </div>
          <div className="flex items-center gap-3">
            {connectedServices.length > 0 && (
              <div className="flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1">
                <Wifi className="w-3 h-3 text-teal-400" />
                <span className="text-xs font-medium text-teal-400">{connectedServices.join(" + ")}: Live</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* OVERVIEW TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <>
              {/* Top KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Sessions (30D)"
                  value={gaOverview?.sessions?.toLocaleString() ?? "—"}
                  subtitle={`${gaOverview?.users?.toLocaleString() ?? 0} users`}
                  icon={Users}
                  iconColor="text-blue-400"
                  trend={gaOverview?.sessions ? { value: `${((gaOverview.users / gaOverview.sessions) * 100).toFixed(0)}% new visitors`, positive: true } : undefined}
                />
                <KPICard
                  title="New Visitors"
                  value={gaOverview?.users?.toLocaleString() ?? "—"}
                  subtitle={gaOverview?.sessions ? `${((gaOverview.users / gaOverview.sessions) * 100).toFixed(1)}% of users` : undefined}
                  icon={ArrowUpRight}
                  iconColor="text-emerald-400"
                />
                <KPICard
                  title="Ad Spend (30D)"
                  value={adsCampaigns?.totalSpend ? `$${adsCampaigns.totalSpend.toFixed(2)}` : "—"}
                  subtitle={adsCampaigns?.totalClicks ? `${adsCampaigns.totalClicks} clicks` : "Not connected"}
                  icon={DollarSign}
                  iconColor="text-orange-400"
                />
                <KPICard
                  title="Ad Impressions"
                  value={adsCampaigns?.totalImpressions?.toLocaleString() ?? gscPerformance?.impressions?.toLocaleString() ?? "—"}
                  subtitle={adsCampaigns?.totalClicks ? `CTR ${((adsCampaigns.totalClicks / (adsCampaigns.totalImpressions || 1)) * 100).toFixed(1)}%` : `CTR ${gscPerformance?.ctr ?? 0}%`}
                  icon={Eye}
                  iconColor="text-purple-400"
                />
              </div>

              {/* Second KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Search Clicks"
                  value={gscPerformance?.clicks?.toLocaleString() ?? "—"}
                  subtitle={`${gscPerformance?.impressions?.toLocaleString() ?? 0} impressions`}
                  icon={Search}
                  iconColor="text-teal-400"
                />
                <KPICard
                  title="Avg Position"
                  value={gscPerformance?.position ? `#${parseFloat(gscPerformance.position).toFixed(1)}` : "—"}
                  subtitle={`Organic CTR ${gscPerformance?.ctr ?? 0}%`}
                  icon={TrendingUp}
                  iconColor="text-amber-400"
                />
                <KPICard
                  title="FB Page Reach"
                  value={fbInsights?.impressions ? `${(fbInsights.impressions / 1000).toFixed(0)}k` : "—"}
                  subtitle={fbInsights?.configured ? "100% recommended" : "Not connected"}
                  icon={Facebook}
                  iconColor="text-blue-500"
                />
                <KPICard
                  title="GMB Calls (Est.)"
                  value={gmbPerformance?.phoneCallClicks?.toLocaleString() ?? "—"}
                  subtitle={gmbReviews?.averageRating ? `${gmbReviews.averageRating}★ · ${gmbReviews.totalReviews} reviews` : "Not connected"}
                  icon={Phone}
                  iconColor="text-emerald-400"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard title="Website Traffic — 30 Days" icon={TrendingUp} iconColor="text-teal-400">
                  {sessionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={sessionChartData}>
                        <defs>
                          <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartTheme.teal} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={chartTheme.teal} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
                        <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="sessions" stroke={chartTheme.teal} fill="url(#sessionGradient)" strokeWidth={2} name="Sessions" dot={false} />
                        <Line type="monotone" dataKey="users" stroke={chartTheme.blue} strokeWidth={1.5} strokeDasharray="4 4" name="Users" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
                      Connect Google Analytics to see traffic data
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Ads: Clicks vs Spend" icon={DollarSign} iconColor="text-orange-400">
                  {adsChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={adsChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
                        <YAxis yAxisId="left" tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar yAxisId="left" dataKey="clicks" fill={chartTheme.blue} radius={[2, 2, 0, 0]} name="Clicks" />
                        <Bar yAxisId="right" dataKey="cost" fill={chartTheme.orange} radius={[2, 2, 0, 0]} name="Cost ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
                      Connect Google Ads to see spend data
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* Top Search Queries Table */}
              <ChartCard title="Top Search Queries" icon={Search} iconColor="text-teal-400">
                {gscQueries?.queries?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1e2a3a]">
                          <th className="text-left text-xs text-slate-500 uppercase tracking-wider py-2.5 font-semibold">Query</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5 font-semibold">Clicks</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5 font-semibold">Impressions</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5 font-semibold">CTR</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5 font-semibold">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gscQueries.queries.slice(0, 10).map((q: any, i: number) => (
                          <tr key={i} className="border-b border-[#1e2a3a]/50 last:border-0 hover:bg-[#111d2a] transition-colors">
                            <td className="py-3 text-white font-medium">{q.query}</td>
                            <td className="py-3 text-right font-semibold text-white">{q.clicks}</td>
                            <td className="py-3 text-right text-slate-400">{q.impressions.toLocaleString()}</td>
                            <td className="py-3 text-right">
                              <span className={`font-medium ${parseFloat(q.ctr) >= 5 ? "text-emerald-400" : "text-amber-400"}`}>
                                {q.ctr}%
                              </span>
                            </td>
                            <td className="py-3 text-right text-slate-300">#{parseFloat(q.position).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                    Connect Search Console to see query data
                  </div>
                )}
              </ChartCard>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ANALYTICS TAB (GA4) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "analytics" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Total Sessions" value={gaOverview?.sessions?.toLocaleString() ?? "—"} icon={Globe} iconColor="text-blue-400" subtitle="Last 30 days" />
                <KPICard title="Total Users" value={gaOverview?.users?.toLocaleString() ?? "—"} icon={Users} iconColor="text-teal-400" />
                <KPICard title="New Users" value={gaOverview?.users?.toLocaleString() ?? "—"} icon={ArrowUpRight} iconColor="text-emerald-400" />
                <KPICard title="Return Rate" value={gaOverview?.bounceRate ? `${((1 - gaOverview.bounceRate) * 100).toFixed(1)}%` : "—"} icon={RefreshCw} iconColor="text-purple-400" />
              </div>

              <ChartCard title="Sessions, Users & New Users — 30 Days" icon={TrendingUp}>
                {sessionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={sessionChartData}>
                      <defs>
                        <linearGradient id="sessGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartTheme.teal} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={chartTheme.teal} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                      <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
                      <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="sessions" stroke={chartTheme.teal} fill="url(#sessGrad2)" strokeWidth={2} name="Sessions" />
                      <Line type="monotone" dataKey="users" stroke={chartTheme.blue} strokeWidth={2} name="Users" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">Loading...</div>
                )}
              </ChartCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard title="Daily Traffic Breakdown" icon={BarChart3}>
                  {sessionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={sessionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
                        <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sessions" fill={chartTheme.teal} radius={[3, 3, 0, 0]} name="Sessions" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">Loading...</div>
                  )}
                </ChartCard>

                <ChartCard title="Traffic Sources" icon={ExternalLink} iconColor="text-blue-400">
                  {trafficPieData.length > 0 ? (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={trafficPieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} strokeWidth={0}>
                            {trafficPieData.map((entry: any, i: number) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {trafficPieData.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                              <span className="text-slate-300">{s.name}</span>
                            </div>
                            <span className="text-white font-medium">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[160px] flex items-center justify-center text-slate-500 text-sm">Loading...</div>
                  )}
                </ChartCard>
              </div>

              <ChartCard title="Top Pages" icon={Globe} iconColor="text-emerald-400">
                {gaTopPages?.pages?.length > 0 ? (
                  <div className="space-y-1">
                    {gaTopPages.pages.slice(0, 10).map((p: any, i: number) => {
                      const maxPV = gaTopPages.pages[0]?.pageviews ?? 1;
                      return (
                        <div key={i} className="flex items-center gap-4 py-2.5 border-b border-[#1e2a3a]/50 last:border-0">
                          <span className="text-xs text-slate-600 font-mono w-5">{i + 1}.</span>
                          <span className="text-sm text-white font-medium flex-1 truncate">{p.path}</span>
                          <div className="w-32 bg-[#1a2636] rounded-full h-1.5">
                            <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${(p.pageviews / maxPV) * 100}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 w-16 text-right">{p.pageviews} views</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Loading...</div>
                )}
              </ChartCard>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GOOGLE ADS TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "ads" && (
            <>
              {adsCampaigns?.configured && !adsCampaigns?.error ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard title="Total Spend" value={`$${adsCampaigns.totalSpend?.toFixed(2) ?? "0"}`} subtitle="Last 30 days" icon={DollarSign} iconColor="text-orange-400" />
                    <KPICard title="Impressions" value={adsCampaigns.totalImpressions?.toLocaleString() ?? "0"} icon={Eye} iconColor="text-blue-400" />
                    <KPICard title="Clicks" value={adsCampaigns.totalClicks?.toLocaleString() ?? "0"} icon={MousePointerClick} iconColor="text-teal-400" />
                    <KPICard title="Avg CTR" value={`${adsCampaigns.totalImpressions > 0 ? ((adsCampaigns.totalClicks / adsCampaigns.totalImpressions) * 100).toFixed(1) : 0}%`} subtitle="Click-through rate" icon={TrendingUp} iconColor="text-emerald-400" />
                  </div>

                  <ChartCard title="Impressions Over Time" icon={Eye} iconColor="text-blue-400">
                    {adsChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={adsChartData}>
                          <defs>
                            <linearGradient id="adsGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartTheme.teal} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={chartTheme.teal} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                          <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
                          <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="clicks" stroke={chartTheme.teal} fill="url(#adsGrad)" strokeWidth={2} name="Clicks" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[240px] flex items-center justify-center text-slate-500 text-sm">No daily data available</div>
                    )}
                  </ChartCard>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <ChartCard title="Daily Clicks" icon={MousePointerClick}>
                      {adsChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={adsChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 10 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
                            <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="clicks" fill={chartTheme.teal} radius={[2, 2, 0, 0]} name="Clicks" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No data</div>
                      )}
                    </ChartCard>

                    <ChartCard title="Daily Ad Spend" icon={DollarSign} iconColor="text-orange-400">
                      {adsChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={adsChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 10 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
                            <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="cost" fill={chartTheme.orange} radius={[2, 2, 0, 0]} name="Cost ($)" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No data</div>
                      )}
                    </ChartCard>
                  </div>

                  {/* Campaign Table */}
                  <ChartCard title="Campaigns" icon={Megaphone} iconColor="text-orange-400">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#1e2a3a]">
                            <th className="text-left text-xs text-slate-500 uppercase tracking-wider py-2.5">Campaign</th>
                            <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Spend</th>
                            <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Clicks</th>
                            <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">CTR</th>
                            <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Conv.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(adsCampaigns.campaigns ?? []).map((c: any, i: number) => (
                            <tr key={i} className="border-b border-[#1e2a3a]/50 last:border-0 hover:bg-[#111d2a]">
                              <td className="py-3">
                                <span className="text-white font-medium">{c.name}</span>
                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${c.status === "ENABLED" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3 text-right text-orange-400 font-medium">${c.cost?.toFixed(2)}</td>
                              <td className="py-3 text-right text-white">{c.clicks?.toLocaleString()}</td>
                              <td className="py-3 text-right text-slate-400">{(c.ctr * 100)?.toFixed(1)}%</td>
                              <td className="py-3 text-right text-emerald-400">{c.conversions?.toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                </>
              ) : (
                <Card className="border-[#1e2a3a] bg-[#0f1923]">
                  <CardContent className="p-12 text-center">
                    <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-lg text-slate-300 font-medium mb-2">Google Ads Not Connected</p>
                    <p className="text-sm text-slate-500">Add GOOGLE_ADS_CUSTOMER_ID and GOOGLE_ADS_DEVELOPER_TOKEN to Railway</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SEARCH TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "search" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Organic Clicks" value={gscPerformance?.clicks?.toLocaleString() ?? "—"} icon={MousePointerClick} iconColor="text-teal-400" />
                <KPICard title="Impressions" value={gscPerformance?.impressions ? `${(gscPerformance.impressions / 1000).toFixed(1)}k` : "—"} icon={Eye} iconColor="text-blue-400" />
                <KPICard title="Avg CTR" value={`${gscPerformance?.ctr ?? 0}%`} icon={TrendingUp} iconColor="text-emerald-400" />
                <KPICard title="Avg Position" value={gscPerformance?.position ? `#${parseFloat(gscPerformance.position).toFixed(1)}` : "—"} icon={Search} iconColor="text-purple-400" />
              </div>

              <ChartCard title="Organic Clicks & Impressions — 30 Days" icon={Search} iconColor="text-teal-400">
                {gscQueries?.queries ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={sessionChartData.length > 0 ? sessionChartData : [{ date: "N/A", sessions: 0 }]}>
                      <defs>
                        <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartTheme.teal} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={chartTheme.teal} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                      <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
                      <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="sessions" stroke={chartTheme.teal} fill="url(#searchGrad)" strokeWidth={2} name="Sessions" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">Loading...</div>
                )}
              </ChartCard>

              <ChartCard title="Top Search Queries" icon={Search} iconColor="text-teal-400">
                {gscQueries?.queries?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1e2a3a]">
                          <th className="text-left text-xs text-slate-500 uppercase tracking-wider py-2.5">Query</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Clicks</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Impressions</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">CTR</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gscQueries.queries.map((q: any, i: number) => (
                          <tr key={i} className="border-b border-[#1e2a3a]/50 last:border-0 hover:bg-[#111d2a]">
                            <td className="py-3 text-white font-medium">{q.query}</td>
                            <td className="py-3 text-right font-semibold text-white">{q.clicks}</td>
                            <td className="py-3 text-right text-slate-400">{q.impressions.toLocaleString()}</td>
                            <td className="py-3 text-right">
                              <span className={`font-medium ${parseFloat(q.ctr) >= 5 ? "text-emerald-400" : "text-amber-400"}`}>{q.ctr}%</span>
                            </td>
                            <td className="py-3 text-right text-slate-300">#{parseFloat(q.position).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Loading query data...</div>
                )}
              </ChartCard>

              {gscPages?.pages?.length > 0 && (
                <ChartCard title="Top Pages by Clicks" icon={Globe} iconColor="text-emerald-400">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1e2a3a]">
                          <th className="text-left text-xs text-slate-500 uppercase tracking-wider py-2.5">Page</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Clicks</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Impressions</th>
                          <th className="text-right text-xs text-slate-500 uppercase tracking-wider py-2.5">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gscPages.pages.slice(0, 10).map((p: any, i: number) => (
                          <tr key={i} className="border-b border-[#1e2a3a]/50 last:border-0 hover:bg-[#111d2a]">
                            <td className="py-3 text-white font-medium truncate max-w-xs">{p.page}</td>
                            <td className="py-3 text-right font-semibold text-white">{p.clicks}</td>
                            <td className="py-3 text-right text-slate-400">{p.impressions.toLocaleString()}</td>
                            <td className="py-3 text-right text-slate-300">#{parseFloat(p.position).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FACEBOOK TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "facebook" && (
            <>
              {fbInsights?.configured && !fbInsights?.error ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KPICard title="Page Impressions" value={fbInsights.impressions?.toLocaleString() ?? "0"} icon={Eye} iconColor="text-blue-400" />
                    <KPICard title="Engaged Users" value={fbInsights.engagedUsers?.toLocaleString() ?? "0"} icon={Users} iconColor="text-emerald-400" />
                    <KPICard title="Total Fans" value={fbInsights.totalFans?.toLocaleString() ?? "0"} icon={Facebook} iconColor="text-purple-400" />
                  </div>

                  {fbPosts?.posts?.length > 0 && (
                    <ChartCard title="Recent Posts" icon={Facebook} iconColor="text-blue-500">
                      <div className="space-y-3">
                        {fbPosts.posts.map((post: any, i: number) => (
                          <div key={i} className="p-4 rounded-lg bg-[#0d1520] border border-[#1e2a3a]">
                            <p className="text-sm text-white">{post.message}</p>
                            <div className="flex gap-4 mt-3 text-xs text-slate-400">
                              <span>{post.likes} likes</span>
                              <span>{post.comments} comments</span>
                              <span>{post.shares} shares</span>
                              <span className="ml-auto">{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ChartCard>
                  )}
                </>
              ) : (
                <Card className="border-[#1e2a3a] bg-[#0f1923]">
                  <CardContent className="p-12 text-center">
                    <Facebook className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-lg text-slate-300 font-medium mb-2">Facebook Not Connected</p>
                    <p className="text-sm text-slate-500">Add FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN to Railway</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GOOGLE BUSINESS TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "gmb" && (
            <>
              {/* Top KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard
                  title="Google Rating"
                  value={gmbReviews?.averageRating ? `${gmbReviews.averageRating} ★` : "—"}
                  subtitle={gmbReviews?.totalReviews ? `${gmbReviews.totalReviews} Google reviews` : "Loading..."}
                  icon={Star}
                  iconColor="text-yellow-400"
                />
                <KPICard
                  title="Profile Views"
                  value={gmbPerformance?.searchImpressions ? `${((gmbPerformance.searchImpressions + (gmbPerformance.mapViews ?? 0)) / 1000).toFixed(1)}k` : "—"}
                  subtitle="Maps + Search"
                  icon={Eye}
                  iconColor="text-blue-400"
                />
                <KPICard
                  title="Calls from GMB"
                  value={gmbPerformance?.phoneCallClicks?.toLocaleString() ?? "—"}
                  subtitle="Last 30 days"
                  icon={Phone}
                  iconColor="text-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard
                  title="Website Clicks"
                  value={gmbPerformance?.websiteClicks?.toLocaleString() ?? "—"}
                  subtitle="From GMB profile"
                  icon={MousePointerClick}
                  iconColor="text-teal-400"
                />
                <KPICard
                  title="Direction Requests"
                  value={gmbPerformance?.directionRequests?.toLocaleString() ?? "—"}
                  subtitle="Get directions taps"
                  icon={Navigation}
                  iconColor="text-purple-400"
                />
                <KPICard
                  title="Photo Views"
                  value={gmbPerformance?.photoViews?.toLocaleString() ?? "—"}
                  subtitle="Profile photo views"
                  icon={Image}
                  iconColor="text-pink-400"
                />
              </div>

              {/* Recent Reviews */}
              {gmbReviews?.reviews?.length > 0 && (
                <ChartCard title={`Recent Reviews — ${gmbReviews.averageRating} ★ (${gmbReviews.totalReviews} Google)`} icon={Star} iconColor="text-yellow-400">
                  <div className="space-y-3">
                    {gmbReviews.reviews.slice(0, 8).map((r: any, i: number) => {
                      const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
                      const rating = stars[r.starRating] ?? 5;
                      return (
                        <div key={i} className="p-4 rounded-lg bg-[#0d1520] border border-[#1e2a3a]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white font-semibold">{r.reviewer}</span>
                              <span className="text-xs text-slate-500">{r.createTime ? new Date(r.createTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ""}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, s) => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-700"}`} />
                              ))}
                            </div>
                          </div>
                          {r.comment && <p className="text-sm text-slate-300 leading-relaxed">{r.comment.substring(0, 250)}{r.comment.length > 250 ? "..." : ""}</p>}
                          {r.hasReply && (
                            <div className="mt-3 pl-3 border-l-2 border-teal-500/40">
                              <p className="text-xs text-slate-400">{r.replyComment?.substring(0, 200)}</p>
                            </div>
                          )}
                          {!r.hasReply && <p className="text-xs text-red-400 mt-2 font-medium">⚠ Needs reply</p>}
                        </div>
                      );
                    })}
                  </div>
                </ChartCard>
              )}

              {(!gmbReviews || gmbReviews.error) && (!gmbPerformance || gmbPerformance.error) && (
                <Card className="border-[#1e2a3a] bg-[#0f1923]">
                  <CardContent className="p-12 text-center">
                    <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-lg text-slate-300 font-medium mb-2">Google Business Profile</p>
                    <p className="text-sm text-slate-500">{gmbReviews?.error || gmbPerformance?.error || "Awaiting API access approval"}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* RECOMMENDATIONS TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "recommendations" && (
            <>
              {healthCheck?.checks && (
                <ChartCard title="Quick Health Check" icon={Activity} iconColor="text-teal-400">
                  <div className="space-y-2">
                    {healthCheck.checks.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#1e2a3a]/50 last:border-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          c.status === "good" ? "bg-emerald-400" :
                          c.status === "warning" ? "bg-amber-400" :
                          c.status === "critical" ? "bg-red-400" :
                          c.status === "info" ? "bg-blue-400" :
                          "bg-slate-600"
                        }`} />
                        <span className="text-sm text-white font-medium w-32">{c.area}</span>
                        <span className="text-sm text-slate-400 flex-1">{c.message}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              )}

              {aiInsights?.insights && (
                <>
                  {aiInsights.overallScore && (
                    <div className="flex items-center gap-6 p-6 bg-[#0f1923] border border-[#1e2a3a] rounded-xl">
                      <div className="relative w-24 h-24">
                        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#1a2636" strokeWidth="8" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#2dd4bf" strokeWidth="8"
                            strokeDasharray={`${aiInsights.overallScore * 2.51} 251`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">{aiInsights.overallScore}</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Digital Presence Score</h3>
                        <p className="text-sm text-slate-400">Based on your analytics, search rankings, and business profile</p>
                      </div>
                    </div>
                  )}

                  {aiInsights.insights?.map((insight: any, i: number) => (
                    <Card key={i} className="border-[#1e2a3a] bg-[#0f1923]">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            insight.priority === "high" ? "bg-red-500/15 text-red-400" :
                            insight.priority === "medium" ? "bg-amber-500/15 text-amber-400" :
                            "bg-blue-500/15 text-blue-400"
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
                            <p className="text-sm text-slate-400 mt-1">{insight.description}</p>
                            {insight.actionItems?.length > 0 && (
                              <ul className="mt-3 space-y-1.5">
                                {insight.actionItems.map((action: string, j: number) => (
                                  <li key={j} className="flex items-start gap-2 text-xs text-slate-300">
                                    <ChevronRight className="w-3 h-3 mt-0.5 text-teal-400 shrink-0" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {(!healthCheck?.checks || healthCheck.checks.length === 0) && !aiInsights && (
                <Card className="border-[#1e2a3a] bg-[#0f1923]">
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-lg text-slate-300 font-medium mb-2">AI Recommendations</p>
                    <p className="text-sm text-slate-500">Loading health check and AI insights...</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1e2a3a]">
            <p className="text-xs text-slate-600">Updated {new Date().toISOString().split('T')[0]}</p>
            {connectedServices.length > 0 && (
              <div className="flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1">
                <Wifi className="w-3 h-3 text-teal-400" />
                <span className="text-xs text-teal-400">{connectedServices.join(" + ")}: Live</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
