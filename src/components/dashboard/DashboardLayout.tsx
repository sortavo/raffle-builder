import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Ticket, Bell } from "lucide-react";
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

  return (
    <SidebarProvider>
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
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-5 w-5" />
          </Button>
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
        </header>
        
        <main className="flex-1 p-4 lg:p-6 pb-20 md:pb-6">{children}</main>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileNav />}
      </SidebarInset>
    </SidebarProvider>
  );
}
