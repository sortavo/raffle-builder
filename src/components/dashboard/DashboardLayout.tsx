import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Trophy, Eye, LogOut, Users } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { TrialBanner } from "./TrialBanner";
import { useSimulation } from "@/contexts/SimulationContext";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkipLink } from "@/components/ui/skip-link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardLayout({ children, title, breadcrumbs }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { organization, refreshOrganization } = useAuth();
  const { isSimulating, simulatedUser, mode, endSimulation, toggleMode } = useSimulation();
  const { isPlatformAdmin } = useIsPlatformAdmin();
  const hasVerifiedOnboarding = useRef(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Redirect to onboarding if not completed (with double-check to avoid race conditions)
  useEffect(() => {
    const verifyOnboarding = async () => {
      if (!organization || hasVerifiedOnboarding.current || isVerifying) return;
      
      if (organization.onboarding_completed === false) {
        console.debug("[DashboardLayout] onboarding_completed=false, verifying with backend...");
        setIsVerifying(true);
        hasVerifiedOnboarding.current = true;
        
        // Refresh to get latest data from backend
        await refreshOrganization();
        setIsVerifying(false);
      }
    };
    
    verifyOnboarding();
  }, [organization, refreshOrganization, isVerifying]);

  // Separate effect to handle redirect after verification
  useEffect(() => {
    if (hasVerifiedOnboarding.current && !isVerifying && organization) {
      if (organization.onboarding_completed === false) {
        console.debug("[DashboardLayout] Confirmed onboarding not completed, redirecting...");
        navigate("/onboarding");
      } else {
        console.debug("[DashboardLayout] Onboarding is completed, staying in dashboard");
      }
    }
  }, [organization, isVerifying, navigate]);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleExitSimulation = async () => {
    await endSimulation();
    navigate('/admin/users');
  };

  return (
    <SidebarProvider>
      {/* Skip link for keyboard navigation - WCAG 2.4.1 */}
      <SkipLink href="#main-content">
        Saltar al contenido principal
      </SkipLink>
      
      {/* Spacer for simulation banner */}
      {isSimulating && <div className="h-12" />}
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <DashboardSidebar />
      </div>
      
      <SidebarInset className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:from-background dark:via-background dark:to-primary/10">
        {/* Mobile Header */}
        <header className="md:hidden flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 safe-area-top">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              SORTAVO
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {isPlatformAdmin && !isSimulating && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="h-3 w-3" />
                Simular
              </Button>
            )}
            {isSimulating && simulatedUser && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/30">
                <Eye className="h-3 w-3 text-warning" />
                <span className="text-xs font-medium text-warning truncate max-w-16">
                  {simulatedUser.full_name?.split(' ')[0] || simulatedUser.email.split('@')[0]}
                </span>
              </div>
            )}
            <NotificationCenter />
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:px-6">
          <SidebarTrigger className="-ml-1 hover:bg-primary/10 transition-colors" />
          <Separator orientation="vertical" className="h-6 bg-border/50" />
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={index}>
                    {index > 0 && <BreadcrumbSeparator />}
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-primary transition-colors">{crumb.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="font-medium">{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          
          {/* Simulation Button / Indicator */}
          {isPlatformAdmin && !isSimulating && (
            <Button 
              size="sm" 
              variant="outline" 
              className="ml-2 gap-2 border-primary/30 text-primary hover:bg-primary/10 transition-all"
              onClick={() => navigate('/admin/users')}
            >
              <Users className="h-4 w-4" />
              Simular Usuario
            </Button>
          )}
          {isSimulating && simulatedUser && (
            <div className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/30">
              <Eye className="h-4 w-4 text-warning" />
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-warning/30 to-warning/20 text-warning">
                  {getInitials(simulatedUser.full_name, simulatedUser.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-warning max-w-32 truncate">
                {simulatedUser.full_name || simulatedUser.email}
              </span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0 cursor-pointer transition-colors",
                  mode === 'readonly' 
                    ? "border-warning text-warning hover:bg-warning/20" 
                    : "border-destructive text-destructive bg-destructive/10 hover:bg-destructive/20"
                )}
                onClick={toggleMode}
                title="Clic para cambiar modo"
              >
                {mode === 'readonly' ? 'R/O' : 'FULL'}
              </Badge>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0 hover:bg-warning/20"
                onClick={handleExitSimulation}
              >
                <LogOut className="h-3 w-3 text-warning" />
              </Button>
            </div>
          )}
          
          <div className="flex-1 flex justify-center px-4">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
          </div>
        </header>
        
        <main 
          id="main-content" 
          className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8 w-full max-w-full min-w-0"
          tabIndex={-1}
        >
          <TrialBanner />
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileNav />}
      </SidebarInset>
    </SidebarProvider>
  );
}
