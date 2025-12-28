import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VirtualizedTicketList } from "@/components/ui/VirtualizedTicketList";
import { useMyTickets } from "@/hooks/usePublicRaffle";
import { useBulkTicketDownload } from "@/hooks/useBulkTicketDownload";
import { useAuth } from "@/hooks/useAuth";
import { TicketQRCode } from "@/components/ticket/TicketQRCode";
import { DownloadableTicket } from "@/components/ticket/DownloadableTicket";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Ticket, Search, QrCode, ChevronRight, Calendar, Trophy, 
  Clock, CheckCircle2, AlertCircle, Download, Eye, Mail, User, MapPin,
  Hourglass, Hash, FileDown, Send
} from "lucide-react";
import { useEmails } from "@/hooks/useEmails";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/currency-utils";

// Status configuration for visual display
const STATUS_CONFIG = {
  sold: {
    label: 'Confirmado',
    color: 'bg-success/10 text-success border-success/30',
    icon: CheckCircle2,
    description: 'Pago confirmado - Boleto válido'
  },
  reserved: {
    label: 'Pendiente',
    color: 'bg-warning/10 text-warning border-warning/30',
    icon: Hourglass,
    description: 'Pago pendiente de confirmación'
  },
  available: {
    label: 'Disponible',
    color: 'bg-muted text-muted-foreground border-border',
    icon: Ticket,
    description: 'Boleto disponible'
  },
  canceled: {
    label: 'Cancelado',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: AlertCircle,
    description: 'Boleto cancelado'
  }
};

type StatusFilter = 'all' | 'sold' | 'reserved';
type SearchType = 'email' | 'reference';

export default function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(user?.email || '');
  const [searchValue, setSearchValue] = useState(user?.email || '');
  const [searchType, setSearchType] = useState<SearchType>('email');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ticketSearch, setTicketSearch] = useState('');

  const { data: tickets, isLoading } = useMyTickets(searchValue, searchType);
  const { generatePDF, isGenerating } = useBulkTicketDownload();
  const { sendReservationEmail } = useEmails();
  const { toast } = useToast();
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Handler to resend confirmation email
  const handleResendEmail = async () => {
    if (!selectedTicket || isResendingEmail) return;
    
    const ticket = selectedTicket.ticket;
    const raffle = selectedTicket.raffle;
    
    if (!ticket.buyer_email || !raffle) {
      toast({
        title: 'Error',
        description: 'No se puede reenviar el email: información incompleta',
        variant: 'destructive',
      });
      return;
    }

    setIsResendingEmail(true);
    try {
      // Get all tickets with the same payment_reference to include in email
      const relatedTickets = tickets?.filter(t => 
        t.payment_reference === ticket.payment_reference
      ) || [ticket];

      await sendReservationEmail({
        to: ticket.buyer_email,
        buyerName: ticket.buyer_name || 'Participante',
        ticketNumbers: relatedTickets.map(t => t.ticket_number),
        raffleTitle: raffle.title,
        raffleSlug: raffle.slug,
        amount: ticket.order_total || (relatedTickets.length * (raffle.ticket_price || 0)),
        currency: raffle.currency_code || 'MXN',
        timerMinutes: 0, // Already reserved, no timer
        referenceCode: ticket.payment_reference || undefined,
      });

      toast({
        title: 'Email enviado',
        description: `Se ha reenviado la confirmación a ${ticket.buyer_email}`,
      });
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: 'Error al enviar',
        description: 'No se pudo reenviar el email. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setSearchValue(searchType === 'email' ? trimmed.toLowerCase() : trimmed.toUpperCase());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearchTypeChange = (value: string) => {
    setSearchType(value as SearchType);
    setSearchInput('');
    setSearchValue('');
  };

  // Filter tickets based on status and ticket number search
  const filteredTickets = tickets?.filter(ticket => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesSearch = !ticketSearch || 
      ticket.ticket_number.toLowerCase().includes(ticketSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Group tickets by raffle with additional stats
  const groupedTickets = useMemo(() => {
    return filteredTickets?.reduce((acc, ticket) => {
      const raffleId = ticket.raffles?.id || 'unknown';
      if (!acc[raffleId]) {
        acc[raffleId] = { 
          raffle: ticket.raffles, 
          tickets: [],
          stats: { confirmed: 0, pending: 0, total: 0, totalValue: 0 }
        };
      }
      acc[raffleId].tickets.push(ticket);
      acc[raffleId].stats.total += 1;
      acc[raffleId].stats.totalValue += ticket.raffles?.ticket_price || 0;
      if (ticket.status === 'sold') {
        acc[raffleId].stats.confirmed += 1;
      } else if (ticket.status === 'reserved') {
        acc[raffleId].stats.pending += 1;
      }
      return acc;
    }, {} as Record<string, { 
      raffle: typeof filteredTickets[0]['raffles']; 
      tickets: typeof filteredTickets;
      stats: { confirmed: number; pending: number; total: number; totalValue: number }
    }>);
  }, [filteredTickets]);

  // Handle ticket click - opens detail modal
  const handleTicketClick = useCallback((ticket: any, raffle: any) => {
    setSelectedTicket({ ticket, raffle });
  }, []);

  // Calculate overall stats
  const overallStats = tickets?.reduce((acc, t) => {
    acc.total += 1;
    if (t.status === 'sold') acc.confirmed += 1;
    if (t.status === 'reserved') acc.pending += 1;
    return acc;
  }, { total: 0, confirmed: 0, pending: 0 }) || { total: 0, confirmed: 0, pending: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 max-w-3xl space-y-6 relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent mb-2 shadow-lg shadow-primary/25">
            <Ticket className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            Mis Boletos
          </h1>
          <p className="text-muted-foreground">
            Consulta tu historial de compras y descarga tus boletos
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden shadow-lg shadow-primary/10 border-primary/20 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6 space-y-4">
              {/* Search Type Tabs */}
              <Tabs value={searchType} onValueChange={handleSearchTypeChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="reference" className="gap-2">
                    <Hash className="h-4 w-4" />
                    Clave de Reserva
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {searchType === 'email' ? (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  ) : (
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  )}
                  <Input
                    type={searchType === 'email' ? 'email' : 'text'}
                    placeholder={searchType === 'email' ? 'ejemplo@correo.com' : 'Ej: GYEP6CE8'}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="h-12 pl-10 border-primary/20 focus:border-primary focus:ring-primary uppercase-placeholder"
                    style={searchType === 'reference' ? { textTransform: 'uppercase' } : undefined}
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  size="lg" 
                  className="px-6 gap-2 bg-gradient-to-r from-primary via-primary/80 to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25"
                  disabled={!searchInput.trim()}
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Buscar</span>
                </Button>
              </div>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground text-center">
                {searchType === 'email' 
                  ? '¿No recuerdas tu email? Usa la clave de reserva que recibiste al comprar.'
                  : 'Ingresa la clave de 8 caracteres que recibiste al reservar tus boletos.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Summary & Filters */}
        <AnimatePresence>
          {searchValue && tickets && tickets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Stats Cards - Clickable Filters */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`text-center py-4 rounded-lg border transition-all ${
                    statusFilter === 'all' 
                      ? 'ring-2 ring-primary border-primary bg-primary/5' 
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <p className="text-2xl font-bold">{overallStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Boletos</p>
                </button>
                <button
                  onClick={() => setStatusFilter('sold')}
                  className={`text-center py-4 rounded-lg border transition-all ${
                    statusFilter === 'sold' 
                      ? 'ring-2 ring-success border-success bg-success/10' 
                      : 'border-success/30 bg-success/5 hover:bg-success/10'
                  }`}
                >
                  <p className="text-2xl font-bold text-success">{overallStats.confirmed}</p>
                  <p className="text-xs text-muted-foreground">Confirmados</p>
                </button>
                <button
                  onClick={() => setStatusFilter('reserved')}
                  className={`text-center py-4 rounded-lg border transition-all ${
                    statusFilter === 'reserved' 
                      ? 'ring-2 ring-warning border-warning bg-warning/10' 
                      : 'border-warning/30 bg-warning/5 hover:bg-warning/10'
                  }`}
                >
                  <p className="text-2xl font-bold text-warning">{overallStats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </button>
              </div>

              {/* Download All Button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => generatePDF(tickets || [])}
                disabled={isGenerating || !tickets?.length}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {isGenerating ? 'Generando PDF...' : `Descargar todos (${tickets?.length || 0} boletos)`}
              </Button>

              {/* Ticket Number Search */}
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por número de boleto..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="pl-10"
                />
                {ticketSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                    onClick={() => setTicketSearch('')}
                  >
                    Limpiar
                  </Button>
                )}
              </div>

              {/* Active Filters Indicator */}
              {(statusFilter !== 'all' || ticketSearch) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Filtros activos:</span>
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {statusFilter === 'sold' ? 'Confirmados' : 'Pendientes'}
                      <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  )}
                  {ticketSearch && (
                    <Badge variant="secondary" className="gap-1">
                      #{ticketSearch}
                      <button onClick={() => setTicketSearch('')} className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => { setStatusFilter('all'); setTicketSearch(''); }}
                  >
                    Limpiar todo
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Buscando tus boletos...</p>
          </div>
        ) : !searchValue ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">
                {searchType === 'email' 
                  ? 'Ingresa tu email para ver tus boletos'
                  : 'Ingresa tu clave de reserva para ver tus boletos'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchType === 'email'
                  ? 'Usaremos el email con el que realizaste tus compras'
                  : 'Es el código de 8 caracteres que recibiste al reservar'}
              </p>
            </CardContent>
          </Card>
        ) : !tickets?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No se encontraron boletos</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchType === 'email' 
                  ? <>Verifica que el email <strong>{searchValue}</strong> sea correcto</>
                  : <>Verifica que la clave <strong>{searchValue}</strong> sea correcta</>}
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSearchInput('')}
              >
                {searchType === 'email' ? 'Intentar con otro email' : 'Intentar con otra clave'}
              </Button>
            </CardContent>
          </Card>
        ) : !filteredTickets?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground mt-1">
                No hay boletos que coincidan con los filtros aplicados
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { setStatusFilter('all'); setTicketSearch(''); }}
              >
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {Object.values(groupedTickets || {}).map(({ raffle, tickets: raffleTickets, stats }, index) => (
              <motion.div
                key={raffle?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  {/* Raffle Header */}
                  <div 
                    className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b cursor-pointer hover:from-primary/10 hover:to-primary/15 transition-colors group"
                    onClick={() => navigate(`/r/${raffle?.slug}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{raffle?.title}</h3>
                          <Badge 
                            variant={raffle?.status === 'active' ? 'default' : 
                                    raffle?.status === 'completed' ? 'secondary' : 'outline'}
                            className="shrink-0"
                          >
                            {raffle?.status === 'active' ? 'Activo' : 
                             raffle?.status === 'completed' ? 'Finalizado' : 
                             raffle?.status === 'draft' ? 'Borrador' : raffle?.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-primary" />
                            {raffle?.prize_name}
                          </span>
                          {raffle?.draw_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(raffle.draw_date), "dd MMM yyyy", { locale: es })}
                            </span>
                          )}
                        </div>
                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-muted-foreground">
                            {stats.total} boleto{stats.total !== 1 ? 's' : ''}
                          </span>
                          {stats.confirmed > 0 && (
                            <span className="text-success flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {stats.confirmed} confirmado{stats.confirmed !== 1 ? 's' : ''}
                            </span>
                          )}
                          {stats.pending > 0 && (
                            <span className="text-warning flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {stats.pending} pendiente{stats.pending !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                    </div>

                  {/* Tickets List - Virtualized */}
                  <CardContent className="p-0">
                    <VirtualizedTicketList
                      tickets={raffleTickets}
                      raffle={raffle}
                      onTicketClick={handleTicketClick}
                      maxHeight={500}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Ticket Detail Modal */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Boleto #{selectedTicket?.ticket.ticket_number}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTicket && (
              <div className="space-y-6">
                {/* Status Banner */}
                {(() => {
                  const status = STATUS_CONFIG[selectedTicket.ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available;
                  const StatusIcon = status.icon;
                  return (
                    <div className={`p-4 rounded-xl border-2 ${status.color}`}>
                      <div className="flex items-center gap-3">
                        <StatusIcon className="w-6 h-6" />
                        <div>
                          <p className="font-semibold">{status.label}</p>
                          <p className="text-sm opacity-80">{status.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Purchase Details */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Detalles de Compra</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedTicket.ticket.buyer_name && (
                      <div>
                        <p className="text-muted-foreground">Nombre</p>
                        <p className="font-medium">{selectedTicket.ticket.buyer_name}</p>
                      </div>
                    )}
                    {selectedTicket.ticket.buyer_email && (
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium truncate">{selectedTicket.ticket.buyer_email}</p>
                      </div>
                    )}
                    {selectedTicket.ticket.buyer_phone && (
                      <div>
                        <p className="text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{selectedTicket.ticket.buyer_phone}</p>
                      </div>
                    )}
                    {selectedTicket.ticket.buyer_city && (
                      <div>
                        <p className="text-muted-foreground">Ciudad</p>
                        <p className="font-medium">{selectedTicket.ticket.buyer_city}</p>
                      </div>
                    )}
                    {(selectedTicket.ticket.reserved_at || selectedTicket.ticket.sold_at) && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Fecha de Compra</p>
                        <p className="font-medium">
                          {format(
                            new Date(selectedTicket.ticket.sold_at || selectedTicket.ticket.reserved_at), 
                            "dd 'de' MMMM yyyy, HH:mm", 
                            { locale: es }
                          )}
                        </p>
                      </div>
                    )}
                    {selectedTicket.ticket.payment_reference && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Referencia de Pago</p>
                        <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {selectedTicket.ticket.payment_reference}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code for pending tickets */}
                {selectedTicket.ticket.status !== 'sold' && (
                  <div className="text-center p-4 bg-muted/30 rounded-xl">
                    <TicketQRCode
                      ticketId={selectedTicket.ticket.id}
                      ticketNumber={selectedTicket.ticket.ticket_number}
                      raffleSlug={selectedTicket.raffle?.slug || ''}
                      size={150}
                    />
                    <p className="text-sm text-muted-foreground mt-3">
                      Escanea este código para verificar tu boleto
                    </p>
                  </div>
                )}

                {/* Downloadable ticket for confirmed */}
                {selectedTicket.ticket.status === 'sold' && (
                  <DownloadableTicket
                    ticket={{
                      id: selectedTicket.ticket.id,
                      ticket_number: selectedTicket.ticket.ticket_number,
                      buyer_name: selectedTicket.ticket.buyer_name || 'Participante',
                      buyer_email: selectedTicket.ticket.buyer_email || '',
                      status: selectedTicket.ticket.status,
                    }}
                    raffle={{
                      title: selectedTicket.raffle?.title || '',
                      slug: selectedTicket.raffle?.slug || '',
                      prize_name: selectedTicket.raffle?.prize_name || '',
                      prize_images: selectedTicket.raffle?.prize_images,
                      draw_date: selectedTicket.raffle?.draw_date || '',
                      ticket_price: selectedTicket.raffle?.ticket_price || 0,
                      currency_code: selectedTicket.raffle?.currency_code || 'MXN',
                    }}
                  />
                )}

                {/* Resend email button */}
                {selectedTicket.ticket.buyer_email && selectedTicket.ticket.payment_reference && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={handleResendEmail}
                    disabled={isResendingEmail}
                  >
                    {isResendingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isResendingEmail ? 'Enviando...' : 'Reenviar email de confirmación'}
                  </Button>
                )}

                {/* View raffle button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedTicket(null);
                    navigate(`/r/${selectedTicket.raffle?.slug}`);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Sorteo
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}