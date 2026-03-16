import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter, SidebarGroup, SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, Briefcase, Calendar, FileText,
  MessageSquare, BarChart3, CreditCard, ExternalLink, Trash2, Brain
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Jobs", icon: Briefcase, href: "/jobs" },
  { label: "Schedule", icon: Calendar, href: "/schedule" },
  { label: "Invoices", icon: FileText, href: "/invoices", badge: "NEW" },
  { label: "Communications", icon: MessageSquare, href: "/communications" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "AI Insights", icon: Brain, href: "/ai-insights", badge: "NEW" },
  { label: "Square", icon: CreditCard, href: "/square" },
];

export function AppSidebar() {
  const [location] = useHashLocation();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
            <Trash2 className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white truncate tracking-tight">CTC Business Hub</span>
            <span className="text-[11px] text-sidebar-foreground/50 truncate">Clear the Clutter</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-4 mb-1">
            Main Menu
          </SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={`mx-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-orange-400"
                        : "text-sidebar-foreground/60 hover:text-white hover:bg-white/5"
                    }`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-orange-400" : ""}`} />
                      <span className="flex-1 text-[13px]">{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-orange-400 tracking-wide">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-4 mb-1">
            Integrations
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="mx-2 rounded-lg text-sidebar-foreground/60 hover:text-white hover:bg-white/5 transition-all duration-200">
                <a href="https://donelocal.io" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-[13px]">DoneLocal</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-[11px] text-sidebar-foreground/30 truncate">cleartheclutterjunkremoval.com</p>
      </SidebarFooter>
    </Sidebar>
  );
}
