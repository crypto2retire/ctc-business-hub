import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, CheckCircle2, FileText, Eye, Send, Pencil, X, Copy } from "lucide-react";

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  jobId: number | null;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  serviceAddress: string | null;
  serviceCity: string | null;
  serviceState: string | null;
  serviceZip: string | null;
  billingName: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  billingEmail: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  paymentMethod: string | null;
  squareInvoiceId: string | null;
  createdAt: string | null;
}

interface LineItem {
  id?: number;
  invoiceId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface Job {
  id: number;
  customerId: number;
  title: string;
  serviceType: string | null;
  finalPrice: number | null;
}

const statusStyles: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const DEFAULT_TERMS = "Payment is due within 30 days of invoice date. Thank you for choosing Clear The Clutter Junk Removal!";

export default function Invoices() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState<number | null>(null);
  const [formJobId, setFormJobId] = useState<number | null>(null);
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDueDate, setFormDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
  const [formTaxRate, setFormTaxRate] = useState(0);
  const [formDiscountType, setFormDiscountType] = useState<string>("none");
  const [formDiscountValue, setFormDiscountValue] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formTerms, setFormTerms] = useState(DEFAULT_TERMS);
  const [formLineItems, setFormLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
  // Service address
  const [formServiceAddress, setFormServiceAddress] = useState("");
  const [formServiceCity, setFormServiceCity] = useState("");
  const [formServiceState, setFormServiceState] = useState("WI");
  const [formServiceZip, setFormServiceZip] = useState("");
  // Billing address
  const [formBillingName, setFormBillingName] = useState("");
  const [formBillingAddress, setFormBillingAddress] = useState("");
  const [formBillingCity, setFormBillingCity] = useState("");
  const [formBillingState, setFormBillingState] = useState("WI");
  const [formBillingZip, setFormBillingZip] = useState("");
  const [formBillingEmail, setFormBillingEmail] = useState("");

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: jobs = [] } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });

  // ── Calculations ──
  const subtotal = formLineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const discountAmount = formDiscountType === "percent"
    ? subtotal * (formDiscountValue / 100)
    : formDiscountType === "flat" ? formDiscountValue : 0;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (formTaxRate / 100);
  const total = afterDiscount + taxAmount;

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const inv = await apiRequest("POST", "/api/invoices", data.invoice);
      const invData: any = await inv;
      // Create line items
      for (const li of data.lineItems) {
        await apiRequest("POST", `/api/invoices/${invData.id}/line-items`, li);
      }
      return invData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setEditorOpen(false);
      toast({ title: "Invoice created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/invoices/${data.id}`, data.invoice);
      // Delete existing line items and recreate
      const existingItems: any[] = await (await fetch(`/api/invoices/${data.id}/line-items`, { credentials: "include" })).json();
      for (const item of existingItems) {
        await apiRequest("DELETE", `/api/line-items/${item.id}`);
      }
      for (const li of data.lineItems) {
        await apiRequest("POST", `/api/invoices/${data.id}/line-items`, li);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setEditorOpen(false);
      setEditingInvoiceId(null);
      toast({ title: "Invoice updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/invoices/${id}/mark-paid`, { paymentMethod: "cash" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Marked as paid" });
    },
  });

  const sendSquareMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/invoices/${id}/send-square`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: `Invoice sent to ${data.sentTo ?? "customer"} via Square` });
    },
    onError: (err: any) => {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    },
  });

  const filtered = invoices.filter((inv) =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    customers.find((c) => c.id === inv.customerId)?.name.toLowerCase().includes(search.toLowerCase())
  );

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  // ── Form helpers ──
  function resetForm() {
    setEditingInvoiceId(null);
    setFormCustomerId(null);
    setFormJobId(null);
    setFormIssueDate(new Date().toISOString().split("T")[0]);
    setFormDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
    setFormTaxRate(0);
    setFormDiscountType("none");
    setFormDiscountValue(0);
    setFormNotes("");
    setFormTerms(DEFAULT_TERMS);
    setFormLineItems([{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
    setFormServiceAddress(""); setFormServiceCity(""); setFormServiceState("WI"); setFormServiceZip("");
    setFormBillingName(""); setFormBillingAddress(""); setFormBillingCity(""); setFormBillingState("WI"); setFormBillingZip(""); setFormBillingEmail("");
  }

  function openNewInvoice() {
    resetForm();
    setEditorOpen(true);
  }

  async function openEditInvoice(inv: Invoice) {
    setEditingInvoiceId(inv.id);
    setFormCustomerId(inv.customerId);
    setFormJobId(inv.jobId);
    setFormIssueDate(inv.issueDate);
    setFormDueDate(inv.dueDate);
    setFormTaxRate(inv.taxRate);
    setFormDiscountType(inv.discountType || "none");
    setFormDiscountValue(inv.discountValue || 0);
    setFormNotes(inv.notes || "");
    setFormTerms(inv.termsAndConditions || DEFAULT_TERMS);
    setFormServiceAddress(inv.serviceAddress || "");
    setFormServiceCity(inv.serviceCity || "");
    setFormServiceState(inv.serviceState || "WI");
    setFormServiceZip(inv.serviceZip || "");
    setFormBillingName(inv.billingName || "");
    setFormBillingAddress(inv.billingAddress || "");
    setFormBillingCity(inv.billingCity || "");
    setFormBillingState(inv.billingState || "WI");
    setFormBillingZip(inv.billingZip || "");
    setFormBillingEmail(inv.billingEmail || "");
    // Load line items
    try {
      const items = await (await fetch(`/api/invoices/${inv.id}/line-items`, { credentials: "include" })).json();
      setFormLineItems(items.length > 0 ? items : [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
    } catch {
      setFormLineItems([{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
    }
    setEditorOpen(true);
  }

  function addLineItem() {
    setFormLineItems([...formLineItems, { description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
  }

  function updateLineItem(index: number, field: keyof LineItem, value: any) {
    const updated = [...formLineItems];
    (updated[index] as any)[field] = value;
    updated[index].amount = updated[index].quantity * updated[index].unitPrice;
    setFormLineItems(updated);
  }

  function removeLineItem(index: number) {
    if (formLineItems.length <= 1) return;
    setFormLineItems(formLineItems.filter((_, i) => i !== index));
  }

  function populateFromCustomer(custId: number) {
    const c = customers.find(x => x.id === custId);
    if (!c) return;
    setFormBillingName(c.name);
    setFormBillingAddress(c.address || "");
    setFormBillingCity(c.city || "");
    setFormBillingState(c.state || "WI");
    setFormBillingZip(c.zip || "");
    setFormBillingEmail(c.email || "");
    // Default service address to customer address too
    if (!formServiceAddress) {
      setFormServiceAddress(c.address || "");
      setFormServiceCity(c.city || "");
      setFormServiceState(c.state || "WI");
      setFormServiceZip(c.zip || "");
    }
  }

  async function handleSubmit() {
    if (!formCustomerId) return toast({ title: "Select a customer", variant: "destructive" });
    if (formLineItems.every(li => !li.description)) return toast({ title: "Add at least one line item", variant: "destructive" });

    const invoiceData = {
      invoiceNumber: editingInvoiceId ? undefined : `INV-${Date.now()}`,
      customerId: formCustomerId,
      jobId: formJobId,
      status: "draft",
      issueDate: formIssueDate,
      dueDate: formDueDate,
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate: formTaxRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discountType: formDiscountType === "none" ? null : formDiscountType,
      discountValue: formDiscountType === "none" ? 0 : formDiscountValue,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      amountPaid: 0,
      balanceDue: Math.round(total * 100) / 100,
      serviceAddress: formServiceAddress || null,
      serviceCity: formServiceCity || null,
      serviceState: formServiceState || null,
      serviceZip: formServiceZip || null,
      billingName: formBillingName || null,
      billingAddress: formBillingAddress || null,
      billingCity: formBillingCity || null,
      billingState: formBillingState || null,
      billingZip: formBillingZip || null,
      billingEmail: formBillingEmail || null,
      notes: formNotes || null,
      termsAndConditions: formTerms || null,
    };

    const lineItemsData = formLineItems
      .filter(li => li.description)
      .map(li => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        amount: Math.round(li.quantity * li.unitPrice * 100) / 100,
      }));

    if (editingInvoiceId) {
      updateMutation.mutate({ id: editingInvoiceId, invoice: invoiceData, lineItems: lineItemsData });
    } else {
      createMutation.mutate({ invoice: invoiceData, lineItems: lineItemsData });
    }
  }

  // ── Preview data ──
  const previewInvoice = previewInvoiceId ? invoices.find(i => i.id === previewInvoiceId) : null;
  const previewCustomer = previewInvoice ? customers.find(c => c.id === previewInvoice.customerId) : null;

  // ── Render ──
  const inputClass = "bg-[#161b28] border-[#2d3344] text-white text-sm";
  const labelClass = "text-slate-400 text-xs font-medium";

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Invoices</h1>
            <p className="text-slate-400 text-sm">
              {invoices.length} invoices · ${invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} collected
            </p>
          </div>
        </div>
        <Button onClick={openNewInvoice} className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
          <Plus className="w-4 h-4 mr-2" />New Invoice
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#1d2332] border-[#2d3344] text-white placeholder:text-slate-500" />
      </div>

      {/* Invoice Table */}
      <Card className="border-[#2d3344] bg-[#1d2332] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3344] hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Invoice #</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Customer</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Issued</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Due</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Balance</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-[#2d3344]"><TableCell colSpan={8} className="text-center py-12 text-slate-500">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow className="border-[#2d3344]"><TableCell colSpan={8} className="text-center py-12 text-slate-500">No invoices found</TableCell></TableRow>
              ) : filtered.map((inv, i) => (
                <TableRow key={inv.id} className={`border-[#2d3344] hover:bg-white/[0.02] transition-colors ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/5" onClick={() => { setPreviewInvoiceId(inv.id); setPreviewOpen(true); }} title="Preview">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {inv.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/5" onClick={() => openEditInvoice(inv)} title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(inv.status === "draft" || inv.status === "sent") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-400 hover:bg-blue-500/5" onClick={() => sendSquareMutation.mutate(inv.id)} title="Send via Square" disabled={sendSquareMutation.isPending}>
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {inv.status !== "paid" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5" onClick={() => markPaidMutation.mutate(inv.id)} title="Mark paid">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/5" onClick={() => deleteMutation.mutate(inv.id)} title="Delete">
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

      {/* ═══════════ Invoice Editor Dialog ═══════════ */}
      <Dialog open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-[#1d2332] border-[#2d3344] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">{editingInvoiceId ? "Edit Invoice" : "New Invoice"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Customer & Job */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={labelClass}>Customer *</Label>
                <Select value={formCustomerId ? String(formCustomerId) : undefined} onValueChange={(v) => { const id = parseInt(v); setFormCustomerId(id); populateFromCustomer(id); }}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent className="bg-[#1d2332] border-[#2d3344] max-h-60">
                    {customers.map((c) => <SelectItem key={c.id} value={String(c.id)} className="text-slate-200">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelClass}>Related Job (optional)</Label>
                <Select value={formJobId ? String(formJobId) : "none"} onValueChange={(v) => setFormJobId(v === "none" ? null : parseInt(v))}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent className="bg-[#1d2332] border-[#2d3344] max-h-60">
                    <SelectItem value="none" className="text-slate-200">None</SelectItem>
                    {jobs.filter(j => !formCustomerId || j.customerId === formCustomerId).map((j) => (
                      <SelectItem key={j.id} value={String(j.id)} className="text-slate-200">{j.title} {j.finalPrice ? `($${j.finalPrice})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className={labelClass}>Issue Date</Label><Input type="date" value={formIssueDate} onChange={e => setFormIssueDate(e.target.value)} className={inputClass} /></div>
              <div><Label className={labelClass}>Due Date</Label><Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className={inputClass} /></div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white text-sm font-semibold">Line Items</Label>
                <Button size="sm" variant="ghost" onClick={addLineItem} className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/5 text-xs h-7">
                  <Plus className="w-3 h-3 mr-1" />Add Line
                </Button>
              </div>
              <div className="rounded-lg border border-[#2d3344] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0f1923]">
                      <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold w-[45%]">Description</th>
                      <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold w-[15%]">Qty</th>
                      <th className="text-left px-3 py-2 text-slate-500 text-xs uppercase font-semibold w-[20%]">Unit Price</th>
                      <th className="text-right px-3 py-2 text-slate-500 text-xs uppercase font-semibold w-[15%]">Amount</th>
                      <th className="w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formLineItems.map((li, idx) => (
                      <tr key={idx} className="border-t border-[#2d3344]">
                        <td className="px-2 py-1"><Input value={li.description} onChange={e => updateLineItem(idx, "description", e.target.value)} placeholder="Service description" className={`${inputClass} h-8 border-0 bg-transparent`} /></td>
                        <td className="px-2 py-1"><Input type="number" min="1" value={li.quantity} onChange={e => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)} className={`${inputClass} h-8 border-0 bg-transparent`} /></td>
                        <td className="px-2 py-1"><Input type="number" step="0.01" value={li.unitPrice || ""} onChange={e => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} placeholder="0.00" className={`${inputClass} h-8 border-0 bg-transparent`} /></td>
                        <td className="px-3 py-1 text-right text-white font-medium">${(li.quantity * li.unitPrice).toFixed(2)}</td>
                        <td className="px-1 py-1">
                          {formLineItems.length > 1 && (
                            <button onClick={() => removeLineItem(idx)} className="text-slate-600 hover:text-red-400 p-1"><X className="w-3 h-3" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Discount & Tax */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className={labelClass}>Discount</Label>
                <Select value={formDiscountType} onValueChange={setFormDiscountType}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1d2332] border-[#2d3344]">
                    <SelectItem value="none" className="text-slate-200">No discount</SelectItem>
                    <SelectItem value="percent" className="text-slate-200">% Discount</SelectItem>
                    <SelectItem value="flat" className="text-slate-200">$ Flat Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formDiscountType !== "none" && (
                <div>
                  <Label className={labelClass}>{formDiscountType === "percent" ? "Discount %" : "Discount $"}</Label>
                  <Input type="number" step="0.01" value={formDiscountValue || ""} onChange={e => setFormDiscountValue(parseFloat(e.target.value) || 0)} className={inputClass} />
                </div>
              )}
              <div>
                <Label className={labelClass}>Tax Rate %</Label>
                <Input type="number" step="0.01" value={formTaxRate || ""} onChange={e => setFormTaxRate(parseFloat(e.target.value) || 0)} placeholder="0" className={inputClass} />
              </div>
            </div>

            {/* Totals summary */}
            <div className="bg-[#0f1923] rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="text-white">${subtotal.toFixed(2)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-slate-400"><span>Discount {formDiscountType === "percent" ? `(${formDiscountValue}%)` : ""}</span><span className="text-red-400">-${discountAmount.toFixed(2)}</span></div>}
              {taxAmount > 0 && <div className="flex justify-between text-slate-400"><span>Tax ({formTaxRate}%)</span><span className="text-white">${taxAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-[#2d3344]"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>

            {/* Service Address */}
            <div>
              <Label className="text-white text-sm font-semibold">Service Address</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                <div className="col-span-4"><Input value={formServiceAddress} onChange={e => setFormServiceAddress(e.target.value)} placeholder="Street address" className={inputClass} /></div>
                <div className="col-span-2"><Input value={formServiceCity} onChange={e => setFormServiceCity(e.target.value)} placeholder="City" className={inputClass} /></div>
                <div><Input value={formServiceState} onChange={e => setFormServiceState(e.target.value)} placeholder="State" className={inputClass} /></div>
                <div><Input value={formServiceZip} onChange={e => setFormServiceZip(e.target.value)} placeholder="ZIP" className={inputClass} /></div>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-white text-sm font-semibold">Billing Address</Label>
                <Button size="sm" variant="ghost" onClick={() => { setFormBillingAddress(formServiceAddress); setFormBillingCity(formServiceCity); setFormBillingState(formServiceState); setFormBillingZip(formServiceZip); }} className="text-slate-500 hover:text-slate-300 text-xs h-6">
                  <Copy className="w-3 h-3 mr-1" />Same as service
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-1">
                <div className="col-span-2"><Input value={formBillingName} onChange={e => setFormBillingName(e.target.value)} placeholder="Name" className={inputClass} /></div>
                <div className="col-span-2"><Input value={formBillingEmail} onChange={e => setFormBillingEmail(e.target.value)} placeholder="Email (for sending)" className={inputClass} /></div>
                <div className="col-span-4"><Input value={formBillingAddress} onChange={e => setFormBillingAddress(e.target.value)} placeholder="Street address" className={inputClass} /></div>
                <div className="col-span-2"><Input value={formBillingCity} onChange={e => setFormBillingCity(e.target.value)} placeholder="City" className={inputClass} /></div>
                <div><Input value={formBillingState} onChange={e => setFormBillingState(e.target.value)} placeholder="State" className={inputClass} /></div>
                <div><Input value={formBillingZip} onChange={e => setFormBillingZip(e.target.value)} placeholder="ZIP" className={inputClass} /></div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className={labelClass}>Notes</Label><Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes visible to customer" className={`${inputClass} min-h-[60px]`} /></div>
              <div><Label className={labelClass}>Terms & Conditions</Label><Textarea value={formTerms} onChange={e => setFormTerms(e.target.value)} className={`${inputClass} min-h-[60px]`} /></div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSubmit} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingInvoiceId ? "Update Invoice" : "Create Invoice"}
              </Button>
              <Button variant="outline" onClick={() => setEditorOpen(false)} className="border-[#2d3344] text-slate-300 hover:bg-white/5">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Invoice Preview Dialog ═══════════ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-white text-black max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {previewInvoice && (
            <InvoicePreview invoice={previewInvoice} customer={previewCustomer} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Professional Invoice Preview Component
// ═══════════════════════════════════════════════════════════════════════════════

function InvoicePreview({ invoice, customer }: { invoice: Invoice; customer?: Customer | null }) {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Fetch line items
  useState(() => {
    fetch(`/api/invoices/${invoice.id}/line-items`, { credentials: "include" })
      .then(r => r.json())
      .then(setLineItems)
      .catch(() => {});
  });

  return (
    <div className="p-8 font-sans text-sm" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
          <p className="text-gray-500 mt-1">{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-gray-900">Clear The Clutter</h2>
          <p className="text-gray-600">Junk Removal & Hauling</p>
          <p className="text-gray-500">Oshkosh, WI</p>
          <p className="text-gray-500">(920) 424-9827</p>
          <p className="text-gray-500">info@cleartheclutter.net</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          invoice.status === "paid" ? "bg-green-100 text-green-700" :
          invoice.status === "sent" ? "bg-blue-100 text-blue-700" :
          invoice.status === "overdue" ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {invoice.status}
        </span>
      </div>

      {/* Addresses + Dates */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
          <p className="font-semibold text-gray-900">{invoice.billingName || customer?.name || "—"}</p>
          {(invoice.billingAddress || customer?.address) && <p className="text-gray-600">{invoice.billingAddress || customer?.address}</p>}
          {(invoice.billingCity || customer?.city) && (
            <p className="text-gray-600">{invoice.billingCity || customer?.city}, {invoice.billingState || customer?.state} {invoice.billingZip || customer?.zip}</p>
          )}
          {(invoice.billingEmail || customer?.email) && <p className="text-gray-500">{invoice.billingEmail || customer?.email}</p>}
        </div>
        {invoice.serviceAddress && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Service Address</p>
            <p className="text-gray-600">{invoice.serviceAddress}</p>
            <p className="text-gray-600">{invoice.serviceCity}, {invoice.serviceState} {invoice.serviceZip}</p>
          </div>
        )}
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice Details</p>
          <p className="text-gray-600">Issued: <span className="font-medium text-gray-900">{invoice.issueDate}</span></p>
          <p className="text-gray-600">Due: <span className="font-medium text-gray-900">{invoice.dueDate}</span></p>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
            <th className="text-right py-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-20">Qty</th>
            <th className="text-right py-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-28">Unit Price</th>
            <th className="text-right py-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.length > 0 ? lineItems.map((li, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-3 text-gray-900">{li.description}</td>
              <td className="py-3 text-right text-gray-600">{li.quantity}</td>
              <td className="py-3 text-right text-gray-600">${li.unitPrice.toFixed(2)}</td>
              <td className="py-3 text-right font-medium text-gray-900">${li.amount.toFixed(2)}</td>
            </tr>
          )) : (
            <tr className="border-b border-gray-100">
              <td className="py-3 text-gray-900">Services</td>
              <td className="py-3 text-right text-gray-600">1</td>
              <td className="py-3 text-right text-gray-600">${invoice.total.toFixed(2)}</td>
              <td className="py-3 text-right font-medium text-gray-900">${invoice.total.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span></div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount{invoice.discountType === "percent" ? ` (${invoice.discountValue}%)` : ""}</span>
              <span className="text-red-600">-${invoice.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between text-gray-600"><span>Tax ({invoice.taxRate}%)</span><span>${invoice.taxAmount.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-gray-900 text-gray-900">
            <span>Total</span><span>${invoice.total.toFixed(2)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <div className="flex justify-between text-green-600 font-medium"><span>Paid</span><span>-${invoice.amountPaid.toFixed(2)}</span></div>
          )}
          {invoice.balanceDue > 0 && (
            <div className="flex justify-between font-bold text-orange-600"><span>Balance Due</span><span>${invoice.balanceDue.toFixed(2)}</span></div>
          )}
        </div>
      </div>

      {/* Notes & Terms */}
      {invoice.notes && (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-gray-600 text-sm">{invoice.notes}</p>
        </div>
      )}
      {invoice.termsAndConditions && (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Terms & Conditions</p>
          <p className="text-gray-500 text-xs">{invoice.termsAndConditions}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <p className="text-gray-400 text-xs">Thank you for choosing Clear The Clutter Junk Removal!</p>
        <p className="text-gray-400 text-xs">ClearTheClutterJunkRemoval.com</p>
      </div>
    </div>
  );
}
