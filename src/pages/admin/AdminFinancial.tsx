import { useState } from "react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDateRangePicker } from "@/components/admin/AdminDateRangePicker";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminFinancialStats } from "@/hooks/useAdminStats";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  XCircle,
  BarChart3,
  Crown,
  Sparkles,
  Gem,
} from "lucide-react";

export default function AdminFinancial() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: stats, isLoading } = useAdminFinancialStats(dateRange);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const tierData = [
    { 
      tier: "Basic", 
      revenue: stats?.revenueByTier.basic || 0, 
      icon: Sparkles, 
      color: "bg-slate-500",
      barColor: "bg-slate-500"
    },
    { 
      tier: "Pro", 
      revenue: stats?.revenueByTier.pro || 0, 
      icon: Crown, 
      color: "bg-blue-600",
      barColor: "bg-blue-600"
    },
    { 
      tier: "Premium", 
      revenue: stats?.revenueByTier.premium || 0, 
      icon: Gem, 
      color: "bg-purple-600",
      barColor: "bg-purple-600"
    },
  ];

  const totalRevenueByTier = tierData.reduce((sum, t) => sum + t.revenue, 0);

  return (
    <AdminLayout
      title="Financiero"
      description="Ingresos, suscripciones y métricas financieras"
    >
      {/* Date Range Picker */}
      <div className="flex justify-end mb-6">
        <AdminDateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Main Financial Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="MRR Estimado"
          value={formatCurrency(stats?.mrrEstimate || 0)}
          icon={DollarSign}
          description="Ingresos recurrentes mensuales"
          loading={isLoading}
          color="success"
        />
        <StatCard
          title="Ingreso Anualizado"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={TrendingUp}
          description="Proyección anual"
          loading={isLoading}
          color="blue"
        />
        <StatCard
          title="Suscripciones Activas"
          value={stats?.activeSubscriptions || 0}
          icon={CreditCard}
          loading={isLoading}
          color="primary"
        />
        <StatCard
          title="Tasa de Cancelación"
          value={`${stats?.churnRate || 0}%`}
          icon={XCircle}
          description="Churn rate"
          loading={isLoading}
          color="warning"
        />
      </div>

      {/* Revenue by Tier */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ingresos por Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tierData.map((tier) => {
              const percentage = totalRevenueByTier > 0 
                ? (tier.revenue / totalRevenueByTier) * 100 
                : 0;
              
              return (
                <div key={tier.tier} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${tier.color}`}>
                        <tier.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="font-medium">{tier.tier}</span>
                    </div>
                    {isLoading ? (
                      <Skeleton className="h-5 w-20" />
                    ) : (
                      <span className="text-sm font-semibold">
                        {formatCurrency(tier.revenue)}/mes
                      </span>
                    )}
                  </div>
                  <Progress 
                    value={isLoading ? 0 : percentage} 
                    className="h-2"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de Suscripciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="font-medium">Activas</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="text-2xl font-bold text-emerald-600">
                  {stats?.activeSubscriptions || 0}
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="font-medium">Canceladas</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="text-2xl font-bold text-red-500">
                  {stats?.canceledSubscriptions || 0}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-amber-500/5">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="font-medium">Conversiones Trial → Pago</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="text-2xl font-bold text-amber-600">
                  {stats?.trialConversions || 0}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
