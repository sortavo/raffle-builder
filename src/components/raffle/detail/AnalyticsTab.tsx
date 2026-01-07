import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  BarChart3,
  Activity,
  Lock,
  Check,
  Crown,
  MapPin,
  Clock,
  Target
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { formatCurrency } from '@/lib/currency-utils';
import { useAuth } from '@/hooks/useAuth';
import { getSubscriptionLimits, SubscriptionTier } from '@/lib/subscription-limits';
import { supabase } from '@/integrations/supabase/client';
import { 
  aggregateByDate, 
  aggregateByHour, 
  aggregateByCity,
  fillDateGaps,
  getTimeRangeDates,
  calculateSalesVelocity
} from '@/utils/analytics-helpers';
import { ExportMenu } from './ExportMenu';
import type { RaffleWithStats } from '@/hooks/useRaffles';

interface AnalyticsTabProps {
  raffle: RaffleWithStats;
}

type TimeRange = 'week' | 'month' | 'all';

export function AnalyticsTab({ raffle }: AnalyticsTabProps) {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const limits = getSubscriptionLimits(organization?.subscription_tier as SubscriptionTier);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Fetch sold tickets for analytics
  const { data: soldTickets = [], isLoading } = useQuery({
    queryKey: ['analytics-tickets', raffle.id, timeRange],
    queryFn: async () => {
      const { start } = getTimeRangeDates(timeRange);
      
      let query = supabase
        .from('sold_tickets')
        .select('*')
        .eq('raffle_id', raffle.id)
        .eq('status', 'sold')
        .order('sold_at', { ascending: true });
      
      if (timeRange !== 'all') {
        query = query.gte('sold_at', start.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Calculate unique buyers
  const uniqueBuyers = useMemo(() => {
    const emails = new Set(soldTickets.map(t => t.buyer_email).filter(Boolean));
    return emails.size;
  }, [soldTickets]);

  // Calculate KPIs
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
      color: 'text-green-500'
    },
    {
      title: 'Precio Promedio',
      value: formatCurrency(avgTicketPrice, raffle.currency_code || 'MXN'),
      icon: TrendingUp,
      description: 'Por boleto vendido',
      color: 'text-blue-500'
    },
    {
      title: 'Tasa de Conversión',
      value: `${conversionRate}%`,
      icon: Activity,
      description: 'Boletos vendidos vs total',
      color: 'text-purple-500'
    },
    {
      title: 'Compradores Únicos',
      value: uniqueBuyers.toString(),
      icon: Users,
      description: 'Emails únicos',
      color: 'text-orange-500'
    },
  ];

  // Chart data
  const salesByDate = useMemo(() => {
    const raw = aggregateByDate(soldTickets);
    if (raw.length === 0) return [];
    
    const startDate = new Date(raw[0].date);
    const endDate = new Date();
    
    // Calculate cumulative revenue
    let cumulativeRevenue = 0;
    const filled = fillDateGaps(raw, startDate, endDate);
    
    return filled.map(d => {
      cumulativeRevenue += d.tickets * raffle.ticket_price;
      return {
        ...d,
        revenue: cumulativeRevenue,
        displayDate: new Date(d.date).toLocaleDateString('es-MX', { 
          month: 'short', 
          day: 'numeric' 
        })
      };
    });
  }, [soldTickets, raffle.ticket_price]);

  const salesByHour = useMemo(() => {
    return aggregateByHour(soldTickets);
  }, [soldTickets]);

  const salesByCity = useMemo(() => {
    return aggregateByCity(soldTickets);
  }, [soldTickets]);

  const salesVelocity = useMemo(() => {
    const startDate = raffle.start_date ? new Date(raffle.start_date) : new Date(raffle.created_at!);
    return calculateSalesVelocity(soldTickets, startDate);
  }, [soldTickets, raffle.start_date, raffle.created_at]);

  // Find peak hour
  const peakHour = useMemo(() => {
    if (salesByHour.length === 0) return null;
    return salesByHour.reduce((max, h) => h.count > max.count ? h : max, salesByHour[0]);
  }, [salesByHour]);

  // Colors for charts
  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

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
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
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
                  <span>Análisis geográfico</span>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-semibold">Analíticas del Sorteo</h2>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Últimos 7 días</SelectItem>
              <SelectItem value="month">Últimos 30 días</SelectItem>
              <SelectItem value="all">Todo el tiempo</SelectItem>
            </SelectContent>
          </Select>
          <ExportMenu raffleId={raffle.id} raffleName={raffle.title} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{kpi.value}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Sales Over Time */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Ventas por Día
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-pulse">Cargando...</div>
              </div>
            ) : salesByDate.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No hay datos de ventas aún</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={264}>
                <LineChart data={salesByDate}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'tickets' ? value : `$${value.toLocaleString()}`,
                      name === 'tickets' ? 'Boletos' : 'Ingresos'
                    ]}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="tickets" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Boletos"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={false}
                    name="Ingresos"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sales by Hour */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ventas por Hora
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-pulse">Cargando...</div>
              </div>
            ) : soldTickets.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No hay datos de ventas aún</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={264}>
                <BarChart data={salesByHour}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value, 'Ventas']}
                    labelFormatter={(label) => `Hora: ${label}`}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {salesByHour.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={peakHour && entry.hour === peakHour.hour 
                          ? 'hsl(var(--primary))' 
                          : 'hsl(var(--muted-foreground) / 0.3)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geographic & Performance Section */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Sales by City */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ventas por Ciudad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {salesByCity.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No hay datos geográficos</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={264}>
                <BarChart data={salesByCity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="city" 
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, _, item) => [
                      `${value} (${item.payload.percentage.toFixed(1)}%)`,
                      'Boletos'
                    ]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Métricas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-4 sm:space-y-6">
            {/* Sales Velocity */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Velocidad de Ventas</span>
                <span className="text-lg font-bold">
                  {salesVelocity.dailyAverage.toFixed(1)} boletos/día
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ 
                    width: `${Math.min(100, (raffle.tickets_sold / raffle.total_tickets) * 100)}%` 
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {raffle.tickets_sold} de {raffle.total_tickets} boletos vendidos
              </p>
            </div>

            {/* Peak Hour */}
            {peakHour && peakHour.count > 0 && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Hora Pico</span>
                  <span className="text-lg font-bold">{peakHour.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {peakHour.count} ventas en esta hora
                </p>
              </div>
            )}

            {/* Top City */}
            {salesByCity.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Ciudad Principal</span>
                  <span className="text-lg font-bold">{salesByCity[0].city}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {salesByCity[0].count} boletos ({salesByCity[0].percentage.toFixed(1)}% del total)
                </p>
              </div>
            )}

            {/* Projected Revenue */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Ingresos Proyectados</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(raffle.total_tickets * raffle.ticket_price, raffle.currency_code || 'MXN')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Si se venden todos los boletos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
