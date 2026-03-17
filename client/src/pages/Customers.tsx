import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Pencil, Users, ChevronDown, ChevronRight, Briefcase, FileText } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  source: string | null;
  squareCustomerId: string | null;
}

interface Job {
  id: number;
  customerId: number;
  title: string;
  serviceType: string | null;
  status: string;
  finalPrice: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  scheduledDate: string | null;
  leadSource: string | null;
  createdAt: string | null;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  status: string;
  total: number;
  balanceDue: number;
  issueDate: string;
  paymentMethod: string | null;
}

const sourceColors: Record<string, string> = {
  "Google": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Referral": "bg-green-500/10 text-green-400 border-green-500/20",
  "Square Import": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Facebook": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Yelp": "bg-red-500/10 text-red-400 border-red-500/20",
  "Website": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const statusStyles: Record<string, string> = {
  lead: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  scheduled: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function Customers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: allJobs = [] } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: allInvoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      toast({ title: "Customer created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) =>
      apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      setEditingCustomer(null);
      toast({ title: "Customer updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer deleted" });
    },
  });

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const getCustomerJobs = (customerId: number) => allJobs.filter(j => j.customerId === customerId);
  const getCustomerInvoices = (customerId: number) => allInvoices.filter(i => i.customerId === customerId);
  const getCustomerRevenue = (customerId: number) => {
    return allInvoices
      .filter(i => i.customerId === customerId && i.status === "paid")
      .reduce((sum, i) => sum + (i.total ?? 0), 0);
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      phone: form.get("phone") as string,
      email: (form.get("email") as string) || null,
      address: (form.get("address") as string) || null,
      city: (form.get("city") as string) || null,
      state: (form.get("state") as string) || null,
      zip: (form.get("zip") as string) || null,
      notes: (form.get("notes") as string) || null,
      source: (form.get("source") as string) || null,
    };
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Customers</h1>
            <p className="text-slate-400 text-sm">{customers.length} total customers</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingCustomer(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
              <Plus className="w-4 h-4 mr-2" />Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1d2332] border-[#2d3344]">
            <DialogHeader>
              <DialogTitle className="text-white">{editingCustomer ? "Edit Customer" : "New Customer"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="name" className="text-slate-300">Name *</Label><Input id="name" name="name" required defaultValue={editingCustomer?.name ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
                <div><Label htmlFor="phone" className="text-slate-300">Phone *</Label><Input id="phone" name="phone" required defaultValue={editingCustomer?.phone ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
                <div><Label htmlFor="email" className="text-slate-300">Email</Label><Input id="email" name="email" type="email" defaultValue={editingCustomer?.email ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
                <div><Label htmlFor="source" className="text-slate-300">Source</Label><Input id="source" name="source" defaultValue={editingCustomer?.source ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
              </div>
              <div><Label htmlFor="address" className="text-slate-300">Address</Label><Input id="address" name="address" defaultValue={editingCustomer?.address ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label htmlFor="city" className="text-slate-300">City</Label><Input id="city" name="city" defaultValue={editingCustomer?.city ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
                <div><Label htmlFor="state" className="text-slate-300">State</Label><Input id="state" name="state" defaultValue={editingCustomer?.state ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
                <div><Label htmlFor="zip" className="text-slate-300">ZIP</Label><Input id="zip" name="zip" defaultValue={editingCustomer?.zip ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
              </div>
              <div><Label htmlFor="notes" className="text-slate-300">Notes</Label><Textarea id="notes" name="notes" defaultValue={editingCustomer?.notes ?? ""} className="bg-[#161b28] border-[#2d3344] text-white" /></div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCustomer ? "Update" : "Create"} Customer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#1d2332] border-[#2d3344] text-white placeholder:text-slate-500" />
      </div>

      <Card className="border-[#2d3344] bg-[#1d2332] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3344] hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold w-[30px]"></TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Name</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Phone</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Email</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">City</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Source</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Jobs</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Revenue</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-[#2d3344]"><TableCell colSpan={9} className="text-center py-12 text-slate-500">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow className="border-[#2d3344]"><TableCell colSpan={9} className="text-center py-12 text-slate-500">No customers found</TableCell></TableRow>
              ) : filtered.map((c, i) => {
                const custJobs = getCustomerJobs(c.id);
                const custInvoices = getCustomerInvoices(c.id);
                const custRevenue = getCustomerRevenue(c.id);
                const isExpanded = expandedCustomer === c.id;

                return (
                  <>
                    <TableRow key={c.id} className={`border-[#2d3344] hover:bg-white/[0.02] transition-colors cursor-pointer ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`} onClick={() => setExpandedCustomer(isExpanded ? null : c.id)}>
                      <TableCell className="px-2">
                        {(custJobs.length > 0 || custInvoices.length > 0) && (
                          isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-white">{c.name}</TableCell>
                      <TableCell className="text-slate-300">{c.phone}</TableCell>
                      <TableCell className="text-slate-300">{c.email ?? <span className="text-slate-600">-</span>}</TableCell>
                      <TableCell className="text-slate-300">{c.city ?? <span className="text-slate-600">-</span>}</TableCell>
                      <TableCell>
                        {c.source ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${sourceColors[c.source] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                            {c.source}
                          </span>
                        ) : <span className="text-slate-600">-</span>}
                      </TableCell>
                      <TableCell className="text-slate-300">{custJobs.length > 0 ? custJobs.length : <span className="text-slate-600">0</span>}</TableCell>
                      <TableCell className="text-white font-medium">{custRevenue > 0 ? `$${custRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-600">$0</span>}</TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5" onClick={() => { setEditingCustomer(c); setDialogOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/5" onClick={() => deleteMutation.mutate(c.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded customer history */}
                    {isExpanded && (custJobs.length > 0 || custInvoices.length > 0) && (
                      <TableRow key={`${c.id}-history`} className="border-[#2d3344] bg-[#161b28]">
                        <TableCell colSpan={9} className="p-4">
                          <div className="space-y-4">
                            {/* Jobs section */}
                            {custJobs.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Briefcase className="w-4 h-4 text-orange-400" />
                                  <span className="text-sm font-semibold text-white">Jobs ({custJobs.length})</span>
                                </div>
                                <div className="rounded-lg border border-[#2d3344] overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-[#0f1923]">
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Title</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Service</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Status</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Date</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Price</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Source</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {custJobs.map((j) => (
                                        <tr key={j.id} className="border-t border-[#2d3344]">
                                          <td className="px-3 py-2 text-white">{j.title}</td>
                                          <td className="px-3 py-2 text-slate-400">{j.serviceType ?? "-"}</td>
                                          <td className="px-3 py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusStyles[j.status] ?? ""}`}>
                                              {j.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-slate-400">{j.scheduledDate ?? "-"}</td>
                                          <td className="px-3 py-2 text-white font-medium">
                                            {j.finalPrice ? `$${j.finalPrice.toLocaleString()}` : j.estimateLow ? `$${j.estimateLow}-$${j.estimateHigh}` : "-"}
                                          </td>
                                          <td className="px-3 py-2 text-slate-400">{j.leadSource ?? "-"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Invoices section */}
                            {custInvoices.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-4 h-4 text-teal-400" />
                                  <span className="text-sm font-semibold text-white">Invoices ({custInvoices.length})</span>
                                </div>
                                <div className="rounded-lg border border-[#2d3344] overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-[#0f1923]">
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Invoice #</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Status</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Date</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Total</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Balance</th>
                                        <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold">Payment</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {custInvoices.map((inv) => (
                                        <tr key={inv.id} className="border-t border-[#2d3344]">
                                          <td className="px-3 py-2 text-white font-mono text-xs">{inv.invoiceNumber}</td>
                                          <td className="px-3 py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusStyles[inv.status] ?? ""}`}>
                                              {inv.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-slate-400">{inv.issueDate}</td>
                                          <td className="px-3 py-2 text-white font-medium">${inv.total.toFixed(2)}</td>
                                          <td className={`px-3 py-2 font-medium ${inv.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"}`}>${inv.balanceDue.toFixed(2)}</td>
                                          <td className="px-3 py-2 text-slate-400">{inv.paymentMethod ?? "-"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
