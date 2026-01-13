import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";
import { AdminSidebar } from "./AdminSidebar";
import { AdminSidebarContent } from "./AdminSidebarContent";
import { MFARequired } from "./MFARequired";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Menu, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden hover:bg-primary/10 dark:hover:bg-primary/20">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 border-r border-border/50">
        <AdminSidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function AdminLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-accent w-fit mx-auto shadow-xl shadow-primary/25">
          <Shield className="h-8 w-8 text-white animate-pulse" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mx-auto bg-primary/20 dark:bg-primary/30" />
          <Skeleton className="h-3 w-48 mx-auto bg-primary/10 dark:bg-primary/20" />
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isPlatformAdmin, isLoading: adminLoading, isSortavoEmail } = useIsPlatformAdmin();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!authLoading && !adminLoading) {
      // Verificar dominio del email primero
      if (!isSortavoEmail) {
        navigate("/dashboard");
        return;
      }

      // Verificar rol de platform admin
      if (!isPlatformAdmin) {
        navigate("/dashboard");
        return;
      }
    }
  }, [authLoading, adminLoading, user, isPlatformAdmin, isSortavoEmail, navigate]);

  if (authLoading || adminLoading) {
    return <AdminLoadingSkeleton />;
  }

  if (!isPlatformAdmin || !isSortavoEmail) {
    return null;
  }

  return (
    <MFARequired>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-primary/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10 flex">
        <AdminSidebar />
        
        <main className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-border/50">
            <div className="flex items-center justify-between px-4 md:px-6 h-16">
              <div className="flex items-center gap-3">
                <AdminMobileNav />
                <div className="md:hidden flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-accent shadow-lg shadow-primary/25">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-sm bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Super Admin
                  </span>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                asChild 
                className="hidden sm:flex hover:bg-primary/10 dark:hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
              >
                <Link to="/dashboard">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 md:p-6">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            
            {children}
          </div>
        </main>
      </div>
    </MFARequired>
  );
}
