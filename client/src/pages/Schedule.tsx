import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface Job {
  id: number;
  title: string;
  serviceType: string | null;
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  customerId: number;
}

interface Customer {
  id: number;
  name: string;
}

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Week of {weekDays[0].toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
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
            <Card key={dateStr} className={isToday ? "border-primary" : ""}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {dayJobs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No jobs</p>
                ) : dayJobs.map((j) => (
                  <div key={j.id} className="p-2 rounded-md bg-muted text-xs space-y-1">
                    <p className="font-medium truncate">{j.title}</p>
                    <p className="text-muted-foreground truncate">{customerName(j.customerId)}</p>
                    {j.scheduledTime && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />{j.scheduledTime}
                      </div>
                    )}
                    <Badge variant="secondary" className="text-[10px]">{j.status.replace("_", " ")}</Badge>
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
