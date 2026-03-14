import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Pencil } from "lucide-react";

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

interface Customer {
  id: number;
  name: string;
}

const statusColors: Record<string, string> = {
  lead: "bg-gray-100 text-gray-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Jobs() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: jobs = [], isLoading } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Job>) => apiRequest("POST", "/api/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setDialogOpen(false);
      toast({ title: "Job created" });
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
    (j.serviceType?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      customerId: parseInt(form.get("customerId") as string),
      title: form.get("title") as string,
      serviceType: (form.get("serviceType") as string) || null,
      status: (form.get("status") as string) || "lead",
      scheduledDate: (form.get("scheduledDate") as string) || null,
      scheduledTime: (form.get("scheduledTime") as string) || null,
      notes: (form.get("notes") as string) || null,
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">{jobs.length} total jobs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Job</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Job</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="customerId">Customer *</Label>
                <Select name="customerId" required>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="title">Title *</Label><Input id="title" name="title" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="serviceType">Service Type</Label>
                  <Select name="serviceType">
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Junk Removal">Junk Removal</SelectItem>
                      <SelectItem value="Garage Cleanout">Garage Cleanout</SelectItem>
                      <SelectItem value="Estate Cleanout">Estate Cleanout</SelectItem>
                      <SelectItem value="Demolition">Demolition</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue="lead">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="scheduledDate">Date</Label><Input id="scheduledDate" name="scheduledDate" type="date" /></div>
                <div><Label htmlFor="scheduledTime">Time</Label><Input id="scheduledTime" name="scheduledTime" type="time" /></div>
              </div>
              <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Create Job</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No jobs found</TableCell></TableRow>
              ) : filtered.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.title}</TableCell>
                  <TableCell>{customerName(j.customerId)}</TableCell>
                  <TableCell>{j.serviceType ?? "-"}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusColors[j.status] ?? ""}>{j.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell>{j.scheduledDate ?? "-"}</TableCell>
                  <TableCell>{j.finalPrice ? `$${j.finalPrice}` : j.estimateLow ? `$${j.estimateLow}-$${j.estimateHigh}` : "-"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(j.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
