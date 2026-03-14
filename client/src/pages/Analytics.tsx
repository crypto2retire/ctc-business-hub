import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, MousePointerClick, Clock, TrendingUp } from "lucide-react";

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
    { title: "Total Sessions", value: data?.sessions?.toLocaleString() ?? "0", icon: Globe, color: "text-blue-600" },
    { title: "Total Clicks", value: data?.clicks?.toString() ?? "0", icon: MousePointerClick, color: "text-green-600" },
    { title: "Avg Session", value: data?.avgSession ?? "-", icon: Clock, color: "text-amber-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Website performance overview</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded w-1/3" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((s) => (
              <Card key={s.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Sessions (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {data?.dailySessions.map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/80 rounded-t"
                        style={{ height: `${(val / Math.max(...(data?.dailySessions ?? [1]))) * 100}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{val}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Top Search Queries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.topQueries.map((q, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{q.query}</span>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{q.clicks} clicks</span>
                        <span>{q.impressions} imp</span>
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
