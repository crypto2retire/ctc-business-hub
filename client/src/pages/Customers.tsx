import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Pencil } from "lucide-react";

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

export default function Customers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">{customers.length} total customers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingCustomer(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Customer" : "New Customer"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="name">Name *</Label><Input id="name" name="name" required defaultValue={editingCustomer?.name ?? ""} /></div>
                <div><Label htmlFor="phone">Phone *</Label><Input id="phone" name="phone" required defaultValue={editingCustomer?.phone ?? ""} /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={editingCustomer?.email ?? ""} /></div>
                <div><Label htmlFor="source">Source</Label><Input id="source" name="source" defaultValue={editingCustomer?.source ?? ""} /></div>
              </div>
              <div><Label htmlFor="address">Address</Label><Input id="address" name="address" defaultValue={editingCustomer?.address ?? ""} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label htmlFor="city">City</Label><Input id="city" name="city" defaultValue={editingCustomer?.city ?? ""} /></div>
                <div><Label htmlFor="state">State</Label><Input id="state" name="state" defaultValue={editingCustomer?.state ?? ""} /></div>
                <div><Label htmlFor="zip">ZIP</Label><Input id="zip" name="zip" defaultValue={editingCustomer?.zip ?? ""} /></div>
              </div>
              <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={editingCustomer?.notes ?? ""} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCustomer ? "Update" : "Create"} Customer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.email ?? "-"}</TableCell>
                  <TableCell>{c.city ?? "-"}</TableCell>
                  <TableCell>{c.source ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCustomer(c); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}>
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
