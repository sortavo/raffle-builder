import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { BulkActionsToolbar } from '@/components/ui/BulkActionsToolbar';
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
  X,
  Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { useRaffles, type RaffleFilters as RaffleFiltersType } from '@/hooks/useRaffles';
import { useAuth } from '@/hooks/useAuth';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { RaffleStatusBadge } from '@/components/raffle/RaffleStatusBadge';
import { RafflePublicLinks } from '@/components/raffle/RafflePublicLinks';
import { RaffleFilters, type FilterState } from '@/components/raffle/RaffleFilters';
import { ProtectedAction } from '@/components/auth/ProtectedAction';
import { formatCurrency } from '@/lib/currency-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

const PAGE_SIZE = 20;

export default function RafflesList() {
  const navigate = useNavigate();
  const { role, organization } = useAuth();
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    dateRange: [null, null],
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { 
    useRafflesList, 
    toggleRaffleStatus, 
    deleteRaffle, 
    duplicateRaffle 
  } = useRaffles();

  // Undoable delete for single items
  const { scheduleDelete, isPending: isDeletePending } = useUndoableDelete({
    onDelete: async (raffle: { id: string; title: string }) => {
      await deleteRaffle.mutateAsync(raffle.id);
    },
    getDeleteMessage: (raffle) => `Eliminando "${raffle.title}"...`,
    delay: 5000,
  });

  const copyUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  // Selection handlers
  const toggleSelect = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  
  // Build the query filters with pagination
  const queryFilters: RaffleFiltersType = {
    status: filters.status.length === 1 ? filters.status[0] : 
            filters.status.length > 1 ? 'all' : 'all',
    search: searchQuery || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: currentPage,
    pageSize: PAGE_SIZE,
    startDate: filters.dateRange[0] || undefined,
    endDate: filters.dateRange[1] || undefined,
  };

  const { data: paginatedData, isLoading } = useRafflesList(queryFilters);
  
  // Extract data from paginated response
  const raffles = paginatedData?.data || [];
  const totalPages = paginatedData?.totalPages || 0;
  const totalCount = paginatedData?.totalCount || 0;

  // Select all must be after raffles is defined
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === raffles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(raffles.map(r => r.id)));
    }
  }, [raffles, selectedIds.size]);

  // Reset page when filters change
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
    clearSelection();
  };

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    clearSelection();
  };

  // Keyboard shortcut for creating new raffle
  useKeyboardShortcut('n', () => navigate('/dashboard/raffles/new'), { ctrl: true });

  const handleDelete = async () => {
    if (deleteConfirmId) {
      const raffle = raffles.find(r => r.id === deleteConfirmId);
      if (raffle) {
        scheduleDelete({ id: raffle.id, title: raffle.title });
      }
      setDeleteConfirmId(null);
    }
  };

  // Bulk actions
  const handleBulkPause = async () => {
    const selected = raffles.filter(r => selectedIds.has(r.id) && r.status === 'active');
    for (const raffle of selected) {
      await toggleRaffleStatus.mutateAsync({ id: raffle.id, currentStatus: 'active' });
    }
    toast.success(`${selected.length} sorteo(s) pausado(s)`);
    clearSelection();
  };

  const handleBulkActivate = async () => {
    const selected = raffles.filter(r => selectedIds.has(r.id) && r.status === 'paused');
    for (const raffle of selected) {
      await toggleRaffleStatus.mutateAsync({ id: raffle.id, currentStatus: 'paused' });
    }
    toast.success(`${selected.length} sorteo(s) activado(s)`);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const selected = raffles.filter(r => selectedIds.has(r.id));
    for (const raffle of selected) {
      scheduleDelete({ id: raffle.id, title: raffle.title });
    }
    clearSelection();
    setBulkDeleteConfirm(false);
  };

  // Generate pagination range
  const getPaginationRange = () => {
    const delta = 2;
    const range: (number | 'ellipsis')[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== 'ellipsis') {
        range.push('ellipsis');
      }
    }
    
    return range;
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sorteos</h1>
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

        {/* Filters + Search Row */}
        <div className="space-y-3">
          {/* Status Filters */}
          <RaffleFilters filters={filters} onFiltersChange={handleFiltersChange} />

          {/* Search + Sort + Counter */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => handleSearchChange('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2 justify-between sm:justify-end">
              {raffles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-9 text-xs"
                >
                  {selectedIds.size === raffles.length ? 'Deseleccionar' : 'Seleccionar todo'}
                </Button>
              )}
              {totalCount > 0 && (
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {totalCount} {totalCount === 1 ? 'sorteo' : 'sorteos'}
                </span>
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
            {raffles.map((raffle) => {
              const isSelected = selectedIds.has(raffle.id);
              const isPendingDelete = isDeletePending(raffle.id);
              
              return (
              <Card 
                key={raffle.id} 
                className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''} ${isPendingDelete ? 'opacity-50' : ''}`}
                onClick={() => navigate(`/dashboard/raffles/${raffle.id}`)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Checkbox for selection */}
                    <div 
                      className="pt-1 hidden sm:block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(raffle.id)}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    
                    {/* Thumbnail - visible on mobile too */}
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                      {raffle.prize_images && raffle.prize_images[0] ? (
                        <img 
                          src={raffle.prize_images[0]} 
                          alt={raffle.prize_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1 text-sm sm:text-base">
                            {raffle.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                            {raffle.prize_name}
                          </p>
                        </div>
                        <RaffleStatusBadge status={raffle.status || 'draft'} />
                      </div>

                      {/* Stats - grid on mobile for better layout */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span className="truncate">
                            {raffle.draw_date 
                              ? format(new Date(raffle.draw_date), 'dd MMM yy', { locale: es })
                              : 'Sin fecha'
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span className="truncate">{raffle.total_tickets.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span className="truncate">{formatCurrency(raffle.ticket_price, raffle.currency_code || 'MXN')}</span>
                        </div>
                        {raffle.status === 'active' && (
                          <RafflePublicLinks 
                            orgSlug={organization?.slug}
                            raffleSlug={raffle.slug}
                            organizationId={raffle.organization_id}
                            compact
                          />
                        )}
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
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {getPaginationRange().map((item, idx) => (
                    <PaginationItem key={idx}>
                      {item === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(item)}
                          isActive={currentPage === item}
                          className="cursor-pointer"
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
        </div>
      </PageTransition>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        onPause={handleBulkPause}
        onActivate={handleBulkActivate}
        onDelete={() => setBulkDeleteConfirm(true)}
        isVisible={selectedIds.size > 0}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sorteo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción se puede deshacer durante 5 segundos.
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} sorteo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción se puede deshacer durante 5 segundos por cada sorteo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
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
