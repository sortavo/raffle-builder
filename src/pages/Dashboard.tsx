import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDashboardCharts } from "@/hooks/useDashboardCharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RevenueChart, SalesChart } from "@/components/dashboard/DashboardCharts";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { subDays, format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Gift, 
  DollarSign, 
  Plus, 
  ArrowRight, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Target,
  ArrowUp,
  ChevronRight,
  Ticket,
  CreditCard,
  Calendar,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardSkeleton } from "@/components/ui/skeletons/DashboardSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, organization, isLoading: authLoading } = useAuth();
  const { 
    data: stats, 
    isLoading: statsLoading, 
    isError: statsError,
    refetch: refetchStats 
  } = useDashboardStats();
  
  // Date range state for charts
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  
  const { 
    data: chartData, 
    isLoading: chartsLoading,
    isError: chartsError,
    refetch: refetchCharts 
  } = useDashboardCharts(dateRange);

  const isMobile = useIsMobile();

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStats(), refetchCharts()]);
  }, [refetchStats, refetchCharts]);

  // Calculate period label for charts
  const getPeriodLabel = () => {
    const days = differenceInDays(dateRange.to, dateRange.from);
    if (days === 7) return "Últimos 7 días";
    if (days === 30) return "Últimos 30 días";
    if (days === 90) return "Últimos 90 días";
    return `${format(dateRange.from, "dd MMM", { locale: es })} - ${format(dateRange.to, "dd MMM", { locale: es })}`;
  };

  // Handle subscription success/cancel from Stripe checkout
  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    
    if (subscriptionStatus === "success") {
      toast.success("¡Suscripción exitosa!", {
        description: "Tu plan ha sido activado. Los cambios pueden tardar unos segundos en reflejarse.",
        icon: <CheckCircle className="h-5 w-5 text-success" />,
        duration: 5000,
      });
      
      // Refresh subscription status
      const refreshSubscription = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.functions.invoke("subscription-status");
          }
        } catch (error) {
          console.error("Error refreshing subscription:", error);
        }
      };
      refreshSubscription();
      
      // Clean up URL
      searchParams.delete("subscription");
      setSearchParams(searchParams, { replace: true });
    } else if (subscriptionStatus === "cancel") {
      toast.error("Suscripción cancelada", {
        description: "El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.",
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        duration: 5000,
      });
      
      // Clean up URL
      searchParams.delete("subscription");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Format currency
  const formatCurrency = (amount: number) => {
    const currency = organization?.currency_code || 'MXN';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Only show percentage changes when there's actual comparative data
  const hasRevenueData = (stats?.totalRevenue || 0) > 0;
  const hasTicketData = (stats?.ticketsSold || 0) > 0;

  const statCards: Array<{
    title: string;
    value: string;
    icon: typeof Ticket;
    gradient: string;
    bgGradient: string;
    change: string;
    changeType: 'increase' | 'decrease' | 'neutral';
    showChange: boolean;
  }> = [
    {
      title: "Sorteos Activos",
      value: stats?.activeRaffles?.toString() || "0",
      icon: Ticket,
      gradient: "from-primary to-primary/80",
      bgGradient: "from-primary/10 to-primary/5",
      change: "0%",
      changeType: "neutral",
      showChange: false
    },
    {
      title: "Ingresos Totales",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign,
      gradient: "from-secondary to-secondary/80",
      bgGradient: "from-secondary/10 to-secondary/5",
      change: "0%",
      changeType: "neutral",
      showChange: hasRevenueData
    },
    {
      title: "Boletos Vendidos",
      value: stats?.ticketsSold?.toString() || "0",
      icon: TrendingUp,
      gradient: "from-accent to-accent/80",
      bgGradient: "from-accent/10 to-accent/5",
      change: "0%",
      changeType: "neutral",
      showChange: hasTicketData
    },
    {
      title: "Conversión",
      value: `${stats?.conversionRate || 0}%`,
      icon: Target,
      gradient: "from-warning to-warning/80",
      bgGradient: "from-warning/10 to-warning/5",
      change: "0%",
      changeType: "neutral",
      showChange: hasTicketData
    }
  ];

  // Map activity types to icons and gradients
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket_sold':
        return { icon: Ticket, gradient: "from-primary to-primary/80" };
      case 'payment_approved':
        return { icon: CreditCard, gradient: "from-success to-success/80" };
      case 'raffle_created':
        return { icon: Calendar, gradient: "from-accent to-accent/80" };
      case 'ticket_reserved':
        return { icon: Clock, gradient: "from-warning to-warning/80" };
      default:
        return { icon: Ticket, gradient: "from-muted to-muted/80" };
    }
  };

  const renderDashboardContent = () => {
    if (statsLoading) {
      return <DashboardSkeleton />;
    }
    
    if (statsError) {
      return (
        <ErrorState 
          title="Error cargando estadísticas"
          message="No pudimos cargar tus datos. Esto puede ser un problema temporal."
          retry={() => {
            refetchStats();
            refetchCharts();
          }}
        />
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Premium Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent p-4 sm:p-6 lg:p-8">
          {/* Decorative elements - hidden on mobile */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl hidden sm:block"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-32 -translate-x-32 blur-3xl hidden sm:block"></div>
          
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-foreground">
                  ¡Bienvenido, {profile?.full_name?.split(" ")[0] || "Usuario"}! 👋
                </h1>
                <p className="text-primary-foreground/90 text-sm sm:text-base lg:text-lg">
                  {stats?.ticketsSold && stats.ticketsSold > 0 
                    ? `Has vendido ${stats.ticketsSold} boletos con ingresos de ${formatCurrency(stats.totalRevenue || 0)}`
                    : "Aquí está un resumen de tus sorteos y actividad reciente"
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  size="default"
                  className="bg-background text-primary hover:bg-background/90 shadow-xl w-full sm:w-auto"
                  onClick={() => navigate('/dashboard/raffles/new')}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Crear Sorteo
                </Button>
              </div>
            </div>
          </div>

          {/* Premium Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {statCards.map((stat, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="relative p-4 lg:p-6">
                  {/* Icon and Change */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md`}>
                      <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    </div>
                    
                    {/* Change indicator - only show when there's comparative data */}
                    {stat.showChange && (
                      <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        stat.changeType === 'increase' 
                          ? 'bg-success/10 text-success' 
                          : stat.changeType === 'decrease'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {stat.changeType !== 'neutral' && <ArrowUp className="w-3 h-3" />}
                        {stat.change}
                      </div>
                    )}
                  </div>

                  {/* Value */}
                  <div className="space-y-1">
                    <p className="text-xl lg:text-2xl font-bold tracking-tight text-foreground truncate">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium truncate">
                      {stat.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="space-y-4">
            {/* Date Range Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Análisis de Ventas</h2>
              <DateRangePicker 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            
            {chartsError ? (
              <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
                <ErrorState 
                  title="Error cargando gráficos"
                  message="Los gráficos no están disponibles temporalmente."
                  retry={() => refetchCharts()}
                  className="py-8"
                />
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <RevenueChart 
                  data={chartData?.dailyRevenue || []}
                  totalRevenue={chartData?.totalRevenue || 0}
                  revenueChange={chartData?.revenueChange || 0}
                  currency={organization?.currency_code || 'MXN'}
                  periodLabel={getPeriodLabel()}
                />
                <SalesChart 
                  data={chartData?.raffleSales || []}
                  totalTickets={chartData?.totalTicketsSold || 0}
                  ticketsChange={chartData?.ticketsChange || 0}
                />
              </div>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Raffles */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Sorteos Activos</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats?.activeRaffles && stats.activeRaffles > 0 
                      ? `${stats.activeRaffles} sorteo${stats.activeRaffles > 1 ? 's' : ''} en curso`
                      : "Tus sorteos en curso"
                    }
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary hover:text-primary/80 hover:bg-primary/10"
                  onClick={() => navigate('/dashboard/raffles')}
                >
                  Ver todo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              {stats?.activeRafflesList && stats.activeRafflesList.length > 0 ? (
                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                  {stats.activeRafflesList.map((raffle) => (
                    <div 
                      key={raffle.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl hover:from-primary/10 hover:to-accent/10 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/dashboard/raffles/${raffle.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
                          <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{raffle.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {raffle.ticketsSold.toLocaleString()} de {raffle.totalTickets.toLocaleString()} vendidos ({raffle.conversionRate}%)
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-semibold text-foreground">{formatCurrency(raffle.revenue)}</p>
                        {raffle.ticketsReserved > 0 && (
                          <p className="text-xs text-warning">{raffle.ticketsReserved} pendiente{raffle.ticketsReserved > 1 ? 's' : ''}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  {/* Premium Empty State */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-2xl opacity-20 scale-150"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl">
                      <Gift className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
                    No tienes sorteos activos
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md mb-8">
                    Crea tu primer sorteo y comienza a vender boletos hoy mismo
                  </p>
                  <Button 
                    size="lg"
                    onClick={() => navigate('/dashboard/raffles/new')}
                    className="shadow-lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Crear mi primer sorteo
                  </Button>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Actividad Reciente</h3>
                  <p className="text-sm text-muted-foreground">Últimas acciones en tu cuenta</p>
                </div>
                {stats?.pendingApprovals && stats.pendingApprovals > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 text-warning rounded-full text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {stats.pendingApprovals} pendiente{stats.pendingApprovals > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity, index) => {
                    const { icon: ActivityIcon, gradient } = getActivityIcon(activity.type);
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/40 transition-colors duration-150 cursor-pointer group"
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                          <ActivityIcon className="w-5 h-5 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.description}
                          </p>
                        </div>
                        
                        {/* Time */}
                        <div className="text-xs text-muted-foreground flex-shrink-0">
                          {activity.time}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Sin actividad reciente</p>
                    <p className="text-sm text-muted-foreground/70">Las ventas y reservas aparecerán aquí</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    );
  };

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} className="min-h-full">
          {renderDashboardContent()}
        </PullToRefresh>
      ) : (
        renderDashboardContent()
      )}
    </DashboardLayout>
  );
}
