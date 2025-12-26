import { ReactNode, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";
import { AdminSidebar } from "./AdminSidebar";
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
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <AdminSidebar />
      </SheetContent>
    </Sheet>
  );
}

function AdminLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="p-4 rounded-full bg-purple-600/10 w-fit mx-auto">
          <Shield className="h-8 w-8 text-purple-600 animate-pulse" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-48 mx-auto" />
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
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <AdminMobileNav />
              <div className="lg:hidden flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-sm">Super Admin</span>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          <div className="page-header">
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-description">{description}</p>}
          </div>
          
          {children}
        </div>
      </main>
    </div>
  );
}
