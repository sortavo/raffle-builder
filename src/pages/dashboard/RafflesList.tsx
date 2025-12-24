import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Pause,
  Play,
  Trash2,
  Gift,
  Calendar,
  Ticket,
  DollarSign
} from 'lucide-react';
import { useRaffles, type RaffleFilters } from '@/hooks/useRaffles';
import { RaffleStatusBadge } from '@/components/raffle/RaffleStatusBadge';
import { formatCurrency } from '@/lib/currency-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RafflesList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RaffleFilters>({ status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { 
    useRafflesList, 
    toggleRaffleStatus, 
    deleteRaffle, 
    duplicateRaffle 
  } = useRaffles();
  
  const { data: raffles = [], isLoading } = useRafflesList({
    ...filters,
    search: searchQuery || undefined,
  });

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteRaffle.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const statusTabs = [
    { value: 'all', label: 'Todos' },
    { value: 'draft', label: 'Borrador' },
    { value: 'active', label: 'Activo' },
    { value: 'paused', label: 'Pausado' },
    { value: 'completed', label: 'Completado' },
    { value: 'canceled', label: 'Cancelado' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sorteos</h1>
            <p className="text-muted-foreground">
              Gestiona todos tus sorteos y rifas
            </p>
          </div>
          <Button onClick={() => navigate('/dashboard/raffles/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Sorteo
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <Tabs value={filters.status || 'all'} onValueChange={handleStatusFilter}>
            <TabsList className="flex-wrap h-auto">
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Raffles List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : raffles.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hay sorteos</h3>
              <p className="text-muted-foreground mb-6">
                Crea tu primer sorteo para empezar a vender boletos
              </p>
              <Button onClick={() => navigate('/dashboard/raffles/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Sorteo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {raffles.map((raffle) => (
              <Card key={raffle.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="hidden sm:block w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {raffle.prize_images && raffle.prize_images[0] ? (
                        <img 
                          src={raffle.prize_images[0]} 
                          alt={raffle.prize_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gift className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link 
                            to={`/dashboard/raffles/${raffle.id}`}
                            className="font-semibold hover:text-primary transition-colors line-clamp-1"
                          >
                            {raffle.title}
                          </Link>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {raffle.prize_name}
                          </p>
                        </div>
                        <RaffleStatusBadge status={raffle.status || 'draft'} />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {raffle.draw_date 
                            ? format(new Date(raffle.draw_date), 'dd MMM yyyy', { locale: es })
                            : 'Sin fecha'
                          }
                        </div>
                        <div className="flex items-center gap-1">
                          <Ticket className="h-4 w-4" />
                          {raffle.total_tickets.toLocaleString()} boletos
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(raffle.ticket_price, raffle.currency_code || 'MXN')}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/raffles/${raffle.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/raffles/${raffle.id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateRaffle.mutate(raffle.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        {(raffle.status === 'active' || raffle.status === 'paused') && (
                          <DropdownMenuItem 
                            onClick={() => toggleRaffleStatus.mutate({ 
                              id: raffle.id, 
                              currentStatus: raffle.status! 
                            })}
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
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmId(raffle.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sorteo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los boletos y datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
