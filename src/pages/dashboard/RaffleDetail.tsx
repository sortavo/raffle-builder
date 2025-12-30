import { useParams, useNavigate } from 'react-router-dom';
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
  Pencil
} from 'lucide-react';
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

  return (
    <DashboardLayout>
      <PageTransition>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              size="icon"
              className="flex-shrink-0"
              onClick={() => navigate('/dashboard/raffles')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{raffle.title}</h1>
              <p className="text-sm text-muted-foreground truncate">{raffle.prize_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportMenu raffleId={raffle.id} raffleName={raffle.title} />
            {raffle.status === 'active' && 
             raffle.tickets_sold > 0 && 
             !raffle.winner_ticket_number &&
             (role === 'owner' || role === 'admin') && (
              <Button 
                size="sm"
                className="sm:hidden"
                onClick={() => navigate(`/dashboard/raffles/${id}/draw`)}
              >
                <Trophy className="h-4 w-4" />
              </Button>
            )}
            {raffle.status === 'active' && 
             raffle.tickets_sold > 0 && 
             !raffle.winner_ticket_number &&
             (role === 'owner' || role === 'admin') && (
              <Button 
                className="hidden sm:flex"
                onClick={() => navigate(`/dashboard/raffles/${id}/draw`)}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Realizar Sorteo
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              className="sm:hidden"
              onClick={() => navigate(`/dashboard/raffles/${id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="hidden sm:flex"
              onClick={() => navigate(`/dashboard/raffles/${id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-auto">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 sm:gap-2 px-2.5 sm:px-3">
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden xs:inline sm:inline text-xs sm:text-sm">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

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
