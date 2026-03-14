import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Globe, MousePointerClick, Clock, TrendingUp, Search } from "lucide-react";

interface AnalyticsData {
  sessions: number;
  clicks: number;
  avgSession: string;
  dailySessions: number[];
  topQueries: { query: string; clicks: number; impressions: number }[];
}

export default function Analytics() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/live"],
  });

  const stats = [
    { title: "Total Sessions", value: data?.sessions?.toLocaleString() ?? "0", icon: Globe, iconBg: "bg-blue-500/10", iconColor: "text-blue-400" },
    { title: "Total Clicks", value: data?.clicks?.toString() ?? "0", icon: MousePointerClick, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
    { title: "Avg Session", value: data?.avgSession ?? "-", icon: Clock, iconBg: "bg-amber-500/10", iconColor: "text-amber-400" },
  ];

  const maxSession = Math.max(...(data?.dailySessions ?? [1]));
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-slate-400 text-sm">Website performance overview</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-[#2a2d35] bg-[#1e2128]">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {stats.map((s) => (
              <Card key={s.title} className="border-[#2a2d35] bg-[#1e2128] hover:border-[#363940] transition-all duration-200 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{s.title}</p>
                      <p className="text-3xl font-bold text-white tracking-tight">{s.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                      <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-[#2a2d35] bg-[#1e2128]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  Daily Sessions (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 h-44 pt-4">
                  {data?.dailySessions.map((val, i) => {
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
                        <span className="text-[10px] text-slate-500 font-medium">{dayLabels[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#2a2d35] bg-[#1e2128]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-orange-400" />
                  Top Search Queries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {data?.topQueries.map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-[#2a2d35] last:border-0 group hover:bg-white/[0.01] -mx-2 px-2 rounded transition-colors">
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
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
