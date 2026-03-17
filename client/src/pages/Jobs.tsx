import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Pencil, Briefcase } from "lucide-react";

interface Job {
  id: number;
  customerId: number;
  title: string;
  serviceType: string | null;
  status: string;
  estimateLow: number | null;
  estimateHigh: number | null;
  finalPrice: number | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  notes: string | null;
  leadSource: string | null;
  createdAt: string | null;
}

interface Customer { id: number; name: string; }

const statusStyles: Record<string, string> = {
  lead: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  scheduled: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  lead: "Lead",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const sourceColors: Record<string, string> = {
  "Google": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Square": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Referral": "bg-green-500/10 text-green-400 border-green-500/20",
  "Facebook": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Website": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Nextdoor": "bg-lime-500/10 text-lime-400 border-lime-500/20",
};

export default function Jobs() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const { data: jobs = [], isLoading } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Job>) => apiRequest("POST", "/api/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setDialogOpen(false);
      setEditingJob(null);
      toast({ title: "Job created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Job> }) =>
      apiRequest("PATCH", `/api/jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setDialogOpen(false);
      setEditingJob(null);
      toast({ title: "Job updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job deleted" });
    },
  });

  const filtered = jobs.filter((j) =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    (j.serviceType?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    customerName(j.customerId).toLowerCase().includes(search.toLowerCase())
  );

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: Partial<Job> = {
      customerId: parseInt(form.get("customerId") as string),
      title: form.get("title") as string,
      serviceType: (form.get("serviceType") as string) || null,
      status: (form.get("status") as string) || "lead",
      scheduledDate: (form.get("scheduledDate") as string) || null,
      scheduledTime: (form.get("scheduledTime") as string) || null,
      estimateLow: parseFloat(form.get("estimateLow") as string) || null,
      estimateHigh: parseFloat(form.get("estimateHigh") as string) || null,
      finalPrice: parseFloat(form.get("finalPrice") as string) || null,
      leadSource: (form.get("leadSource") as string) || null,
      notes: (form.get("notes") as string) || null,
    };
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Jobs</h1>
            <p className="text-slate-400 text-sm">{jobs.length} total jobs</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingJob(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
              <Plus className="w-4 h-4 mr-2" />New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1d2332] border-[#2d3344] max-w-lg">
            <DialogHeader><DialogTitle className="text-white">{editingJob ? "Edit Job" : "Create Job"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label className="text-slate-300">Customer *</Label>
                <Select name="customerId" required defaultValue={editingJob ? String(editingJob.customerId) : undefined}>
                  <SelectTrigger className="bg-[#161b28] border-[#2d3344] text-white"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent className="bg-[#1d2332] border-[#2d3344]">
                    {customers.map((c) => <SelectItem key={c.id} value={String(c.id)} className="text-slate-200">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-slate-300">Title *</Label><Input name="title" required defaultValue={editingJob?.title ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">Service Type</Label>
                  <Select name="serviceType" defaultValue={editingJob?.serviceType ?? undefined}>
                    <SelectTrigger className="bg-[#161b28] border-[#2d3344] text-white"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent className="bg-[#1d2332] border-[#2d3344]">
                      <SelectItem value="Junk Removal" className="text-slate-200">Junk Removal</SelectItem>
                      <SelectItem value="Garage Cleanout" className="text-slate-200">Garage Cleanout</SelectItem>
                      <SelectItem value="Estate Cleanout" className="text-slate-200">Estate Cleanout</SelectItem>
                      <SelectItem value="Demolition" className="text-slate-200">Demolition</SelectItem>
                      <SelectItem value="Other" className="text-slate-200">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-slate-300">Status</Label>
                  <Select name="status" defaultValue={editingJob?.status ?? "lead"}>
                    <SelectTrigger className="bg-[#161b28] border-[#2d3344] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1d2332] border-[#2d3344]">
                      <SelectItem value="lead" className="text-slate-200">Lead</SelectItem>
                      <SelectItem value="scheduled" className="text-slate-200">Scheduled</SelectItem>
                      <SelectItem value="in_progress" className="text-slate-200">In Progress</SelectItem>
                      <SelectItem value="completed" className="text-slate-200">Completed</SelectItem>
                      <SelectItem value="cancelled" className="text-slate-200">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">Date</Label><Input name="scheduledDate" type="date" defaultValue={editingJob?.scheduledDate ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
                <div><Label className="text-slate-300">Time</Label><Input name="scheduledTime" type="time" defaultValue={editingJob?.scheduledTime ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-slate-300">Estimate Low</Label><Input name="estimateLow" type="number" step="0.01" defaultValue={editingJob?.estimateLow ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" placeholder="$" /></div>
                <div><Label className="text-slate-300">Estimate High</Label><Input name="estimateHigh" type="number" step="0.01" defaultValue={editingJob?.estimateHigh ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" placeholder="$" /></div>
                <div><Label className="text-slate-300">Final Price</Label><Input name="finalPrice" type="number" step="0.01" defaultValue={editingJob?.finalPrice ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" placeholder="$" /></div>
              </div>
              <div><Label className="text-slate-300">Lead Source</Label>
                <Select name="leadSource" defaultValue={editingJob?.leadSource ?? undefined}>
                  <SelectTrigger className="bg-[#161b28] border-[#2d3344] text-white"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent className="bg-[#1d2332] border-[#2d3344]">
                    <SelectItem value="Google" className="text-slate-200">Google</SelectItem>
                    <SelectItem value="Facebook" className="text-slate-200">Facebook</SelectItem>
                    <SelectItem value="Referral" className="text-slate-200">Referral</SelectItem>
                    <SelectItem value="Square" className="text-slate-200">Square</SelectItem>
                    <SelectItem value="Website" className="text-slate-200">Website</SelectItem>
                    <SelectItem value="Nextdoor" className="text-slate-200">Nextdoor</SelectItem>
                    <SelectItem value="Other" className="text-slate-200">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-slate-300">Notes</Label><Textarea name="notes" defaultValue={editingJob?.notes ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingJob ? "Update" : "Create"} Job
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input placeholder="Search jobs by title, service, or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#1d2332] border-[#2d3344] text-white placeholder:text-slate-500" />
      </div>

      <Card className="border-[#2d3344] bg-[#1d2332] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3344] hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Title</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Customer</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Service</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Source</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Scheduled</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Price</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-[#2d3344]"><TableCell colSpan={8} className="text-center py-12 text-slate-500">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow className="border-[#2d3344]"><TableCell colSpan={8} className="text-center py-12 text-slate-500">No jobs found</TableCell></TableRow>
              ) : filtered.map((j, i) => (
                <TableRow key={j.id} className={`border-[#2d3344] hover:bg-white/[0.02] transition-colors ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                  <TableCell className="font-medium text-white">{j.title}</TableCell>
                  <TableCell className="text-slate-300">{customerName(j.customerId)}</TableCell>
                  <TableCell className="text-slate-300">{j.serviceType ?? <span className="text-slate-600">-</span>}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyles[j.status] ?? ""}`}>
                      {statusLabels[j.status] ?? j.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {j.leadSource ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${sourceColors[j.leadSource] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                        {j.leadSource}
                      </span>
                    ) : <span className="text-slate-600">-</span>}
                  </TableCell>
                  <TableCell className="text-slate-300">{j.scheduledDate ?? <span className="text-slate-600">-</span>}</TableCell>
                  <TableCell className="text-white font-medium">
                    {j.finalPrice ? `$${j.finalPrice.toLocaleString()}` : j.estimateLow ? `$${j.estimateLow}-$${j.estimateHigh}` : <span className="text-slate-600">-</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5" onClick={() => { setEditingJob(j); setDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/5" onClick={() => deleteMutation.mutate(j.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
