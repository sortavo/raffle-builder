import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";
import { useSimulation } from "@/contexts/SimulationContext";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
import { useActiveRafflesCount } from "@/hooks/useActiveRafflesCount";
import {
  Ticket,
  LayoutDashboard,
  Gift,
  Users,
  Settings,
  CreditCard,
  BarChart3,
  LogOut,
  ChevronUp,
  HelpCircle,
  Tag,
  QrCode,
  Shield,
  Eye,
  Trophy,
  History,
  ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TicketScannerDialog } from "@/components/scanner";
import { SubscriptionBadge } from "./SubscriptionBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import sortavoLogo from "@/assets/sortavo-logo.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    badgeKey: null as string | null,
  },
  {
    title: "Sorteos",
    url: "/dashboard/raffles",
    icon: Gift,
    badgeKey: 'activeRaffles' as string | null,
  },
  {
    title: "Aprobaciones",
    url: "/dashboard/approvals",
    icon: ClipboardCheck,
    badgeKey: 'pendingApprovals' as string | null,
  },
  {
    title: "Compradores",
    url: "/dashboard/buyers",
    icon: Users,
    badgeKey: null as string | null,
  },
  {
    title: "Analíticas",
    url: "/dashboard/analytics",
    icon: BarChart3,
    badgeKey: null as string | null,
  },
  {
    title: "Cupones",
    url: "/dashboard/coupons",
    icon: Tag,
    badgeKey: null as string | null,
  },
];

const settingsItems = [
  {
    title: "Configuración",
    url: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Suscripción",
    url: "/dashboard/subscription",
    icon: CreditCard,
  },
  {
    title: "Historial",
    url: "/dashboard/audit-log",
    icon: History,
  },
  {
    title: "Centro de Ayuda",
    url: "/help",
    icon: HelpCircle,
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { profile, organization, signOut } = useAuth();
  const { isPlatformAdmin } = useIsPlatformAdmin();
  const { isSimulating, simulatedUser, simulatedOrg, mode: simulationMode } = useSimulation();
  const { count: pendingApprovalsCount } = usePendingApprovals();
  const { count: activeRafflesCount } = useActiveRafflesCount();
  const { state } = useSidebar();
  const [scannerOpen, setScannerOpen] = useState(false);
  const isCollapsed = state === "collapsed";

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 px-4 py-4">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <img src={sortavoLogo} alt="Sortavo" className="h-8 w-auto" />
        </Link>
        
        {/* Subscription Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/dashboard/subscription" className="mt-3">
              <SubscriptionBadge 
                tier={organization?.subscription_tier || "basic"}
                status={organization?.subscription_status}
                trialEndsAt={organization?.trial_ends_at}
                collapsed={isCollapsed}
              />
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <p className="capitalize">{organization?.subscription_tier || "Basic"}</p>
            </TooltipContent>
          )}
        </Tooltip>
        
        {isSimulating && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-warning/10 to-warning/5 px-3 py-2 border border-warning/20">
            <Eye className="h-3.5 w-3.5 text-warning" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-medium text-warning uppercase tracking-wider">
                Simulando
              </span>
              <span className="text-xs text-warning truncate">
                {simulatedUser?.full_name || simulatedUser?.email}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className={`ml-auto text-[9px] px-1.5 py-0.5 ${
                simulationMode === 'readonly' 
                  ? 'border-warning text-warning bg-warning/10' 
                  : 'border-destructive text-destructive bg-destructive/10'
              }`}
            >
              {simulationMode === 'readonly' ? 'R/O' : 'FULL'}
            </Badge>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            Menú Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const badgeCount = item.badgeKey === 'pendingApprovals' 
                  ? pendingApprovalsCount 
                  : item.badgeKey === 'activeRaffles' 
                    ? activeRafflesCount 
                    : 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className={`group transition-all duration-200 ${
                        isActive(item.url) 
                          ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40' 
                          : 'hover:bg-primary/10'
                      }`}
                    >
                      <Link to={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'text-white' : 'text-muted-foreground group-hover:text-primary'}`} />
                          <span className={isActive(item.url) ? 'font-medium' : 'group-hover:text-primary'}>{item.title}</span>
                        </div>
                        {badgeCount > 0 && !isCollapsed && (
                          <Badge 
                            variant={item.badgeKey === 'pendingApprovals' ? 'default' : 'secondary'}
                            className={`ml-auto text-[10px] px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center ${
                              isActive(item.url) 
                                ? 'bg-white/20 text-white border-white/30' 
                                : item.badgeKey === 'pendingApprovals'
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : ''
                            }`}
                          >
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setScannerOpen(true)}
                  tooltip="Escanear QR"
                  className="group transition-all duration-200 hover:bg-primary/10"
                >
                  <QrCode className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span className="group-hover:text-primary">Escanear QR</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            Ajustes
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`group transition-all duration-200 ${
                      isActive(item.url) 
                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25' 
                        : 'hover:bg-primary/10'
                    }`}
                  >
                    <Link to={item.url}>
                      <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'text-white' : 'text-muted-foreground group-hover:text-primary'}`} />
                      <span className={isActive(item.url) ? 'font-medium' : 'group-hover:text-primary'}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.startsWith('/admin')}
                    tooltip="Panel Super Admin"
                    className={`group transition-all duration-200 ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-gradient-to-r from-accent to-primary text-white shadow-lg shadow-accent/25' 
                        : 'hover:bg-accent/10'
                    }`}
                  >
                    <Link to="/admin">
                      <Shield className={`h-4 w-4 ${location.pathname.startsWith('/admin') ? 'text-white' : 'text-muted-foreground group-hover:text-accent'}`} />
                      <span className={location.pathname.startsWith('/admin') ? 'font-medium' : 'group-hover:text-accent'}>Panel Super Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-3 px-3 hover:bg-primary/10 transition-all duration-200 rounded-xl">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-medium">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-semibold truncate max-w-[140px]">
                      {profile?.full_name || "Usuario"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {organization?.name || "Organización"}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-xl shadow-xl border-border/50">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-primary/10 rounded-lg">
                  <Link to="/dashboard/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-primary/10 rounded-lg">
                  <Link to="/dashboard/subscription" className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                    Suscripción
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive hover:bg-destructive/10 rounded-lg">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <TicketScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </Sidebar>
  );
}
