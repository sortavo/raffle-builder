import { useState } from 'react';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
  Clock
} from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { cn } from '@/lib/utils';

interface TicketsTabProps {
  raffleId: string;
}

const TICKETS_PER_PAGE = 100;

export function TicketsTab({ raffleId }: TicketsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchNumber, setSearchNumber] = useState('');
  const [jumpToPage, setJumpToPage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { useTicketsList, useTicketStats } = useTickets();
  
  const { data: tickets = [], isLoading } = useTicketsList(raffleId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page: currentPage,
    limit: TICKETS_PER_PAGE,
  });

  const { data: stats } = useTicketStats(raffleId);

  const totalPages = Math.ceil((stats?.total || 0) / TICKETS_PER_PAGE);

  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setJumpToPage('');
    }
  };

  const getTicketColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300 hover:bg-green-500/30';
      case 'reserved':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/30';
      case 'sold':
        return 'bg-muted border-border text-muted-foreground';
      case 'canceled':
        return 'bg-destructive/20 border-destructive/50 text-destructive';
      default:
        return 'bg-muted border-border';
    }
  };

  const filteredTickets = searchNumber 
    ? tickets.filter(t => t.ticket_number.includes(searchNumber))
    : tickets;

  // Create a 10x10 grid
  const gridTickets = [];
  for (let i = 0; i < 10; i++) {
    const row = [];
    for (let j = 0; j < 10; j++) {
      const index = i * 10 + j;
      row.push(filteredTickets[index] || null);
    }
    gridTickets.push(row);
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{stats?.total || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-green-600">Disponibles</div>
          <div className="text-2xl font-bold text-green-600">{stats?.available || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-yellow-600">Reservados</div>
          <div className="text-2xl font-bold text-yellow-600">{stats?.reserved || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Vendidos</div>
          <div className="text-2xl font-bold">{stats?.sold || 0}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número..."
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Boletos (Página {currentPage} de {totalPages || 1})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 100 }).map((_, i) => (
                <div 
                  key={i} 
                  className="aspect-square rounded-md bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {gridTickets.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-10 gap-2">
                  {row.map((ticket, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => ticket && setSelectedTicket(ticket)}
                      disabled={!ticket}
                      className={cn(
                        'aspect-square rounded-md border text-xs font-medium flex items-center justify-center transition-colors',
                        ticket ? getTicketColor(ticket.status) : 'bg-muted/50 border-transparent',
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Página {currentPage} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Ir a página..."
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            className="w-32"
            min={1}
            max={totalPages}
          />
          <Button onClick={handleJumpToPage} variant="outline" size="sm">
            Ir
          </Button>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Boleto #{selectedTicket?.ticket_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant={
                selectedTicket?.status === 'sold' ? 'default' :
                selectedTicket?.status === 'reserved' ? 'secondary' :
                selectedTicket?.status === 'available' ? 'outline' : 'destructive'
              }>
                {selectedTicket?.status === 'sold' ? 'Vendido' :
                 selectedTicket?.status === 'reserved' ? 'Reservado' :
                 selectedTicket?.status === 'available' ? 'Disponible' : 'Cancelado'}
              </Badge>
            </div>

            {(selectedTicket?.status === 'sold' || selectedTicket?.status === 'reserved') && (
              <>
                {selectedTicket.buyer_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTicket.buyer_name}</span>
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
                    <span>
                      Expira: {new Date(selectedTicket.reserved_until).toLocaleString('es-MX')}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
