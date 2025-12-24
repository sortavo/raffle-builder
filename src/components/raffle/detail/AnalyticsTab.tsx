import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  BarChart3,
  PieChart,
  Activity,
  Lock,
  Check,
  Crown
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { useAuth } from '@/hooks/useAuth';
import { getSubscriptionLimits, SubscriptionTier } from '@/lib/subscription-limits';
import type { RaffleWithStats } from '@/hooks/useRaffles';

interface AnalyticsTabProps {
  raffle: RaffleWithStats;
}

export function AnalyticsTab({ raffle }: AnalyticsTabProps) {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const limits = getSubscriptionLimits(organization?.subscription_tier as SubscriptionTier);

  const conversionRate = raffle.total_tickets > 0 
    ? ((raffle.tickets_sold / raffle.total_tickets) * 100).toFixed(1)
    : '0';

  const avgTicketPrice = raffle.tickets_sold > 0 
    ? raffle.total_revenue / raffle.tickets_sold 
    : raffle.ticket_price;

  const kpis = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(raffle.total_revenue, raffle.currency_code || 'MXN'),
      icon: DollarSign,
      description: 'Ventas confirmadas',
    },
    {
      title: 'Precio Promedio',
      value: formatCurrency(avgTicketPrice, raffle.currency_code || 'MXN'),
      icon: TrendingUp,
      description: 'Por boleto vendido',
    },
    {
      title: 'Tasa de Conversión',
      value: `${conversionRate}%`,
      icon: Activity,
      description: 'Boletos vendidos vs total',
    },
    {
      title: 'Compradores Únicos',
      value: '-',
      icon: Users,
      description: 'Próximamente',
    },
  ];

  // Show upgrade prompt for basic tier
  if (!limits.hasAdvancedAnalytics) {
    return (
      <div className="space-y-6">
        {/* Basic KPIs still available */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upgrade Prompt */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center max-w-md mx-auto">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Crown className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Analytics Avanzado</h3>
              <p className="text-muted-foreground mb-6">
                Obtén insights detallados sobre tus sorteos con gráficos avanzados, 
                reportes personalizados y proyecciones de ventas.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Gráficos interactivos de ventas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Análisis demográfico de compradores</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Proyecciones y tendencias</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Exportación de reportes</span>
                </div>
              </div>
              <Button onClick={() => navigate('/pricing')}>
                <Lock className="h-4 w-4 mr-2" />
                Actualizar a Plan Pro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ventas por Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Gráfico de ventas próximamente</p>
                <p className="text-sm">Disponible en Phase 7</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribución de Boletos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PieChart className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Gráfico de distribución próximamente</p>
                <p className="text-sm">Disponible en Phase 7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas Avanzadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <div className="text-sm text-muted-foreground">Visitas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <div className="text-sm text-muted-foreground">Tasa de Rebote</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <div className="text-sm text-muted-foreground">Tiempo Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <div className="text-sm text-muted-foreground">Compartidos</div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Métricas avanzadas disponibles próximamente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
