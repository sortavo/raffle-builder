import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  Phone,
  Mail,
  Clock,
  X,
  Loader2,
  Check,
  Ban,
  Timer,
  Image as ImageIcon,
  MapPin
} from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { cn } from '@/lib/utils';
import { TicketGridSkeleton } from '@/components/ui/skeletons';
import { DownloadableTicket } from '@/components/ticket/DownloadableTicket';

interface TicketsTabProps {
  raffleId: string;
  raffleTitle?: string;
  raffleSlug?: string;
  rafflePrizeName?: string;
  rafflePrizeImages?: string[];
  raffleDrawDate?: string | null;
  raffleTicketPrice?: number;
  raffleCurrencyCode?: string;
  organizationName?: string;
  organizationLogo?: string | null;
}

const TICKETS_PER_PAGE = 100;

export function TicketsTab({ 
  raffleId, 
  raffleTitle, 
  raffleSlug,
  rafflePrizeName,
  rafflePrizeImages,
  raffleDrawDate,
  raffleTicketPrice,
  raffleCurrencyCode,
  organizationName,
  organizationLogo
}: TicketsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [jumpToPage, setJumpToPage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [highlightedTicket, setHighlightedTicket] = useState<string | null>(null);
  const [showProofImage, setShowProofImage] = useState(false);
  const ticketRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { useVirtualTicketsList, useTicketStats, approveTicket, rejectTicket, extendReservation } = useTickets(raffleId);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      // Reset to page 1 when search changes
      if (searchInput !== debouncedSearch) {
        setCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Use virtual tickets for the grid display
  const { data: ticketsData, isLoading, isFetching } = useVirtualTicketsList({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    pageSize: TICKETS_PER_PAGE,
  });

  const { data: stats } = useTicketStats();

  const tickets = ticketsData?.tickets || [];
  // Use totalTickets for correct pagination (total virtual tickets, not filtered count)
  const totalTickets = ticketsData?.totalTickets || ticketsData?.count || 0;
  const totalFilteredCount = ticketsData?.count || 0;
  const totalPages = Math.ceil(totalTickets / TICKETS_PER_PAGE);

  // Highlight effect for found tickets
  useEffect(() => {
    if (highlightedTicket && tickets.length > 0) {
      const ticketElement = ticketRefs.current.get(highlightedTicket);
      if (ticketElement) {
        ticketElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const timer = setTimeout(() => setHighlightedTicket(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTicket, tickets]);

  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setJumpToPage('');
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const getTicketColor = (status: string, isHighlighted: boolean) => {
    const baseClasses = isHighlighted ? 'ring-4 ring-amber-400 ring-offset-2 animate-pulse' : '';
    switch (status) {
      case 'available':
        return cn(baseClasses, 'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300 hover:bg-green-500/30');
      case 'reserved':
        return cn(baseClasses, 'bg-yellow-500/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/30');
      case 'sold':
        return cn(baseClasses, 'bg-muted border-border text-muted-foreground');
      case 'canceled':
        return cn(baseClasses, 'bg-destructive/20 border-destructive/50 text-destructive');
      default:
        return cn(baseClasses, 'bg-muted border-border');
    }
  };

  // Create a 10x10 grid
  const gridTickets = [];
  for (let i = 0; i < 10; i++) {
    const row = [];
    for (let j = 0; j < 10; j++) {
      const index = i * 10 + j;
      row.push(tickets[index] || null);
    }
    gridTickets.push(row);
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card className="p-2.5 sm:p-4">
          <div className="text-[10px] sm:text-xs text-muted-foreground">Total</div>
          <div className="text-lg sm:text-2xl font-bold">{stats?.total || 0}</div>
        </Card>
        <Card className="p-2.5 sm:p-4">
          <div className="text-[10px] sm:text-xs text-green-600">Disponibles</div>
          <div className="text-lg sm:text-2xl font-bold text-green-600">{stats?.available || 0}</div>
        </Card>
        <Card className="p-2.5 sm:p-4">
          <div className="text-[10px] sm:text-xs text-yellow-600">Reservados</div>
          <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats?.reserved || 0}</div>
        </Card>
        <Card className="p-2.5 sm:p-4">
          <div className="text-[10px] sm:text-xs text-muted-foreground">Vendidos</div>
          <div className="text-lg sm:text-2xl font-bold">{stats?.sold || 0}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número (búsqueda global)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className="pl-9 pr-16"
                />
                {(searchInput || isFetching) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {searchInput && (
                      <button
                        onClick={handleClearSearch}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {debouncedSearch && (
                <p className="text-xs text-muted-foreground mt-1">
                  {totalFilteredCount} resultado{totalFilteredCount !== 1 ? 's' : ''} para "{debouncedSearch}"
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponibles</SelectItem>
                  <SelectItem value="reserved">Reservados</SelectItem>
                  <SelectItem value="sold">Vendidos</SelectItem>
                  <SelectItem value="canceled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Grid */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold">
            Boletos (Página {currentPage} de {totalPages || 1})
            {debouncedSearch && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                — Filtrado por "{debouncedSearch}"
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {isLoading ? (
            <TicketGridSkeleton />
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No se encontraron boletos</p>
              {debouncedSearch && (
                <p className="text-sm mt-1">
                  No hay boletos que coincidan con "{debouncedSearch}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2 overflow-x-auto">
              {gridTickets.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2">
                  {row.map((ticket, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      ref={(el) => {
                        if (ticket && el) ticketRefs.current.set(ticket.ticket_number, el);
                        else if (ticket) ticketRefs.current.delete(ticket.ticket_number);
                      }}
                      onClick={() => ticket && setSelectedTicket(ticket)}
                      disabled={!ticket}
                      className={cn(
                        'aspect-square rounded-md border text-[10px] sm:text-xs font-medium flex items-center justify-center transition-colors min-h-[32px] sm:min-h-0',
                        ticket ? getTicketColor(ticket.status || 'available', highlightedTicket === ticket.ticket_number) : 'bg-muted/50 border-transparent',
                        ticket && 'cursor-pointer'
                      )}
                    >
                      {ticket?.ticket_number || ''}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs sm:text-sm text-muted-foreground px-2">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Ir a..."
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            className="w-20 sm:w-28 h-8 sm:h-9 text-sm"
            min={1}
            max={totalPages}
          />
          <Button onClick={handleJumpToPage} variant="outline" size="sm" className="h-8 sm:h-9">
            Ir
          </Button>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden mx-2 sm:mx-auto">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              Boleto #{selectedTicket?.ticket_number}
              <Badge 
                variant={
                  selectedTicket?.status === 'sold' ? 'default' :
                  selectedTicket?.status === 'reserved' ? 'secondary' :
                  selectedTicket?.status === 'available' ? 'outline' : 'destructive'
                }
                className="text-xs"
              >
                {selectedTicket?.status === 'sold' ? 'Vendido' :
                 selectedTicket?.status === 'reserved' ? 'Reservado' :
                 selectedTicket?.status === 'available' ? 'Disponible' : 'Cancelado'}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
            {/* Buyer Info */}
            {(selectedTicket?.status === 'sold' || selectedTicket?.status === 'reserved') && (
              <div className="space-y-3">
                {selectedTicket.buyer_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedTicket.buyer_name}</span>
                  </div>
                )}
                {selectedTicket.buyer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`https://wa.me/${selectedTicket.buyer_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedTicket.buyer_phone}
                    </a>
                  </div>
                )}
                {selectedTicket.buyer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${selectedTicket.buyer_email}`}
                      className="text-primary hover:underline"
                    >
                      {selectedTicket.buyer_email}
                    </a>
                  </div>
                )}
                {selectedTicket.reserved_until && selectedTicket.status === 'reserved' && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Expira: {new Date(selectedTicket.reserved_until).toLocaleString('es-MX')}
                    </span>
                  </div>
                )}
                {selectedTicket.payment_proof_url && (
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowProofImage(true)}
                      className="flex items-center gap-2 text-primary hover:underline text-sm"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Ver comprobante de pago
                    </button>
                    {/* Thumbnail preview */}
                    <button
                      onClick={() => setShowProofImage(true)}
                      className="block w-full max-w-[200px] rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img 
                        src={selectedTicket.payment_proof_url} 
                        alt="Comprobante de pago"
                        className="w-full h-auto object-cover max-h-[200px]"
                      />
                    </button>
                  </div>
                )}
                {selectedTicket.payment_reference && (
                  <div className="text-sm text-muted-foreground">
                    Referencia: <span className="font-mono">{selectedTicket.payment_reference}</span>
                  </div>
                )}
                {selectedTicket.buyer_city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedTicket.buyer_city}</span>
                  </div>
                )}
              </div>
            )}

            {/* Visual Ticket with QR */}
            {(selectedTicket?.status === 'sold' || selectedTicket?.status === 'reserved') && 
             raffleTitle && rafflePrizeName && raffleDrawDate && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Boleto Visual</p>
                  <div className="transform scale-[0.75] sm:scale-[0.85] origin-top -mb-16 sm:-mb-8">
                    <DownloadableTicket
                      ticket={{
                        id: selectedTicket.id,
                        ticket_number: selectedTicket.ticket_number,
                        buyer_name: selectedTicket.buyer_name || 'Sin nombre',
                        buyer_email: selectedTicket.buyer_email || '',
                        status: selectedTicket.status,
                      }}
                      raffle={{
                        title: raffleTitle,
                        slug: raffleSlug || '',
                        prize_name: rafflePrizeName,
                        prize_images: rafflePrizeImages,
                        draw_date: raffleDrawDate,
                        ticket_price: raffleTicketPrice || 0,
                        currency_code: raffleCurrencyCode || 'MXN',
                      }}
                      organization={organizationName ? {
                        name: organizationName,
                        logo_url: organizationLogo,
                      } : undefined}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Quick Actions */}
            {selectedTicket?.status === 'reserved' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Acciones rápidas</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        approveTicket.mutate({ 
                          ticketId: selectedTicket.id,
                          raffleTitle,
                          raffleSlug
                        }, {
                          onSuccess: () => setSelectedTicket(null)
                        });
                      }}
                      disabled={approveTicket.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {approveTicket.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Aprobar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        rejectTicket.mutate(selectedTicket.id, {
                          onSuccess: () => setSelectedTicket(null)
                        });
                      }}
                      disabled={rejectTicket.isPending}
                    >
                      {rejectTicket.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Ban className="h-4 w-4 mr-2" />
                      )}
                      Rechazar
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        extendReservation.mutate({ ticketId: selectedTicket.id, minutes: 15 });
                      }}
                      disabled={extendReservation.isPending}
                    >
                      <Timer className="h-4 w-4 mr-1" />
                      +15 min
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        extendReservation.mutate({ ticketId: selectedTicket.id, minutes: 30 });
                      }}
                      disabled={extendReservation.isPending}
                    >
                      <Timer className="h-4 w-4 mr-1" />
                      +30 min
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        extendReservation.mutate({ ticketId: selectedTicket.id, minutes: 60 });
                      }}
                      disabled={extendReservation.isPending}
                    >
                      <Timer className="h-4 w-4 mr-1" />
                      +1 hr
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Sold ticket - only reject option */}
            {selectedTicket?.status === 'sold' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Acciones</p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      rejectTicket.mutate(selectedTicket.id, {
                        onSuccess: () => setSelectedTicket(null)
                      });
                    }}
                    disabled={rejectTicket.isPending}
                  >
                    {rejectTicket.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Ban className="h-4 w-4 mr-2" />
                    )}
                    Cancelar venta y liberar boleto
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Proof Image Modal */}
      <Dialog open={showProofImage} onOpenChange={setShowProofImage}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Comprobante de pago</DialogTitle>
          </DialogHeader>
          {selectedTicket?.payment_proof_url && (
            <div className="relative">
              <img 
                src={selectedTicket.payment_proof_url} 
                alt="Comprobante de pago"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(selectedTicket.payment_proof_url);
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const extension = selectedTicket.payment_proof_url.split('.').pop()?.split('?')[0] || 'jpg';
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `comprobante-boleto-${selectedTicket.ticket_number}.${extension}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Error downloading image:', error);
                    }
                  }}
                  className="bg-background/90 backdrop-blur-sm text-sm px-3 py-1.5 rounded-lg border hover:bg-background transition-colors flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </button>
                <a
                  href={selectedTicket.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background/90 backdrop-blur-sm text-sm px-3 py-1.5 rounded-lg border hover:bg-background transition-colors"
                >
                  Abrir en nueva pestaña
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
