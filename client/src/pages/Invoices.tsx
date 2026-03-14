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
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, CheckCircle2 } from "lucide-react";

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

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">{invoices.length} total invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Invoice</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="customerId">Customer *</Label>
                <Select name="customerId" required>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="total">Total ($)</Label><Input id="total" name="total" type="number" step="0.01" required /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Create Invoice</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>{customerName(inv.customerId)}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusColors[inv.status] ?? ""}>{inv.status}</Badge></TableCell>
                  <TableCell>{inv.issueDate}</TableCell>
                  <TableCell>{inv.dueDate}</TableCell>
                  <TableCell>${inv.total.toFixed(2)}</TableCell>
                  <TableCell>${inv.balanceDue.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {inv.status !== "paid" && (
                        <Button variant="ghost" size="icon" onClick={() => markPaidMutation.mutate(inv.id)} title="Mark paid">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(inv.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
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
