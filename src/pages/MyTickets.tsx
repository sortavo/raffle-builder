import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyTickets } from "@/hooks/usePublicRaffle";
import { useAuth } from "@/hooks/useAuth";
import { TicketQRCode } from "@/components/ticket/TicketQRCode";
import { DownloadableTicket } from "@/components/ticket/DownloadableTicket";
import { 
  Loader2, Ticket, Search, QrCode, ChevronRight, Calendar, Trophy, 
  Clock, CheckCircle2, AlertCircle, Download, Eye, Mail, User, MapPin,
  Hourglass
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/currency-utils";

// Status configuration for visual display
const STATUS_CONFIG = {
  sold: {
    label: 'Confirmado',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    icon: CheckCircle2,
    description: 'Pago confirmado - Boleto válido'
  },
  reserved: {
    label: 'Pendiente',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    icon: Hourglass,
    description: 'Pago pendiente de confirmación'
  },
  available: {
    label: 'Disponible',
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
    icon: Ticket,
    description: 'Boleto disponible'
  },
  canceled: {
    label: 'Cancelado',
    color: 'bg-red-500/10 text-red-600 border-red-500/30',
    icon: AlertCircle,
    description: 'Boleto cancelado'
  }
};

export default function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email || '');
  const [searchEmail, setSearchEmail] = useState(user?.email || '');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { data: tickets, isLoading } = useMyTickets(searchEmail);

  const handleSearch = () => {
    setSearchEmail(email.trim().toLowerCase());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Group tickets by raffle with additional stats
  const groupedTickets = tickets?.reduce((acc, ticket) => {
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
    raffle: typeof tickets[0]['raffles']; 
    tickets: typeof tickets;
    stats: { confirmed: number; pending: number; total: number; totalValue: number }
  }>);

  // Calculate overall stats
  const overallStats = tickets?.reduce((acc, t) => {
    acc.total += 1;
    if (t.status === 'sold') acc.confirmed += 1;
    if (t.status === 'reserved') acc.pending += 1;
    return acc;
  }, { total: 0, confirmed: 0, pending: 0 }) || { total: 0, confirmed: 0, pending: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        {/* Header */}
        <motion.div 
          className="text-center space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Mis Boletos</h1>
          <p className="text-muted-foreground">
            Consulta tu historial de compras y descarga tus boletos
          </p>
        </motion.div>

        {/* Email Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Ingresa tu email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="h-12 pl-10"
                  />
                </div>
                <Button onClick={handleSearch} size="lg" className="px-6 gap-2">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Buscar</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Summary */}
        <AnimatePresence>
          {searchEmail && tickets && tickets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-3 gap-3"
            >
              <Card className="text-center py-4">
                <p className="text-2xl font-bold">{overallStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Boletos</p>
              </Card>
              <Card className="text-center py-4 border-emerald-500/30 bg-emerald-500/5">
                <p className="text-2xl font-bold text-emerald-600">{overallStats.confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </Card>
              <Card className="text-center py-4 border-amber-500/30 bg-amber-500/5">
                <p className="text-2xl font-bold text-amber-600">{overallStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Buscando tus boletos...</p>
          </div>
        ) : !searchEmail ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">
                Ingresa tu email para ver tus boletos
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Usaremos el email con el que realizaste tus compras
              </p>
            </CardContent>
          </Card>
        ) : !tickets?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No se encontraron boletos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Verifica que el email <strong>{searchEmail}</strong> sea correcto
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setEmail('')}
              >
                Intentar con otro email
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
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {stats.confirmed} confirmado{stats.confirmed !== 1 ? 's' : ''}
                            </span>
                          )}
                          {stats.pending > 0 && (
                            <span className="text-amber-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {stats.pending} pendiente{stats.pending !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Tickets List */}
                  <CardContent className="p-0 divide-y">
                    {raffleTickets.map((t, ticketIndex) => {
                      const status = STATUS_CONFIG[t.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available;
                      const StatusIcon = status.icon;
                      const purchaseDate = t.reserved_at || t.sold_at || t.created_at;

                      return (
                        <motion.button
                          key={t.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: ticketIndex * 0.05 }}
                          onClick={() => setSelectedTicket({ ticket: t, raffle })}
                          className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center gap-4"
                        >
                          {/* Ticket Number */}
                          <div className="flex-shrink-0">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg border-2 ${status.color}`}>
                              {t.ticket_number}
                            </div>
                          </div>

                          {/* Ticket Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Boleto #{t.ticket_number}</span>
                              <Badge variant="outline" className={`text-xs ${status.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              {purchaseDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(purchaseDate), { addSuffix: true, locale: es })}
                                </span>
                              )}
                              {t.buyer_name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {t.buyer_name}
                                </span>
                              )}
                              {t.buyer_city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {t.buyer_city}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="p-2 rounded-lg bg-muted/50">
                              {t.status === 'sold' ? (
                                <Download className="w-4 h-4 text-primary" />
                              ) : (
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
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