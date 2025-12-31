import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Clock, 
  BarChart3,
  Trophy,
  Pencil,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRaffles } from '@/hooks/useRaffles';
import { useAuth } from '@/hooks/useAuth';
import { OverviewTab } from '@/components/raffle/detail/OverviewTab';
import { TicketsTab } from '@/components/raffle/detail/TicketsTab';
import { BuyersTab } from '@/components/raffle/detail/BuyersTab';
import { ApprovalsTab } from '@/components/raffle/detail/ApprovalsTab';
import { AnalyticsTab } from '@/components/raffle/detail/AnalyticsTab';
import { ExportMenu } from '@/components/raffle/detail/ExportMenu';
import { RaffleDetailSkeleton } from '@/components/ui/skeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageTransition } from '@/components/layout/PageTransition';

export default function RaffleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const { useRaffleById, toggleRaffleStatus } = useRaffles();
  const { data: raffle, isLoading, error } = useRaffleById(id);

  // DEBUG: Detect overflow culprits - REMOVE after fixing
  useEffect(() => {
    const checkOverflow = () => {
      const elements = document.querySelectorAll('*');
      const culprits: { el: Element; diff: number; classes: string; tag: string }[] = [];
      
      elements.forEach(el => {
        const htmlEl = el as HTMLElement;
        // Skip elements inside overflow-x-auto containers (expected scroll)
        if (htmlEl.closest('[class*="overflow-x-auto"]')) return;
        // Skip sr-only elements (screen reader, positioned off-screen)
        if (htmlEl.classList.contains('sr-only')) return;
        // Skip very small overflows (< 5px, likely rounding)
        const diff = htmlEl.scrollWidth - htmlEl.clientWidth;
        if (diff < 5) return;
        
        culprits.push({
          el: htmlEl,
          diff,
          classes: htmlEl.className || '(no class)',
          tag: htmlEl.tagName
        });
      });
      
      // Sort by difference (biggest overflow first)
      culprits.sort((a, b) => b.diff - a.diff);
      
      // Log top 5 culprits with full details
      if (culprits.length > 0) {
        console.warn('🔴 OVERFLOW CULPRITS (>5px):', culprits.slice(0, 5).map(c => ({
          tag: c.tag,
          overflow: c.diff + 'px',
          classes: c.classes.substring(0, 100) + (c.classes.length > 100 ? '...' : '')
        })));
        
        // Highlight top 3 with red border
        culprits.slice(0, 3).forEach(c => {
          (c.el as HTMLElement).style.outline = '3px solid red';
          (c.el as HTMLElement).style.outlineOffset = '-3px';
        });
      } else {
        console.log('✅ No significant overflow detected (>5px threshold)');
      }
    };
    
    const timeout = setTimeout(checkOverflow, 2000);
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [raffle]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <RaffleDetailSkeleton />
      </DashboardLayout>
    );
  }

  if (error || !raffle) {
    return (
      <DashboardLayout>
        <ErrorState
          title="Sorteo no encontrado"
          message="El sorteo que buscas no existe o fue eliminado."
          retry={() => navigate('/dashboard/raffles')}
        />
      </DashboardLayout>
    );
  }

  const handleToggleStatus = () => {
    toggleRaffleStatus.mutate({ 
      id: raffle.id, 
      currentStatus: raffle.status! 
    });
  };

  const tabs = [
    { value: 'overview', label: 'Resumen', icon: LayoutDashboard },
    { value: 'tickets', label: 'Boletos', icon: Ticket },
    { value: 'buyers', label: 'Compradores', icon: Users },
    { value: 'approvals', label: 'Aprobaciones', icon: Clock },
    { value: 'analytics', label: 'Analíticas', icon: BarChart3 },
  ];

  const canDraw = raffle.status === 'active' && 
                  raffle.tickets_sold > 0 && 
                  !raffle.winner_ticket_number &&
                  (role === 'owner' || role === 'admin');

  return (
    <DashboardLayout>
      <PageTransition>
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button 
              variant="ghost" 
              size="icon"
              className="flex-shrink-0 h-8 w-8"
              onClick={() => navigate('/dashboard/raffles')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-2xl font-bold truncate">{raffle.title}</h1>
              <p className="text-xs text-muted-foreground truncate">{raffle.prize_name}</p>
            </div>
            
            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              <ExportMenu raffleId={raffle.id} raffleName={raffle.title} />
              {canDraw && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => navigate(`/dashboard/raffles/${id}/draw`)}
                >
                  <Trophy className="h-4 w-4" />
                  Sortear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => navigate(`/dashboard/raffles/${id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>

            {/* Mobile/tablet actions dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/dashboard/raffles/${id}/edit`)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  {canDraw && (
                    <DropdownMenuItem onClick={() => navigate(`/dashboard/raffles/${id}/draw`)}>
                      <Trophy className="h-4 w-4 mr-2" />
                      Sortear
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tabs - grid on mobile, inline on desktop */}
        <Tabs defaultValue="overview" className="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
          <TabsList className="grid grid-cols-5 w-full h-auto gap-0.5 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 px-1 md:px-2.5 py-2 text-[10px] md:text-sm min-w-0 overflow-hidden"
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-full block">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab 
              raffle={raffle} 
              onEdit={() => navigate(`/dashboard/raffles/${id}/edit`)}
              onToggleStatus={handleToggleStatus}
              isTogglingStatus={toggleRaffleStatus.isPending}
            />
          </TabsContent>

          <TabsContent value="tickets">
            <TicketsTab 
              raffleId={raffle.id} 
              raffleTitle={raffle.title} 
              raffleSlug={raffle.slug}
              rafflePrizeName={raffle.prize_name}
              rafflePrizeImages={raffle.prize_images || []}
              raffleDrawDate={raffle.draw_date}
              raffleTicketPrice={raffle.ticket_price}
              raffleCurrencyCode={raffle.currency_code || 'MXN'}
              organizationName={raffle.organization?.name || ''}
              organizationLogo={raffle.organization?.logo_url}
            />
          </TabsContent>

          <TabsContent value="buyers">
            <BuyersTab 
              raffleId={raffle.id}
              raffleTitle={raffle.title}
              raffleSlug={raffle.slug}
              prizeName={raffle.prize_name}
              prizeImages={raffle.prize_images || []}
              drawDate={raffle.draw_date}
              ticketPrice={raffle.ticket_price}
              currencyCode={raffle.currency_code || 'MXN'}
              organizationName={raffle.organization?.name || ''}
              organizationLogo={raffle.organization?.logo_url}
            />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab 
              raffleId={raffle.id} 
              raffleTitle={raffle.title} 
              raffleSlug={raffle.slug}
              ticketPrice={raffle.ticket_price}
              currencyCode={raffle.currency_code || 'MXN'}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab raffle={raffle} />
          </TabsContent>
        </Tabs>
      </div>
      </PageTransition>
    </DashboardLayout>
  );
}
