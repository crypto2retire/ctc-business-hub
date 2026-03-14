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
    if (!id) return <span className="text-slate-600">-</span>;
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Communications</h1>
            <p className="text-slate-400 text-sm">{comms.length} messages</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
              <Plus className="w-4 h-4 mr-2" />Log Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1e2128] border-[#2a2d35]">
            <DialogHeader><DialogTitle className="text-white">Log Communication</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label className="text-slate-300">Customer</Label>
                <Select name="customerId">
                  <SelectTrigger className="bg-[#151821] border-[#2a2d35] text-white"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent className="bg-[#1e2128] border-[#2a2d35]">
                    {customers.map((c) => <SelectItem key={c.id} value={String(c.id)} className="text-slate-200">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">Type *</Label>
                  <Select name="type" required defaultValue="sms">
                    <SelectTrigger className="bg-[#151821] border-[#2a2d35] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1e2128] border-[#2a2d35]">
                      <SelectItem value="sms" className="text-slate-200">SMS</SelectItem>
                      <SelectItem value="email" className="text-slate-200">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-slate-300">Direction *</Label>
                  <Select name="direction" required defaultValue="outbound">
                    <SelectTrigger className="bg-[#151821] border-[#2a2d35] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1e2128] border-[#2a2d35]">
                      <SelectItem value="outbound" className="text-slate-200">Outbound</SelectItem>
                      <SelectItem value="inbound" className="text-slate-200">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-slate-300">Subject</Label><Input name="subject" className="bg-[#151821] border-[#2a2d35] text-white" /></div>
              <div><Label className="text-slate-300">Message *</Label><Textarea name="message" required rows={4} className="bg-[#151821] border-[#2a2d35] text-white" /></div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={createMutation.isPending}>Log Communication</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-[#2a2d35] bg-[#1e2128] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a2d35] hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Type</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Direction</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Customer</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Subject</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Message</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-[#2a2d35]"><TableCell colSpan={6} className="text-center py-12 text-slate-500">Loading...</TableCell></TableRow>
              ) : comms.length === 0 ? (
                <TableRow className="border-[#2a2d35]"><TableCell colSpan={6} className="text-center py-12 text-slate-500">No communications yet</TableCell></TableRow>
              ) : comms.map((c, i) => (
                <TableRow key={c.id} className={`border-[#2a2d35] hover:bg-white/[0.02] transition-colors ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      c.type === "email" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}>
                      {c.type === "email" ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                      {c.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      c.direction === "inbound" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }`}>
                      {c.direction}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300">{customerName(c.customerId)}</TableCell>
                  <TableCell className="text-slate-300">{c.subject ?? <span className="text-slate-600">-</span>}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-slate-400">{c.message}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
