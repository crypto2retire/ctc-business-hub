import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CheckCircle2, DollarSign, FileText, Clock, CreditCard } from "lucide-react";

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
    { title: "Active Jobs", value: stats?.activeJobs ?? 0, icon: Briefcase, color: "text-blue-600" },
    { title: "Completed This Month", value: stats?.completedThisMonth ?? 0, icon: CheckCircle2, color: "text-green-600" },
    { title: "Revenue This Month", value: `$${(stats?.revenueThisMonth ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
    { title: "Pending Estimates", value: stats?.pendingEstimates ?? 0, icon: Clock, color: "text-amber-600" },
    { title: "Invoices Due", value: stats?.invoicesDue ?? 0, icon: FileText, color: "text-red-600" },
    { title: "Invoices Paid", value: stats?.invoicesPaid ?? 0, icon: CreditCard, color: "text-purple-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to CTC Business Hub</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded w-1/3" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
