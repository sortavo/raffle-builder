import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  DollarSign,
  X
} from 'lucide-react';
import { useRaffles, type RaffleFilters as RaffleFiltersType } from '@/hooks/useRaffles';
import { useAuth } from '@/hooks/useAuth';
import { RaffleStatusBadge } from '@/components/raffle/RaffleStatusBadge';
import { RaffleFilters, type FilterState } from '@/components/raffle/RaffleFilters';
import { ProtectedAction } from '@/components/auth/ProtectedAction';
import { formatCurrency } from '@/lib/currency-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

export default function RafflesList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    dateRange: [null, null],
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { 
    useRafflesList, 
    toggleRaffleStatus, 
    deleteRaffle, 
    duplicateRaffle 
  } = useRaffles();
  
  // Build the query filters
  const queryFilters: RaffleFiltersType = {
    status: filters.status.length === 1 ? filters.status[0] : 
            filters.status.length > 1 ? 'all' : 'all',
    search: searchQuery || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data: allRaffles = [], isLoading } = useRafflesList(queryFilters);
  
  // Apply additional client-side filters
  const raffles = allRaffles.filter(raffle => {
    // Status filter (supports multiple)
    if (filters.status.length > 0 && !filters.status.includes(raffle.status || 'draft')) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange[0] && raffle.created_at) {
      if (new Date(raffle.created_at) < filters.dateRange[0]) return false;
    }
    if (filters.dateRange[1] && raffle.created_at) {
      if (new Date(raffle.created_at) > filters.dateRange[1]) return false;
    }
    
    return true;
  });

  // Keyboard shortcut for creating new raffle
  useKeyboardShortcut('n', () => navigate('/dashboard/raffles/new'), { ctrl: true });

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteRaffle.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sorteos</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gestiona todos tus sorteos y rifas
            </p>
          </div>
          <ProtectedAction resource="raffle" action="create">
            <Button onClick={() => navigate('/dashboard/raffles/new')} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Crear Sorteo</span>
              <span className="sm:hidden">Crear</span>
            </Button>
          </ProtectedAction>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <RaffleFilters filters={filters} onFiltersChange={setFilters} />

          <div className="flex gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Raffles List */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : raffles.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={<Gift className="h-16 w-16" />}
                title="No hay sorteos"
                description="Crea tu primer sorteo para empezar a vender boletos y gestionar participantes."
                action={{
                  label: "Crear Primer Sorteo",
                  onClick: () => navigate('/dashboard/raffles/new')
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {raffles.map((raffle) => (
              <Card 
                key={raffle.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/dashboard/raffles/${raffle.id}`)}
              >
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
                          <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                            {raffle.title}
                          </h3>
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/raffles/${raffle.id}`);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        {(role === 'owner' || role === 'admin') && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/raffles/${raffle.id}/edit`);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          duplicateRaffle.mutate(raffle.id);
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        {(raffle.status === 'active' || raffle.status === 'paused') && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRaffleStatus.mutate({ 
                                id: raffle.id, 
                                currentStatus: raffle.status! 
                              });
                            }}
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
                        {(role === 'owner' || role === 'admin') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(raffle.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
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
      </PageTransition>
    </DashboardLayout>
  );
}
