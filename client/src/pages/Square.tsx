import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Users, ShoppingCart, CheckCircle2, XCircle, Loader2, Unplug } from "lucide-react";

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
    if (s === "completed") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (s === "failed") return <XCircle className="w-4 h-4 text-red-600" />;
    if (s === "running") return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Square Integration</h1>
        <p className="text-muted-foreground">Import customers and sales data from Square</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Connection Status
          </CardTitle>
          <CardDescription>
            {connected ? "Your Square account is connected" : "Connect your Square account to import data"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800 gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </Badge>
              <Button variant="outline" size="sm" onClick={() => disconnectMutation.mutate()}>
                <Unplug className="w-4 h-4 mr-2" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Square Access Token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={() => connectMutation.mutate(accessToken)} disabled={!accessToken || connectMutation.isPending}>
                Connect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {connected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Import Customers</CardTitle>
              <CardDescription>Pull customer records from Square</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => importCustomersMutation.mutate()} disabled={importCustomersMutation.isPending}>
                {importCustomersMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import Customers
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Import Sales</CardTitle>
              <CardDescription>Pull completed orders from Square</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => importSalesMutation.mutate()} disabled={importSalesMutation.isPending}>
                {importSalesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {imports.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Import History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="capitalize">{imp.type}</TableCell>
                    <TableCell><div className="flex items-center gap-1">{statusIcon(imp.status)} {imp.status}</div></TableCell>
                    <TableCell>{imp.recordsImported} / {imp.totalRecords}</TableCell>
                    <TableCell className="text-sm">{imp.startedAt ? new Date(imp.startedAt).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-sm">{imp.completedAt ? new Date(imp.completedAt).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-sm text-destructive max-w-[200px] truncate">{imp.error ?? "-"}</TableCell>
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
