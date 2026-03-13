import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Jobs from "@/pages/Jobs";
import Schedule from "@/pages/Schedule";
import Invoices from "@/pages/Invoices";
import Communications from "@/pages/Communications";
import Analytics from "@/pages/Analytics";
import Square from "@/pages/Square";
import NotFound from "@/pages/not-found";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
    <Switch>
      <Route path="/" component={() => <AppLayout><Dashboard /></AppLayout>} />
      <Route path="/customers" component={() => <AppLayout><Customers /></AppLayout>} />
      <Route path="/jobs" component={() => <AppLayout><Jobs /></AppLayout>} />
      <Route path="/schedule" component={() => <AppLayout><Schedule /></AppLayout>} />
      <Route path="/invoices" component={() => <AppLayout><Invoices /></AppLayout>} />
      <Route path="/communications" component={() => <AppLayout><Communications /></AppLayout>} />
      <Route path="/analytics" component={() => <AppLayout><Analytics /></AppLayout>} />
      <Route path="/square" component={() => <AppLayout><Square /></AppLayout>} />
      <Route component={NotFound} />
    </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster />
    </QueryClientProvider>
  );
}
