import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDashboardCharts } from "@/hooks/useDashboardCharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RevenueChart, SalesChart } from "@/components/dashboard/DashboardCharts";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, organization, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: chartData, isLoading: chartsLoading } = useDashboardCharts();

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

  const statCards = [
    {
      title: "Sorteos Activos",
      value: stats?.activeRaffles?.toString() || "0",
      icon: Ticket,
      gradient: "from-violet-500 to-purple-600",
      bgGradient: "from-violet-50 to-purple-50",
      change: "+12%",
      changeType: "increase" as const
    },
    {
      title: "Ingresos Totales",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign,
      gradient: "from-emerald-500 to-green-600",
      bgGradient: "from-emerald-50 to-green-50",
      change: "+23%",
      changeType: "increase" as const
    },
    {
      title: "Boletos Vendidos",
      value: stats?.ticketsSold?.toString() || "0",
      icon: TrendingUp,
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-50 to-cyan-50",
      change: "+8%",
      changeType: "increase" as const
    },
    {
      title: "Conversión",
      value: `${stats?.conversionRate || 0}%`,
      icon: Target,
      gradient: "from-orange-500 to-amber-600",
      bgGradient: "from-orange-50 to-amber-50",
      change: "+5%",
      changeType: "increase" as const
    }
  ];

  // Map activity types to icons and gradients
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket_sold':
        return { icon: Ticket, gradient: "from-violet-500 to-purple-600" };
      case 'payment_approved':
        return { icon: CreditCard, gradient: "from-emerald-500 to-green-600" };
      case 'raffle_created':
        return { icon: Calendar, gradient: "from-blue-500 to-cyan-600" };
      case 'ticket_reserved':
        return { icon: Clock, gradient: "from-orange-500 to-amber-600" };
      default:
        return { icon: Ticket, gradient: "from-gray-500 to-gray-600" };
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      {statsLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Premium Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-8">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-32 -translate-x-32 blur-3xl"></div>
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">
                  ¡Bienvenido de vuelta, {profile?.full_name?.split(" ")[0] || "Usuario"}! 👋
                </h1>
                <p className="text-white/90 text-lg">
                  {stats?.ticketsSold && stats.ticketsSold > 0 
                    ? `Has vendido ${stats.ticketsSold} boletos con ingresos de ${formatCurrency(stats.totalRevenue || 0)}`
                    : "Aquí está un resumen de tus sorteos y actividad reciente"
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  size="lg"
                  className="bg-white text-violet-600 hover:bg-white/90 shadow-xl"
                  onClick={() => navigate('/dashboard/raffles/new')}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Crear Sorteo
                </Button>
              </div>
            </div>
          </div>

          {/* Premium Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                <div className="relative p-6">
                  {/* Icon and Change */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Change indicator */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      stat.changeType === 'increase' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <ArrowUp className="w-3 h-3" />
                      {stat.change}
                    </div>
                  </div>

                  {/* Value */}
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-violet-600 group-hover:to-indigo-600 transition-all duration-300">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">
                      {stat.title}
                    </p>
                  </div>

                  {/* Subtle animation line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart 
              data={chartData?.dailyRevenue || []}
              totalRevenue={chartData?.totalRevenue || 0}
              revenueChange={chartData?.revenueChange || 0}
              currency={organization?.currency_code || 'MXN'}
            />
            <SalesChart 
              data={chartData?.raffleSales || []}
              totalTickets={chartData?.totalTicketsSold || 0}
              ticketsChange={chartData?.ticketsChange || 0}
            />
          </div>

          {/* Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Raffles */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sorteos Activos</h3>
                  <p className="text-sm text-gray-500">
                    {stats?.activeRaffles && stats.activeRaffles > 0 
                      ? `${stats.activeRaffles} sorteo${stats.activeRaffles > 1 ? 's' : ''} en curso`
                      : "Tus sorteos en curso"
                    }
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                  onClick={() => navigate('/dashboard/raffles')}
                >
                  Ver todo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              {stats?.activeRaffles && stats.activeRaffles > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{stats.activeRaffles} sorteo{stats.activeRaffles > 1 ? 's' : ''} activo{stats.activeRaffles > 1 ? 's' : ''}</p>
                        <p className="text-sm text-gray-500">{stats.ticketsSold} de {stats.totalTickets} boletos vendidos</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/dashboard/raffles')}
                    >
                      Gestionar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  {/* Premium Empty State */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-indigo-400 rounded-full blur-2xl opacity-20 scale-150"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl">
                      <Gift className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                    No tienes sorteos activos
                  </h3>
                  <p className="text-gray-500 text-center max-w-md mb-8">
                    Crea tu primer sorteo y comienza a vender boletos hoy mismo
                  </p>
                  <Button 
                    size="lg"
                    onClick={() => navigate('/dashboard/raffles/new')}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-xl shadow-violet-500/30"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Crear mi primer sorteo
                  </Button>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
                  <p className="text-sm text-gray-500">Últimas acciones en tu cuenta</p>
                </div>
                {stats?.pendingApprovals && stats.pendingApprovals > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
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
                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                          <ActivityIcon className="w-5 h-5 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.description}
                          </p>
                        </div>
                        
                        {/* Time */}
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {activity.time}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">Sin actividad reciente</p>
                    <p className="text-sm text-gray-400">Las ventas y reservas aparecerán aquí</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Banner */}
          {organization?.subscription_status === "trial" && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
              
              <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Estás en el plan de prueba
                    </h3>
                    <p className="text-sm text-gray-600">
                      Actualiza a un plan de pago para desbloquear todas las funcionalidades
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/pricing")}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg"
                >
                  Ver planes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
