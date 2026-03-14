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
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, CheckCircle2, FileText } from "lucide-react";

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  jobId: number | null;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string | null;
}

interface Customer { id: number; name: string; }

const statusStyles: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export default function Invoices() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Invoice>) => apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDialogOpen(false);
      toast({ title: "Invoice created" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/invoices/${id}/mark-paid`, { paymentMethod: "cash" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice marked as paid" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
    },
  });

  const filtered = invoices.filter((inv) =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    customers.find((c) => c.id === inv.customerId)?.name.toLowerCase().includes(search.toLowerCase())
  );

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const today = new Date().toISOString().split("T")[0];
    const due = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    createMutation.mutate({
      invoiceNumber: `INV-${Date.now()}`,
      customerId: parseInt(form.get("customerId") as string),
      status: "draft",
      issueDate: today,
      dueDate: due,
      total: parseFloat(form.get("total") as string) || 0,
      subtotal: parseFloat(form.get("total") as string) || 0,
    });
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Invoices</h1>
            <p className="text-slate-400 text-sm">{invoices.length} total invoices</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
              <Plus className="w-4 h-4 mr-2" />New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1e2128] border-[#2a2d35]">
            <DialogHeader><DialogTitle className="text-white">Create Invoice</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label className="text-slate-300">Customer *</Label>
                <Select name="customerId" required>
                  <SelectTrigger className="bg-[#151821] border-[#2a2d35] text-white"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent className="bg-[#1e2128] border-[#2a2d35]">
                    {customers.map((c) => <SelectItem key={c.id} value={String(c.id)} className="text-slate-200">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-slate-300">Total ($)</Label><Input name="total" type="number" step="0.01" required className="bg-[#151821] border-[#2a2d35] text-white" /></div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={createMutation.isPending}>Create Invoice</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#1e2128] border-[#2a2d35] text-white placeholder:text-slate-500" />
      </div>

      <Card className="border-[#2a2d35] bg-[#1e2128] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a2d35] hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Invoice #</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Customer</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Issued</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Due</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Balance</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-[#2a2d35]"><TableCell colSpan={8} className="text-center py-12 text-slate-500">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow className="border-[#2a2d35]"><TableCell colSpan={8} className="text-center py-12 text-slate-500">No invoices found</TableCell></TableRow>
              ) : filtered.map((inv, i) => (
                <TableRow key={inv.id} className={`border-[#2a2d35] hover:bg-white/[0.02] transition-colors ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                  <TableCell className="font-mono font-medium text-white text-sm">{inv.invoiceNumber}</TableCell>
                  <TableCell className="text-slate-300">{customerName(inv.customerId)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyles[inv.status] ?? ""}`}>
                      {inv.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">{inv.issueDate}</TableCell>
                  <TableCell className="text-slate-400 text-sm">{inv.dueDate}</TableCell>
                  <TableCell className="text-white font-medium">${inv.total.toFixed(2)}</TableCell>
                  <TableCell className={`font-medium ${inv.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"}`}>${inv.balanceDue.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {inv.status !== "paid" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5" onClick={() => markPaidMutation.mutate(inv.id)} title="Mark paid">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/5" onClick={() => deleteMutation.mutate(inv.id)}>
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
