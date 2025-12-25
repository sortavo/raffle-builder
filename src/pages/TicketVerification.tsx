import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTicketVerification } from '@/hooks/useTicketVerification';
import { DownloadableTicket } from '@/components/ticket/DownloadableTicket';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  ShieldCheck,
  Shield,
  Building2,
  Sparkles,
  AlertCircle,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/currency-utils';

const statusConfig = {
  sold: {
    label: 'Confirmado',
    sublabel: 'Boleto válido y pagado',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    validity: 'VÁLIDO',
    validityColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  reserved: {
    label: 'Pendiente de Pago',
    sublabel: 'Reserva en espera de confirmación',
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    validity: 'PENDIENTE',
    validityColor: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  available: {
    label: 'Disponible',
    sublabel: 'Este boleto no ha sido vendido',
    icon: AlertCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    validity: 'NO ASIGNADO',
    validityColor: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  canceled: {
    label: 'Cancelado',
    sublabel: 'Este boleto fue cancelado',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    validity: 'INVÁLIDO',
    validityColor: 'text-red-600 bg-red-50 border-red-200',
  },
};

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-padding max-w-lg mx-auto py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function TicketVerification() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { data: ticket, isLoading, error } = useTicketVerification(ticketId);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Boleto no encontrado</h1>
                <p className="text-muted-foreground mt-1">
                  El código QR no corresponde a ningún boleto válido o el enlace es incorrecto.
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
        </motion.div>
      </div>
    );
  }

  const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.available;
  const StatusIcon = status.icon;
  const isWinner = ticket.raffle.winner_announced && 
                   ticket.raffle.winner_ticket_number === ticket.ticket_number;
  const isConfirmed = ticket.status === 'sold';

  return (
    <>
      <Helmet>
        <title>Verificar Boleto #{ticket.ticket_number} | Sortavo</title>
        <meta name="description" content={`Verificación del boleto #${ticket.ticket_number} para ${ticket.raffle.title}`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container-padding max-w-lg mx-auto py-4">
            <Link 
              to={`/r/${ticket.raffle.slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver sorteo completo
            </Link>
          </div>
        </div>

        <div className="container-padding max-w-lg mx-auto py-8 space-y-6">
          {/* Verification Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Sistema de Verificación</span>
            </div>
          </motion.div>

          {/* Winner Banner */}
          {isWinner && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-1"
            >
              <div className="relative bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 rounded-xl p-6 text-center overflow-hidden">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="inline-block"
                >
                  <PartyPopper className="w-12 h-12 mx-auto text-yellow-400 mb-3" />
                </motion.div>
                <h2 className="text-2xl font-bold text-yellow-400">¡BOLETO GANADOR!</h2>
                <p className="text-yellow-200/80 mt-1">
                  Este boleto ha sido seleccionado como ganador del sorteo
                </p>
                <Sparkles className="absolute top-4 left-4 w-5 h-5 text-amber-400/40" />
                <Sparkles className="absolute bottom-4 right-4 w-5 h-5 text-yellow-400/40" />
              </div>
            </motion.div>
          )}

          {/* Ticket Number + Validity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden border-2 border-primary/20">
              <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/85 px-6 py-8 text-center">
                <div className="inline-flex items-center gap-2 bg-primary-foreground/20 rounded-full px-3 py-1 mb-3">
                  <Ticket className="w-4 h-4 text-primary-foreground" />
                  <span className="text-xs text-primary-foreground font-medium uppercase tracking-wider">
                    Número de Boleto
                  </span>
                </div>
                <p className="text-5xl md:text-6xl font-bold text-primary-foreground tracking-tight mb-4">
                  #{ticket.ticket_number}
                </p>
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 border ${status.validityColor} font-bold text-sm`}>
                  <Shield className="w-4 h-4" />
                  {status.validity}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={`border-2 ${status.borderColor}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full ${status.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-7 h-7 ${status.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-lg ${status.color}`}>{status.label}</p>
                    <p className="text-sm text-muted-foreground">{status.sublabel}</p>
                    {ticket.status === 'sold' && ticket.approved_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Confirmado el {format(new Date(ticket.approved_at), "dd 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Raffle Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Información del Sorteo
                </h4>
                
                <div className="flex items-start gap-4 mb-4">
                  {ticket.raffle.prize_images?.[0] ? (
                    <img 
                      src={ticket.raffle.prize_images[0]} 
                      alt={ticket.raffle.prize_name}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg leading-tight mb-1">{ticket.raffle.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{ticket.raffle.prize_name}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {formatCurrency(ticket.raffle.ticket_price, ticket.raffle.currency_code || 'MXN')}
                      </Badge>
                      <Badge variant="outline">
                        {ticket.raffle.status === 'active' ? 'Activo' : 
                         ticket.raffle.status === 'completed' ? 'Finalizado' : 
                         ticket.raffle.status === 'paused' ? 'Pausado' : ticket.raffle.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {ticket.raffle.draw_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>
                      <span className="font-medium text-foreground">Fecha del sorteo:</span>{' '}
                      {format(new Date(ticket.raffle.draw_date), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Buyer Info */}
          {(ticket.buyer_name || ticket.buyer_email) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Datos del Comprador
                  </h4>
                  <div className="space-y-3">
                    {ticket.buyer_name && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Nombre completo</p>
                          <p className="font-medium">{ticket.buyer_name}</p>
                        </div>
                      </div>
                    )}
                    {ticket.buyer_email && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Correo electrónico</p>
                          <p className="font-medium text-muted-foreground">
                            {ticket.buyer_email.replace(/(.{3})(.*)(@.*)/, '$1***$3')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* History / Timestamps */}
          {(ticket.reserved_at || ticket.sold_at || ticket.approved_at) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historial del Boleto
                  </h4>
                  <div className="space-y-3">
                    {ticket.approved_at && (
                      <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm">Pago confirmado</span>
                        </div>
                        <span className="text-sm font-medium">
                          {format(new Date(ticket.approved_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                    )}
                    {ticket.sold_at && (
                      <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-primary" />
                          <span className="text-sm">Boleto vendido</span>
                        </div>
                        <span className="text-sm font-medium">
                          {format(new Date(ticket.sold_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                    )}
                    {ticket.reserved_at && (
                      <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-sm">Reservado</span>
                        </div>
                        <span className="text-sm font-medium">
                          {format(new Date(ticket.reserved_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Organization */}
          {ticket.organization && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Organizador
                  </h4>
                  <div className="flex items-center gap-4">
                    {ticket.organization.logo_url ? (
                      <img 
                        src={ticket.organization.logo_url}
                        alt={ticket.organization.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">{ticket.organization.name}</p>
                      <div className="flex items-center gap-1 text-sm text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Organizador verificado</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Downloadable Ticket */}
          {isConfirmed && ticket.buyer_name && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Separator className="my-6" />
              <h4 className="font-semibold text-center mb-4">Tu Boleto Digital</h4>
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

          {/* Verification ID */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center pt-4"
          >
            <p className="text-xs text-muted-foreground">
              ID de verificación: <span className="font-mono">{ticket.id}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Verificado el {format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}