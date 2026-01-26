import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDashboardCharts } from "@/hooks/useDashboardCharts";
import { TrendingUp, TrendingDown, DollarSign, Ticket, Users, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { subDays } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface DateRange {
  from: Date;
  to: Date;
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: chartData, isLoading: chartsLoading } = useDashboardCharts(dateRange);

  const isLoading = statsLoading || chartsLoading;

  const statCards = [
    {
      title: "Ingresos Totales",
      value: chartData?.totalRevenue ? `$${chartData.totalRevenue.toLocaleString()}` : "$0",
      change: chartData?.revenueChange || 0,
      icon: DollarSign,
      description: "vs. período anterior",
    },
    {
      title: "Boletos Vendidos",
      value: chartData?.totalTicketsSold?.toLocaleString() || "0",
      change: chartData?.ticketsChange || 0,
      icon: Ticket,
      description: "vs. período anterior",
    },
    {
      title: "Sorteos Activos",
      value: stats?.activeRaffles?.toLocaleString() || "0",
      change: 0,
      icon: Users,
      description: "sorteos activos",
    },
    {
      title: "Tasa de Conversión",
      value: `${stats?.conversionRate || 0}%`,
      change: 0,
      icon: Eye,
      description: "boletos vendidos/total",
    },
  ];

  return (
    <DashboardLayout breadcrumbs={[{ label: "Analíticas" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analíticas</h1>
            <p className="text-muted-foreground">
              Visualiza el rendimiento de tus sorteos
            </p>
          </div>
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="flex items-center gap-1 text-xs">
                      {stat.change > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-green-500">+{stat.change}%</span>
                        </>
                      ) : stat.change < 0 ? (
                        <>
                          <TrendingDown className="h-3 w-3 text-red-500" />
                          <span className="text-red-500">{stat.change}%</span>
                        </>
                      ) : null}
                      <span className="text-muted-foreground">{stat.description}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Día</CardTitle>
                  <CardDescription>Ingresos generados en el período seleccionado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData?.dailyRevenue || []}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="text-sm font-medium">{payload[0].payload.date}</div>
                                  <div className="text-sm text-primary">${payload[0].value?.toLocaleString()}</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Raffle Sales Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Sorteo</CardTitle>
                  <CardDescription>Boletos vendidos por sorteo activo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {chartData?.raffleSales?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.raffleSales} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" />
                          <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="text-sm font-medium">{data.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Vendidos: {data.sold} / {data.total}
                                    </div>
                                    <div className="text-sm text-primary">${data.revenue.toLocaleString()}</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="sold" radius={[0, 4, 4, 0]}>
                            {chartData.raffleSales.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No hay datos de sorteos
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Insights */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Promedio por Compra</CardTitle>
                  <CardDescription>
                    Ingreso promedio por transacción
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    $
                    {chartData?.totalRevenue && chartData?.totalTicketsSold
                      ? (chartData.totalRevenue / chartData.totalTicketsSold).toFixed(2)
                      : "0"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Basado en {chartData?.totalTicketsSold?.toLocaleString() || 0} boletos vendidos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Aprobaciones Pendientes</CardTitle>
                  <CardDescription>
                    Boletos esperando aprobación de pago
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {stats?.pendingApprovals || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Requieren revisión manual
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
