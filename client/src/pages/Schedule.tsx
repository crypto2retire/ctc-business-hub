import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";

interface Job {
  id: number;
  title: string;
  serviceType: string | null;
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  customerId: number;
}

interface Customer { id: number; name: string; }

const statusDot: Record<string, string> = {
  lead: "bg-slate-400",
  scheduled: "bg-amber-400",
  in_progress: "bg-orange-400",
  completed: "bg-emerald-400",
};

export default function Schedule() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: jobs = [] } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? "Unknown";
  const scheduledJobs = jobs.filter((j) => j.scheduledDate && j.status !== "cancelled");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Schedule</h1>
            <p className="text-slate-400 text-sm">Week of {weekDays[0].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="border-[#2d3344] bg-[#1d2332] text-slate-300 hover:bg-[#252b3a] hover:text-white h-9 w-9" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="border-[#2d3344] bg-[#1d2332] text-slate-300 hover:bg-[#252b3a] hover:text-white h-9 px-4 text-sm" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" className="border-[#2d3344] bg-[#1d2332] text-slate-300 hover:bg-[#252b3a] hover:text-white h-9 w-9" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dateStr = formatDate(day);
          const dayJobs = scheduledJobs.filter((j) => j.scheduledDate === dateStr);
          const isToday = formatDate(today) === dateStr;

          return (
            <Card key={dateStr} className={`border-[#2d3344] bg-[#1d2332] min-h-[180px] ${isToday ? "border-orange-500/40 shadow-lg shadow-orange-500/5" : "hover:border-[#363d4f]"} transition-all duration-200`}>
              <CardHeader className="p-3 pb-1">
                <div className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-orange-400" : "text-slate-500"}`}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={`text-lg font-bold ${isToday ? "text-white" : "text-slate-300"}`}>
                  {day.getDate()}
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {dayJobs.length === 0 ? (
                  <p className="text-[11px] text-slate-600 py-2">No jobs</p>
                ) : dayJobs.map((j) => (
                  <div key={j.id} className="p-2 rounded-lg bg-[#161b28] border border-[#2d3344] text-xs space-y-1.5 hover:border-[#363d4f] transition-colors">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusDot[j.status] ?? "bg-slate-400"}`} />
                      <p className="font-medium text-white truncate">{j.title}</p>
                    </div>
                    <p className="text-slate-500 truncate pl-3">{customerName(j.customerId)}</p>
                    {j.scheduledTime && (
                      <div className="flex items-center gap-1 text-slate-500 pl-3">
                        <Clock className="w-3 h-3" />{j.scheduledTime}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
