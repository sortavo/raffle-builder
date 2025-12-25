import { useParams, Link } from 'react-router-dom';
import { useTicketVerification } from '@/hooks/useTicketVerification';
import { DownloadableTicket } from '@/components/ticket/DownloadableTicket';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Ticket, 
  Trophy,
  Calendar,
  User,
  Mail,
  ArrowLeft,
  PartyPopper,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

const statusConfig = {
  sold: {
    label: 'Confirmado',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  reserved: {
    label: 'Pendiente de Pago',
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  available: {
    label: 'Disponible',
    icon: Ticket,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20',
  },
  canceled: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
};

export default function TicketVerification() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { data: ticket, isLoading, error } = useTicketVerification(ticketId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando boleto...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Boleto no encontrado</h1>
              <p className="text-muted-foreground mt-1">
                El código QR no corresponde a ningún boleto válido.
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.available;
  const StatusIcon = status.icon;
  const isWinner = ticket.raffle.winner_announced && 
                   ticket.raffle.winner_ticket_number === ticket.ticket_number;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back button */}
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to={`/r/${ticket.raffle.slug}`}>
            <ArrowLeft className="w-4 h-4" />
            Ver sorteo
          </Link>
        </Button>

        {/* Verification Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-medium">Boleto Verificado</span>
          </div>
          <h1 className="text-2xl font-bold">#{ticket.ticket_number}</h1>
        </motion.div>

        {/* Winner Banner */}
        {isWinner && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-1"
          >
            <div className="bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 rounded-xl p-6 text-center">
              <PartyPopper className="w-12 h-12 mx-auto text-yellow-400 mb-3" />
              <h2 className="text-2xl font-bold text-yellow-400">¡BOLETO GANADOR!</h2>
              <p className="text-yellow-200/80 mt-1">
                Este boleto ha sido seleccionado como ganador del sorteo
              </p>
            </div>
          </motion.div>
        )}

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`border-2 ${status.borderColor}`}>
            <CardContent className="pt-6">
              <div className={`flex items-center gap-3 ${status.bgColor} ${status.color} p-4 rounded-xl`}>
                <StatusIcon className="w-6 h-6" />
                <div>
                  <p className="font-semibold">{status.label}</p>
                  {ticket.status === 'sold' && ticket.approved_at && (
                    <p className="text-sm opacity-80">
                      Confirmado el {format(new Date(ticket.approved_at), "dd MMM yyyy", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Ticket Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Raffle Info */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {ticket.raffle.prize_images?.[0] ? (
                    <img 
                      src={ticket.raffle.prize_images[0]} 
                      alt={ticket.raffle.prize_name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{ticket.raffle.title}</h3>
                    <p className="text-sm text-muted-foreground">{ticket.raffle.prize_name}</p>
                    <Badge variant="outline" className="mt-1">
                      {ticket.raffle.status === 'active' ? 'Activo' : 
                       ticket.raffle.status === 'completed' ? 'Finalizado' : ticket.raffle.status}
                    </Badge>
                  </div>
                </div>

                {ticket.raffle.draw_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Sorteo: {format(new Date(ticket.raffle.draw_date), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Buyer Info */}
              {ticket.buyer_name && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Comprador</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{ticket.buyer_name}</span>
                    </div>
                    {ticket.buyer_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {ticket.buyer_email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Organization */}
              {ticket.organization && (
                <div className="flex items-center gap-3">
                  {ticket.organization.logo_url ? (
                    <img 
                      src={ticket.organization.logo_url}
                      alt={ticket.organization.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Organizado por</p>
                    <p className="font-medium">{ticket.organization.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Downloadable Ticket - Only for confirmed tickets */}
        {ticket.status === 'sold' && ticket.buyer_name && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DownloadableTicket
              ticket={{
                id: ticket.id,
                ticket_number: ticket.ticket_number,
                buyer_name: ticket.buyer_name,
                buyer_email: ticket.buyer_email || '',
                status: ticket.status,
              }}
              raffle={{
                title: ticket.raffle.title,
                slug: ticket.raffle.slug,
                prize_name: ticket.raffle.prize_name,
                prize_images: ticket.raffle.prize_images || undefined,
                draw_date: ticket.raffle.draw_date || '',
                ticket_price: ticket.raffle.ticket_price,
                currency_code: ticket.raffle.currency_code || 'MXN',
              }}
              organization={ticket.organization || undefined}
            />
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          ID de verificación: {ticket.id}
        </p>
      </div>
    </div>
  );
}
