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
  Megaphone,
  Tag,
  QrCode,
  Shield,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TicketScannerDialog } from "@/components/scanner";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Sorteos",
    url: "/dashboard/raffles",
    icon: Gift,
  },
  {
    title: "Compradores",
    url: "/dashboard/buyers",
    icon: Users,
  },
  {
    title: "Analíticas",
    url: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Marketing",
    url: "/dashboard/marketing",
    icon: Megaphone,
  },
  {
    title: "Cupones",
    url: "/dashboard/coupons",
    icon: Tag,
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
  const [scannerOpen, setScannerOpen] = useState(false);

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
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" />
          <span className="text-lg font-extrabold text-sidebar-foreground">SORTAVO</span>
        </Link>
        {isSimulating && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-500/10 px-2 py-1.5 border border-amber-500/20">
            <Eye className="h-3.5 w-3.5 text-amber-600" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">
                Simulando
              </span>
              <span className="text-xs text-amber-700 truncate">
                {simulatedUser?.full_name || simulatedUser?.email}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className={`ml-auto text-[9px] px-1 py-0 ${
                simulationMode === 'readonly' 
                  ? 'border-amber-500 text-amber-600' 
                  : 'border-destructive text-destructive'
              }`}
            >
              {simulationMode === 'readonly' ? 'R/O' : 'FULL'}
            </Badge>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setScannerOpen(true)}
                  tooltip="Escanear QR"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Escanear QR</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ajustes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.startsWith('/admin')}
                    tooltip="Panel Super Admin"
                  >
                    <Link to="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Panel Super Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {profile?.full_name || "Usuario"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {organization?.name || "Organización"}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/subscription">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Suscripción
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
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
