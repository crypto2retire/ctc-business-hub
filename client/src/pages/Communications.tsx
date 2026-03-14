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
import { Plus, Mail, MessageSquare } from "lucide-react";

interface Communication {
  id: number;
  jobId: number | null;
  customerId: number | null;
  type: string;
  direction: string;
  subject: string | null;
  message: string;
  template: string | null;
  sentAt: string | null;
}

interface Customer { id: number; name: string; }

export default function Communications() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: comms = [], isLoading } = useQuery<Communication[]>({ queryKey: ["/api/communications"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Communication>) => apiRequest("POST", "/api/communications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      setDialogOpen(false);
      toast({ title: "Communication logged" });
    },
  });

  const customerName = (id: number | null) => {
    if (!id) return "-";
    return customers.find((c) => c.id === id)?.name ?? "Unknown";
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      customerId: parseInt(form.get("customerId") as string) || null,
      type: form.get("type") as string,
      direction: form.get("direction") as string,
      subject: (form.get("subject") as string) || null,
      message: form.get("message") as string,
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Communications</h1>
          <p className="text-muted-foreground">{comms.length} messages</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Log Communication</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="customerId">Customer</Label>
                <Select name="customerId">
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="type">Type *</Label>
                  <Select name="type" required defaultValue="sms">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="direction">Direction *</Label>
                  <Select name="direction" required defaultValue="outbound">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" /></div>
              <div><Label htmlFor="message">Message *</Label><Textarea id="message" name="message" required rows={4} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Log Communication</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : comms.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No communications yet</TableCell></TableRow>
              ) : comms.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {c.type === "email" ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                      {c.type}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant={c.direction === "inbound" ? "default" : "secondary"}>{c.direction}</Badge></TableCell>
                  <TableCell>{customerName(c.customerId)}</TableCell>
                  <TableCell>{c.subject ?? "-"}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{c.message}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
