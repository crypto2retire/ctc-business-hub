import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Users, ShoppingCart, CheckCircle2, XCircle, Loader2, Unplug, Zap } from "lucide-react";

interface SquareStatus { connected: boolean; }
interface SquareImport {
  id: number;
  type: string;
  status: string;
  recordsImported: number;
  totalRecords: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

export default function Square() {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState("");

  const { data: status } = useQuery<SquareStatus>({ queryKey: ["/api/square/status"] });
  const { data: imports = [] } = useQuery<SquareImport[]>({ queryKey: ["/api/square/imports"] });

  const connectMutation = useMutation({
    mutationFn: (token: string) => apiRequest("POST", "/api/square/connect", { accessToken: token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/square/status"] });
      setAccessToken("");
      toast({ title: "Connected to Square" });
    },
    onError: (err: Error) => toast({ title: "Connection failed", description: err.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/square/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/square/status"] });
      toast({ title: "Disconnected from Square" });
    },
  });

  const importCustomersMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/square/import-customers"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/square/imports"] });
      toast({ title: "Customer import started" });
    },
    onError: (err: Error) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
  });

  const importSalesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/square/import-sales"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/square/imports"] });
      toast({ title: "Sales import started" });
    },
    onError: (err: Error) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
  });

  const connected = status?.connected ?? false;

  const statusIcon = (s: string) => {
    if (s === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (s === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
    if (s === "running") return <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />;
    return <div className="w-4 h-4 rounded-full bg-slate-600" />;
  };

  const statusStyle: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    running: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    pending: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Square Integration</h1>
          <p className="text-slate-400 text-sm">Import customers and sales data from Square</p>
        </div>
      </div>

      <Card className="border-[#2a2d35] bg-[#1e2128]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400" /> Connection Status
          </CardTitle>
          <CardDescription className="text-slate-400">
            {connected ? "Your Square account is connected and ready" : "Connect your Square account to start importing data"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
              <Button variant="outline" size="sm" className="border-[#2a2d35] bg-transparent text-slate-300 hover:bg-red-500/5 hover:text-red-400 hover:border-red-500/20" onClick={() => disconnectMutation.mutate()}>
                <Unplug className="w-4 h-4 mr-2" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Paste your Square Access Token..."
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="max-w-md bg-[#151821] border-[#2a2d35] text-white placeholder:text-slate-600"
              />
              <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0" onClick={() => connectMutation.mutate(accessToken)} disabled={!accessToken || connectMutation.isPending}>
                Connect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {connected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="border-[#2a2d35] bg-[#1e2128] hover:border-[#363940] transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-sm text-white flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Import Customers</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Pull customer records from your Square account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-600/10" onClick={() => importCustomersMutation.mutate()} disabled={importCustomersMutation.isPending}>
                {importCustomersMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import Customers
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[#2a2d35] bg-[#1e2128] hover:border-[#363940] transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-sm text-white flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-emerald-400" /> Import Sales</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Pull completed orders and create job records</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-600/10" onClick={() => importSalesMutation.mutate()} disabled={importSalesMutation.isPending}>
                {importSalesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {imports.length > 0 && (
        <Card className="border-[#2a2d35] bg-[#1e2128] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm text-white">Import History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2a2d35] hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Type</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Records</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Started</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Completed</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp, i) => (
                  <TableRow key={imp.id} className={`border-[#2a2d35] hover:bg-white/[0.02] transition-colors ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                    <TableCell className="text-white capitalize font-medium">{imp.type}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyle[imp.status] ?? ""}`}>
                        {statusIcon(imp.status)} {imp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono text-sm">{imp.recordsImported} <span className="text-slate-600">/</span> {imp.totalRecords}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{imp.startedAt ? new Date(imp.startedAt).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{imp.completedAt ? new Date(imp.completedAt).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-red-400 text-sm max-w-[200px] truncate">{imp.error ?? <span className="text-slate-600">-</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
