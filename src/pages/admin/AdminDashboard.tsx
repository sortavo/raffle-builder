import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Ticket,
  TrendingUp,
  Crown,
  Sparkles,
  Gem,
} from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  color = "primary",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
  color?: "primary" | "success" | "warning" | "purple";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    purple: "bg-purple-500/10 text-purple-600",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

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

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: totalOrgs },
        { count: totalProfiles },
        { count: totalRaffles },
        { count: activeRaffles },
        { count: totalTicketsSold },
        { data: subscriptionData },
      ] = await Promise.all([
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("raffles").select("*", { count: "exact", head: true }),
        supabase
          .from("raffles")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "sold"),
        supabase.from("organizations").select("subscription_tier, subscription_status"),
      ]);

      const subscriptionStats = {
        basic: 0,
        pro: 0,
        premium: 0,
        trial: 0,
        active: 0,
      };

      subscriptionData?.forEach((org) => {
        if (org.subscription_tier) {
          subscriptionStats[org.subscription_tier as keyof typeof subscriptionStats]++;
        }
        if (org.subscription_status === "trial") {
          subscriptionStats.trial++;
        } else if (org.subscription_status === "active") {
          subscriptionStats.active++;
        }
      });

      return {
        totalOrgs: totalOrgs || 0,
        totalProfiles: totalProfiles || 0,
        totalRaffles: totalRaffles || 0,
        activeRaffles: activeRaffles || 0,
        totalTicketsSold: totalTicketsSold || 0,
        subscriptionStats,
      };
    },
  });

  return (
    <AdminLayout
      title="Dashboard"
      description="Vista general de la plataforma Sortavo"
    >
      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Organizaciones"
          value={stats?.totalOrgs || 0}
          icon={Building2}
          description="Organizaciones registradas"
          loading={isLoading}
          color="purple"
        />
        <StatCard
          title="Total Usuarios"
          value={stats?.totalProfiles || 0}
          icon={Users}
          description="Usuarios en la plataforma"
          loading={isLoading}
          color="primary"
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
          description="En toda la plataforma"
          loading={isLoading}
          color="warning"
        />
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
              color="bg-slate-500"
              loading={isLoading}
            />
            <SubscriptionCard
              tier="Pro"
              count={stats?.subscriptionStats.pro || 0}
              icon={Crown}
              color="bg-blue-600"
              loading={isLoading}
            />
            <SubscriptionCard
              tier="Premium"
              count={stats?.subscriptionStats.premium || 0}
              icon={Gem}
              color="bg-purple-600"
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
                <div className="h-3 w-3 rounded-full bg-amber-500" />
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
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
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
