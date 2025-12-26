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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Vista General", url: "/admin", icon: LayoutDashboard },
  { title: "Financiero", url: "/admin/financial", icon: DollarSign },
  { title: "Actividad", url: "/admin/activity", icon: Activity },
  { title: "Usuarios", url: "/admin/users-dashboard", icon: UserCircle },
  { title: "Organizaciones", url: "/admin/organizations", icon: Building2 },
  { title: "Suscripciones", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Lista Usuarios", url: "/admin/users", icon: Users },
];

export function AdminSidebar() {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Super Admin</h2>
            <p className="text-xs text-muted-foreground">Panel de Plataforma</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(item.url)
                ? "bg-purple-600 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.title}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link to="/dashboard">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Link>
        </Button>
      </div>
    </aside>
  );
}
