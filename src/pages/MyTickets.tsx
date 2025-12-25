import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyTickets } from "@/hooks/usePublicRaffle";
import { useAuth } from "@/hooks/useAuth";
import { TicketQRCode } from "@/components/ticket/TicketQRCode";
import { DownloadableTicket } from "@/components/ticket/DownloadableTicket";
import { Loader2, Ticket, Search, QrCode, ChevronRight, Calendar, Trophy } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";

export default function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email || '');
  const [searchEmail, setSearchEmail] = useState(user?.email || '');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { data: tickets, isLoading } = useMyTickets(searchEmail);

  const handleSearch = () => {
    setSearchEmail(email);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const groupedTickets = tickets?.reduce((acc, ticket) => {
    const raffleId = ticket.raffles?.id || 'unknown';
    if (!acc[raffleId]) {
      acc[raffleId] = { raffle: ticket.raffles, tickets: [] };
    }
    acc[raffleId].tickets.push(ticket);
    return acc;
  }, {} as Record<string, { raffle: typeof tickets[0]['raffles']; tickets: typeof tickets }>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Mis Boletos</h1>
          <p className="text-muted-foreground">
            Consulta y descarga tus boletos con código QR
          </p>
        </div>

        {/* Email Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Ingresa tu email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-12"
              />
              <Button onClick={handleSearch} size="lg" className="px-6">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !searchEmail ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Ingresa tu email para ver tus boletos
              </p>
            </CardContent>
          </Card>
        ) : !tickets?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron boletos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Verifica que el email sea correcto
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.values(groupedTickets || {}).map(({ raffle, tickets: raffleTickets }, index) => (
              <motion.div
                key={raffle?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  {/* Raffle Header */}
                  <div 
                    className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b cursor-pointer hover:from-primary/10 hover:to-primary/15 transition-colors"
                    onClick={() => navigate(`/r/${raffle?.slug}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{raffle?.title}</h3>
                          <Badge 
                            variant={raffle?.status === 'active' ? 'default' : 'secondary'}
                            className="shrink-0"
                          >
                            {raffle?.status === 'active' ? 'Activo' : 
                             raffle?.status === 'completed' ? 'Finalizado' : raffle?.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {raffle?.prize_name}
                          </span>
                          {raffle?.draw_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(raffle.draw_date), "dd MMM yyyy", { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </div>

                  {/* Tickets Grid */}
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {raffleTickets.map(t => {
                        const isConfirmed = t.status === 'sold';
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTicket({ ticket: t, raffle })}
                            className={`
                              relative p-4 rounded-xl border-2 text-left transition-all
                              hover:scale-[1.02] hover:shadow-md active:scale-[0.98]
                              ${isConfirmed 
                                ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50' 
                                : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                              }
                            `}
                          >
                            {/* QR Icon */}
                            <div className="absolute top-2 right-2">
                              <QrCode className={`w-4 h-4 ${isConfirmed ? 'text-emerald-500' : 'text-amber-500'}`} />
                            </div>

                            {/* Ticket Number */}
                            <p className="text-xl font-bold">#{t.ticket_number}</p>
                            
                            {/* Status */}
                            <p className={`text-xs font-medium mt-1 ${isConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {isConfirmed ? 'Confirmado' : 'Pendiente'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
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
                {/* QR Code for quick verification */}
                {selectedTicket.ticket.status !== 'sold' && (
                  <div className="text-center">
                    <TicketQRCode
                      ticketId={selectedTicket.ticket.id}
                      ticketNumber={selectedTicket.ticket.ticket_number}
                      raffleSlug={selectedTicket.raffle?.slug || ''}
                      size={150}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Tu pago está pendiente de confirmación
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
                      currency_code: 'MXN',
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
