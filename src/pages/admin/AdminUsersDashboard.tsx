import { useState } from "react";
import { subDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDateRangePicker } from "@/components/admin/AdminDateRangePicker";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminUserStats } from "@/hooks/useAdminStats";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Sparkles,
  Gem,
  Building2,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  owner: "Propietarios",
  admin: "Administradores",
  member: "Miembros",
};

const roleColors: Record<string, string> = {
  owner: "bg-purple-600",
  admin: "bg-blue-600",
  member: "bg-slate-500",
};

const roleIcons: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

export default function AdminUsersDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: stats, isLoading } = useAdminUserStats(dateRange);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const totalByRole = Object.values(stats?.usersByRole || {}).reduce((sum, count) => sum + count, 0);
  const totalByPlan = Object.values(stats?.usersByPlan || {}).reduce((sum, count) => sum + count, 0);

  return (
    <AdminLayout
      title="Dashboard de Usuarios"
      description="Métricas y análisis de usuarios"
    >
      {/* Date Range Picker */}
      <div className="flex justify-end mb-6">
        <AdminDateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Usuarios"
          value={stats?.totalUsers || 0}
          icon={Users}
          loading={isLoading}
          color="primary"
        />
        <StatCard
          title="Nuevos en Período"
          value={stats?.newUsersInPeriod || 0}
          icon={UserPlus}
          loading={isLoading}
          color="success"
        />
        <StatCard
          title="Propietarios"
          value={stats?.usersByRole.owner || 0}
          icon={Crown}
          loading={isLoading}
          color="purple"
        />
        <StatCard
          title="Administradores"
          value={stats?.usersByRole.admin || 0}
          icon={Shield}
          loading={isLoading}
          color="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Rol</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats?.usersByRole || {}).map(([role, count]) => {
              const Icon = roleIcons[role] || User;
              const percentage = totalByRole > 0 ? (count / totalByRole) * 100 : 0;
              
              return (
                <div key={role} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${roleColors[role]}`}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="font-medium">{roleLabels[role]}</span>
                    </div>
                    {isLoading ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      <span className="text-sm font-semibold">{count}</span>
                    )}
                  </div>
                  <Progress value={isLoading ? 0 : percentage} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Users by Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "trial", label: "Trial", icon: Sparkles, color: "bg-amber-500" },
              { key: "basic", label: "Basic", icon: Sparkles, color: "bg-slate-500" },
              { key: "pro", label: "Pro", icon: Crown, color: "bg-blue-600" },
              { key: "premium", label: "Premium", icon: Gem, color: "bg-purple-600" },
            ].map(({ key, label, icon: Icon, color }) => {
              const count = stats?.usersByPlan[key as keyof typeof stats.usersByPlan] || 0;
              const percentage = totalByPlan > 0 ? (count / totalByPlan) * 100 : 0;
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${color}`}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="font-medium">{label}</span>
                    </div>
                    {isLoading ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      <span className="text-sm font-semibold">{count}</span>
                    )}
                  </div>
                  <Progress value={isLoading ? 0 : percentage} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-500" />
              Registros Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-2">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentRegistrations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay registros en el período
                </p>
              ) : (
                <div className="space-y-3">
                  {stats?.recentRegistrations.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || "Sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                        {user.organization_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{user.organization_name}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {format(new Date(user.created_at), "d MMM", { locale: es })}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
