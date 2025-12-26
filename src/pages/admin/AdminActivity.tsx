import { useState } from "react";
import { subDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDateRangePicker } from "@/components/admin/AdminDateRangePicker";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminActivityStats } from "@/hooks/useAdminStats";
import {
  Ticket,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Trophy,
} from "lucide-react";

const eventTypeLabels: Record<string, string> = {
  ticket_reserved: "Boleto reservado",
  ticket_sold: "Boleto vendido",
  ticket_released: "Boleto liberado",
  ticket_canceled: "Boleto cancelado",
  raffle_view: "Vista de sorteo",
  page_view: "Vista de página",
};

const eventTypeColors: Record<string, string> = {
  ticket_sold: "bg-emerald-500",
  ticket_reserved: "bg-amber-500",
  ticket_released: "bg-slate-500",
  ticket_canceled: "bg-red-500",
  raffle_view: "bg-blue-500",
  page_view: "bg-purple-500",
};

export default function AdminActivity() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: stats, isLoading } = useAdminActivityStats(dateRange);

  return (
    <AdminLayout
      title="Actividad"
      description="Sorteos activos, tickets y eventos recientes"
    >
      {/* Date Range Picker */}
      <div className="flex justify-end mb-6">
        <AdminDateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Main Activity Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatCard
          title="Sorteos Activos"
          value={stats?.activeRaffles || 0}
          icon={TrendingUp}
          loading={isLoading}
          color="success"
        />
        <StatCard
          title="Sorteos Completados"
          value={stats?.completedRaffles || 0}
          icon={CheckCircle}
          loading={isLoading}
          color="purple"
        />
        <StatCard
          title="Boletos Vendidos"
          value={stats?.ticketsSold?.toLocaleString() || 0}
          icon={Ticket}
          description="En el período"
          loading={isLoading}
          color="primary"
        />
        <StatCard
          title="Boletos Reservados"
          value={stats?.ticketsReserved || 0}
          icon={Clock}
          loading={isLoading}
          color="warning"
        />
        <StatCard
          title="Pendientes Aprobación"
          value={stats?.pendingApprovals || 0}
          icon={AlertCircle}
          loading={isLoading}
          color="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Raffles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Sorteos con Más Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : stats?.topRaffles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay sorteos activos
              </p>
            ) : (
              stats?.topRaffles.map((raffle, index) => {
                const percentage = raffle.total_tickets > 0 
                  ? (raffle.tickets_sold / raffle.total_tickets) * 100 
                  : 0;
                
                return (
                  <div key={raffle.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold text-muted-foreground w-5">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{raffle.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {raffle.organization_name}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {raffle.tickets_sold}/{raffle.total_tickets}
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Eventos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : stats?.recentEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay eventos en el período
                </p>
              ) : (
                <div className="space-y-3">
                  {stats?.recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                          eventTypeColors[event.type] || "bg-slate-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {eventTypeLabels[event.type] || event.type}
                        </p>
                        {event.metadata?.ticket_number && (
                          <p className="text-xs text-muted-foreground">
                            Boleto #{event.metadata.ticket_number}
                            {event.metadata.buyer_name && ` - ${event.metadata.buyer_name}`}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), "d MMM, HH:mm", { locale: es })}
                        </p>
                      </div>
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
