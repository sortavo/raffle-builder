import { useState } from "react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDateRangePicker } from "@/components/admin/AdminDateRangePicker";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOverviewStats } from "@/hooks/useAdminStats";
import {
  Building2,
  Users,
  Ticket,
  TrendingUp,
  Crown,
  Sparkles,
  Gem,
  Calendar,
} from "lucide-react";

function SubscriptionCard({
  tier,
  count,
  icon: Icon,
  color,
  loading,
}: {
  tier: string;
  count: number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="font-medium capitalize">{tier}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <span className="text-lg font-bold">{count}</span>
      )}
    </div>
  );
}

export default function AdminOverview() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: stats, isLoading } = useAdminOverviewStats(dateRange);

  return (
    <AdminLayout
      title="Vista General"
      description="KPIs principales de la plataforma"
    >
      {/* Date Range Picker */}
      <div className="flex justify-end mb-6">
        <AdminDateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Organizaciones"
          value={stats?.totalOrgs || 0}
          icon={Building2}
          loading={isLoading}
          color="purple"
          trend={stats ? { value: stats.newOrgsInPeriod, label: "nuevas en período" } : undefined}
        />
        <StatCard
          title="Total Usuarios"
          value={stats?.totalUsers || 0}
          icon={Users}
          loading={isLoading}
          color="primary"
          trend={stats ? { value: stats.newUsersInPeriod, label: "nuevos en período" } : undefined}
        />
        <StatCard
          title="Sorteos Activos"
          value={stats?.activeRaffles || 0}
          icon={TrendingUp}
          description={`De ${stats?.totalRaffles || 0} totales`}
          loading={isLoading}
          color="success"
        />
        <StatCard
          title="Boletos Vendidos"
          value={stats?.totalTicketsSold?.toLocaleString() || 0}
          icon={Ticket}
          loading={isLoading}
          color="warning"
          trend={stats ? { value: stats.ticketsSoldInPeriod, label: "en período" } : undefined}
        />
      </div>

      {/* Period Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Nuevas Orgs</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.newOrgsInPeriod || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Nuevos Usuarios</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.newUsersInPeriod || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Nuevos Sorteos</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.newRafflesInPeriod || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Boletos Vendidos</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.ticketsSoldInPeriod?.toLocaleString() || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Plan de Suscripción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SubscriptionCard
              tier="Basic"
              count={stats?.subscriptionStats.basic || 0}
              icon={Sparkles}
              color="bg-muted-foreground"
              loading={isLoading}
            />
            <SubscriptionCard
              tier="Pro"
              count={stats?.subscriptionStats.pro || 0}
              icon={Crown}
              color="bg-primary"
              loading={isLoading}
            />
            <SubscriptionCard
              tier="Premium"
              count={stats?.subscriptionStats.premium || 0}
              icon={Gem}
              color="bg-accent"
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Estado de Suscripción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span className="font-medium">En Prueba (Trial)</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <span className="text-lg font-bold">
                  {stats?.subscriptionStats.trial || 0}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="font-medium">Suscripción Activa</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <span className="text-lg font-bold">
                  {stats?.subscriptionStats.active || 0}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
