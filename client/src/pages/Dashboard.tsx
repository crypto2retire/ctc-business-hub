import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, CheckCircle2, DollarSign, FileText, Clock, CreditCard, TrendingUp, ArrowUpRight } from "lucide-react";

interface Stats {
  activeJobs: number;
  completedThisMonth: number;
  revenueThisMonth: number;
  pendingEstimates: number;
  invoicesDue: number;
  invoicesPaid: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats/overview"],
  });

  const cards = [
    {
      title: "Active Jobs",
      value: stats?.activeJobs ?? 0,
      icon: Briefcase,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400",
      trend: "+2 this week",
    },
    {
      title: "Completed This Month",
      value: stats?.completedThisMonth ?? 0,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      trend: "On track",
    },
    {
      title: "Revenue This Month",
      value: `$${(stats?.revenueThisMonth ?? 0).toLocaleString()}`,
      icon: DollarSign,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-400",
      trend: null,
    },
    {
      title: "Pending Estimates",
      value: stats?.pendingEstimates ?? 0,
      icon: Clock,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      trend: "Follow up",
    },
    {
      title: "Invoices Due",
      value: stats?.invoicesDue ?? 0,
      icon: FileText,
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
      trend: null,
    },
    {
      title: "Invoices Paid",
      value: stats?.invoicesPaid ?? 0,
      icon: CreditCard,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
      trend: null,
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back. Here's your business overview.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Live data</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => (
            <Card key={card.title} className="border-[#2a2d35] bg-[#1e2128] hover:border-[#363940] transition-all duration-200 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{card.value}</p>
                    {card.trend && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{card.trend}</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
