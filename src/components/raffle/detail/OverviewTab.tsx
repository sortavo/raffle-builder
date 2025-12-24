import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Ticket, 
  Clock, 
  TrendingUp,
  Edit,
  Pause,
  Play,
  Share2,
  Download,
  Eye
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { RaffleStatusBadge } from '../RaffleStatusBadge';
import type { RaffleWithStats } from '@/hooks/useRaffles';

interface OverviewTabProps {
  raffle: RaffleWithStats;
  onEdit: () => void;
  onToggleStatus: () => void;
  isTogglingStatus: boolean;
}

export function OverviewTab({ raffle, onEdit, onToggleStatus, isTogglingStatus }: OverviewTabProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!raffle.draw_date) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const drawDate = new Date(raffle.draw_date!);
      const diff = drawDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Sorteo finalizado');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [raffle.draw_date]);

  const soldPercentage = raffle.total_tickets > 0 
    ? (raffle.tickets_sold / raffle.total_tickets) * 100 
    : 0;

  const kpis = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(raffle.total_revenue, raffle.currency_code || 'MXN'),
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'Boletos Vendidos',
      value: `${raffle.tickets_sold.toLocaleString()} / ${raffle.total_tickets.toLocaleString()}`,
      icon: Ticket,
      color: 'text-blue-500',
    },
    {
      title: 'Boletos Disponibles',
      value: raffle.tickets_available.toLocaleString(),
      icon: TrendingUp,
      color: 'text-orange-500',
    },
    {
      title: 'Tiempo Restante',
      value: timeRemaining || 'Sin fecha',
      icon: Clock,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-lg overflow-hidden bg-muted h-48">
        {raffle.prize_images && raffle.prize_images[0] ? (
          <img 
            src={raffle.prize_images[0]} 
            alt={raffle.prize_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Ticket className="h-16 w-16" />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <RaffleStatusBadge status={raffle.status || 'draft'} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onEdit} variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Button 
          onClick={onToggleStatus} 
          variant="outline" 
          size="sm"
          disabled={isTogglingStatus || raffle.status === 'draft' || raffle.status === 'completed'}
        >
          {raffle.status === 'active' ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Reanudar
            </>
          )}
        </Button>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Ver Público
        </Button>
      </div>

      {/* KPI Cards */}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progreso de Ventas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Vendidos</span>
            <span className="font-medium">{soldPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={soldPercentage} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{raffle.tickets_sold.toLocaleString()} vendidos</span>
            <span>{raffle.tickets_reserved} reservados</span>
            <span>{raffle.tickets_available.toLocaleString()} disponibles</span>
          </div>
        </CardContent>
      </Card>

      {/* Countdown Section */}
      {raffle.draw_date && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cuenta Regresiva</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-primary mb-2">
                {timeRemaining}
              </div>
              <p className="text-muted-foreground">
                Fecha del sorteo: {new Date(raffle.draw_date).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay actividad reciente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
