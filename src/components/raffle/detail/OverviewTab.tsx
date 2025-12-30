import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Eye,
  UserPlus,
  CheckCircle,
  XCircle,
  Timer,
  FileSpreadsheet,
  FileText,
  Users,
  Trophy
} from 'lucide-react';
import { formatCurrency, getCurrency } from '@/lib/currency-utils';
import { parsePrizes } from '@/types/prize';
import { RaffleStatusBadge } from '../RaffleStatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { exportTicketsToCSV } from '@/utils/export-tickets';
import { exportBuyersToCSV } from '@/utils/export-buyers';
import { exportTransactionsToExcel } from '@/utils/export-transactions';
import { exportFinancialReportPDF } from '@/utils/export-financial-pdf';
import type { RaffleWithStats } from '@/hooks/useRaffles';

interface OverviewTabProps {
  raffle: RaffleWithStats;
  onEdit: () => void;
  onToggleStatus: () => void;
  isTogglingStatus: boolean;
}

export function OverviewTab({ raffle, onEdit, onToggleStatus, isTogglingStatus }: OverviewTabProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/r/${raffle.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: raffle.title,
          text: `¡Participa en ${raffle.title}! Premio: ${raffle.prize_name}`,
          url: url,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to clipboard
        if ((error as Error).name !== 'AbortError') {
          await copyToClipboard(url);
        }
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar el link');
    }
  };

  const handleExportTickets = async () => {
    setIsExporting(true);
    try {
      await exportTicketsToCSV(raffle.id, raffle.title);
      toast.success('Boletos exportados correctamente');
    } catch (error) {
      toast.error('Error al exportar boletos');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBuyers = async () => {
    setIsExporting(true);
    try {
      await exportBuyersToCSV(raffle.id, raffle.title);
      toast.success('Compradores exportados correctamente');
    } catch (error) {
      toast.error('Error al exportar compradores');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTransactions = async () => {
    setIsExporting(true);
    try {
      await exportTransactionsToExcel(raffle.id, raffle.title);
      toast.success('Transacciones exportadas correctamente');
    } catch (error) {
      toast.error('Error al exportar transacciones');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportFinancialPDF = async () => {
    setIsExporting(true);
    try {
      await exportFinancialReportPDF(raffle.id, raffle.title);
      toast.success('Reporte financiero exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar reporte financiero');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch activity feed
  const { data: activities } = useQuery({
    queryKey: ['activities', raffle.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('raffle_id', raffle.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

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
      color: 'text-accent',
    },
  ];

  const getActivityIcon = (eventType: string) => {
    switch (eventType) {
      case 'ticket_reserved':
        return <Timer className="h-4 w-4 text-amber-500" />;
      case 'ticket_sold':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ticket_released':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Ticket className="h-4 w-4 text-primary" />;
    }
  };

  const getActivityText = (activity: any) => {
    const metadata = activity.metadata as { buyer_name?: string; ticket_number?: string } | null;
    const buyerName = metadata?.buyer_name || 'Alguien';
    const ticketNumber = metadata?.ticket_number || '?';

    switch (activity.event_type) {
      case 'ticket_reserved':
        return (
          <span>
            <strong>{buyerName}</strong> reservó el boleto <Badge variant="outline">#{ticketNumber}</Badge>
          </span>
        );
      case 'ticket_sold':
        return (
          <span>
            <strong>{buyerName}</strong> compró el boleto <Badge variant="secondary">#{ticketNumber}</Badge>
          </span>
        );
      case 'ticket_released':
        return (
          <span>
            Boleto <Badge variant="outline">#{ticketNumber}</Badge> fue liberado
          </span>
        );
      default:
        return (
          <span>
            Actualización en boleto <Badge variant="outline">#{ticketNumber}</Badge>
          </span>
        );
    }
  };

  const prizes = parsePrizes(raffle.prizes, raffle.prize_name, raffle.prize_value);

  const getPrizeLabel = (index: number) => {
    if (index === 0) return { emoji: '🥇', label: 'Premio Principal' };
    if (index === 1) return { emoji: '🥈', label: '2do Premio' };
    if (index === 2) return { emoji: '🥉', label: '3er Premio' };
    return { emoji: '💎', label: `${index + 1}° Premio` };
  };

  const totalPrizesValue = prizes.reduce((sum, p) => {
    if (p.value && p.currency === (prizes[0]?.currency || raffle.currency_code)) {
      return sum + p.value;
    }
    return sum;
  }, 0);

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

      {/* Prizes Section */}
      {prizes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Premios del Sorteo
              {prizes.length > 1 && (
                <Badge variant="secondary" className="ml-2">
                  {prizes.length} premios
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prizes.map((prize, index) => {
              const { emoji, label } = getPrizeLabel(index);
              const currency = getCurrency(prize.currency || raffle.currency_code || 'MXN');
              
              return (
                <div 
                  key={prize.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index === 0 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`font-medium truncate ${index === 0 ? 'text-base' : 'text-sm'}`}>
                        {prize.name}
                      </p>
                    </div>
                  </div>
                  {prize.value && prize.value > 0 && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <span className={`font-semibold ${index === 0 ? 'text-base' : 'text-sm'}`}>
                        {formatCurrency(prize.value, prize.currency || raffle.currency_code || 'MXN')}
                      </span>
                      {currency && <span className="text-sm">{currency.flag}</span>}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Total value summary */}
            {prizes.length > 1 && totalPrizesValue > 0 && (
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <span className="text-sm text-muted-foreground">Valor total de premios</span>
                <span className="font-bold text-primary">
                  {formatCurrency(totalPrizesValue, prizes[0]?.currency || raffle.currency_code || 'MXN')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <Button onClick={onEdit} variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm">
          <Edit className="h-4 w-4 shrink-0" />
          <span className="truncate">Editar</span>
        </Button>
        <Button 
          onClick={onToggleStatus} 
          variant="outline" 
          size="sm"
          disabled={isTogglingStatus || raffle.status === 'draft' || raffle.status === 'completed'}
          className="gap-1.5 text-xs sm:text-sm"
        >
          {raffle.status === 'active' ? (
            <>
              <Pause className="h-4 w-4 shrink-0" />
              <span className="truncate">Pausar</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 shrink-0" />
              <span className="truncate">Reanudar</span>
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 text-xs sm:text-sm">
          <Share2 className="h-4 w-4 shrink-0" />
          <span className="truncate">Compartir</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting} className="gap-1.5 text-xs sm:text-sm">
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">{isExporting ? 'Exportando...' : 'Exportar'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleExportTickets}>
              <Ticket className="h-4 w-4 mr-2" />
              Boletos (Excel)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportBuyers}>
              <Users className="h-4 w-4 mr-2" />
              Compradores (Excel)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportTransactions}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Transacciones (Excel)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportFinancialPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Reporte Financiero (PDF)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs sm:text-sm col-span-2 sm:col-span-1">
          <a href={`/r/${raffle.slug}`} target="_blank" rel="noopener noreferrer">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="truncate">Ver Público</span>
          </a>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 shrink-0 ${kpi.color}`} />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold truncate">{kpi.value}</div>
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
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 pb-4 border-b last:border-0"
                  >
                    <div className="mt-1">
                      {getActivityIcon(activity.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        {getActivityText(activity)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at || ''), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay actividad reciente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
