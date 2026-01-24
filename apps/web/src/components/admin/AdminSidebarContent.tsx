import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  ChevronLeft,
  Shield,
  DollarSign,
  Activity,
  UserCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const menuItems = [
  { title: "Vista General", url: "/admin", icon: LayoutDashboard },
  { title: "Financiero", url: "/admin/financial", icon: DollarSign },
  { title: "Actividad", url: "/admin/activity", icon: Activity },
  { title: "Usuarios", url: "/admin/users-dashboard", icon: UserCircle },
  { title: "Organizaciones", url: "/admin/organizations", icon: Building2 },
  { title: "Suscripciones", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Dominios", url: "/admin/domains", icon: Globe },
  { title: "Lista Usuarios", url: "/admin/users", icon: Users },
];

interface AdminSidebarContentProps {
  onNavigate?: () => void;
}

export function AdminSidebarContent({ onNavigate }: AdminSidebarContentProps) {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-lg shadow-primary/25">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Super Admin
            </h2>
            <p className="text-xs text-muted-foreground">Panel de Plataforma</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive(item.url)
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                isActive(item.url) ? "text-white" : ""
              )} />
              {item.title}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start hover:bg-primary/10 dark:hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" 
          asChild
        >
          <Link to="/dashboard" onClick={onNavigate}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
