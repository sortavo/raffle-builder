import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Ticket, BarChart3, Settings, Menu as MenuIcon, CreditCard, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Inicio", path: "/dashboard" },
  { icon: Ticket, label: "Sorteos", path: "/dashboard/raffles" },
  { icon: BarChart3, label: "Stats", path: "/dashboard/analytics" },
  { icon: Settings, label: "Ajustes", path: "/dashboard/settings" },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile, organization, signOut, user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile Bottom Nav - Only visible on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors touch-manipulation",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Menu Sheet */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors touch-manipulation",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <MenuIcon className="h-5 w-5" />
                <span className="text-[10px] font-medium">Más</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl">
              <div className="space-y-6 py-4">
                <h3 className="text-lg font-semibold text-center">Menú</h3>

                {/* User info */}
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {profile?.full_name || "Usuario"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user?.email}
                    </p>
                    {organization && (
                      <p className="text-xs text-muted-foreground truncate">
                        {organization.name}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Additional menu items */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12"
                    onClick={() => {
                      navigate("/pricing");
                      setMenuOpen(false);
                    }}
                  >
                    <CreditCard className="mr-3 h-5 w-5" />
                    Ver Planes
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12"
                    onClick={() => {
                      navigate("/dashboard/settings");
                      setMenuOpen(false);
                    }}
                  >
                    <User className="mr-3 h-5 w-5" />
                    Mi Perfil
                  </Button>

                  <Separator />

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}
