import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Ticket, BarChart3, Settings, Menu as MenuIcon, CreditCard, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Backdrop blur effect */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />
        
        {/* Navigation items */}
        <div className="relative flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 touch-manipulation"
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-0.5 w-8 h-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon container */}
                <motion.div
                  className={cn(
                    "p-2 rounded-xl transition-all duration-300",
                    active
                      ? "bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40"
                      : "bg-transparent"
                  )}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      active
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-muted-foreground"
                    )}
                  />
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-300",
                    active
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>

                {/* Badge for notifications */}
                {item.badge && item.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1/4"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  </motion.div>
                )}
              </button>
            );
          })}

          {/* Menu Sheet */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 touch-manipulation"
              >
                <motion.div
                  className="p-2 rounded-xl bg-transparent"
                  whileTap={{ scale: 0.9 }}
                >
                  <MenuIcon className="h-5 w-5 text-muted-foreground" />
                </motion.div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Más
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl px-6 pb-8">
              {/* Drag handle */}
              <div className="flex justify-center py-2 mb-2">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
              </div>
              
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-center">Menú</h3>

                {/* User info */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-2xl">
                  <Avatar className="h-14 w-14 ring-2 ring-violet-200 dark:ring-violet-800">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-lg">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {profile?.full_name || "Usuario"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user?.email}
                    </p>
                    {organization && (
                      <p className="text-xs text-violet-600 dark:text-violet-400 truncate font-medium">
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
                    className="w-full justify-start h-14 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/30"
                    onClick={() => {
                      navigate("/pricing");
                      setMenuOpen(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 flex items-center justify-center mr-3">
                      <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="font-medium">Ver Planes</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-14 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/30"
                    onClick={() => {
                      navigate("/dashboard/settings");
                      setMenuOpen(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="font-medium">Mi Perfil</span>
                  </Button>

                  <Separator className="my-4" />

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-14 rounded-xl text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mr-3">
                      <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="font-medium">Cerrar Sesión</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Safe area spacing for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="h-20 md:hidden" />
    </>
  );
}
