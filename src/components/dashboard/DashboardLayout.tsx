import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Ticket, Eye, LogOut } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { TrialBanner } from "./TrialBanner";
import { useSimulation } from "@/contexts/SimulationContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const { isSimulating, simulatedUser, mode, endSimulation, toggleMode } = useSimulation();

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
      {/* Spacer for simulation banner */}
      {isSimulating && <div className="h-12" />}
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <DashboardSidebar />
      </div>
      
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex h-14 items-center justify-between border-b bg-card px-4 safe-area-top">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <span className="text-lg font-extrabold">SORTAVO</span>
          </Link>
          <div className="flex items-center gap-2">
            {isSimulating && simulatedUser && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                <Eye className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate max-w-16">
                  {simulatedUser.full_name?.split(' ')[0] || simulatedUser.email.split('@')[0]}
                </span>
              </div>
            )}
            <NotificationCenter />
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={index}>
                    {index > 0 && <BreadcrumbSeparator />}
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          
          {/* Simulation Indicator */}
          {isSimulating && simulatedUser && (
            <div className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
              <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                  {getInitials(simulatedUser.full_name, simulatedUser.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300 max-w-32 truncate">
                {simulatedUser.full_name || simulatedUser.email}
              </span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0 cursor-pointer transition-colors",
                  mode === 'readonly' 
                    ? "border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800" 
                    : "border-red-500 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40"
                )}
                onClick={toggleMode}
                title="Clic para cambiar modo"
              >
                {mode === 'readonly' ? 'R/O' : 'FULL'}
              </Badge>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0 hover:bg-amber-200 dark:hover:bg-amber-800"
                onClick={handleExitSimulation}
              >
                <LogOut className="h-3 w-3 text-amber-700 dark:text-amber-300" />
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
        
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 sm:pb-6 overflow-x-hidden">
          <TrialBanner />
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileNav />}
      </SidebarInset>
    </SidebarProvider>
  );
}
