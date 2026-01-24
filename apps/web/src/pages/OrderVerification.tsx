import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useOrderVerification } from '@/hooks/useOrderVerification';
import { useOrderReceipt } from '@/hooks/useOrderReceipt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, CheckCircle2, Clock, AlertCircle, Ticket, Trophy, 
  Calendar, User, Mail, Phone, MapPin, FileDown, ExternalLink,
  Hash, CreditCard, Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency-utils';
import { motion } from 'framer-motion';

export default function OrderVerification() {
  const { referenceCode } = useParams<{ referenceCode: string }>();
  const { data, isLoading, error } = useOrderVerification(referenceCode);
  const { generateOrderReceipt, isGenerating } = useOrderReceipt();

  // Get order status
  const getOrderStatus = () => {
    if (!data?.tickets) return { label: 'Desconocido', color: 'secondary', icon: AlertCircle };
    
    const confirmedCount = data.tickets.filter(t => t.status === 'sold').length;
    const total = data.tickets.length;
    
    if (confirmedCount === total) {
      return { label: 'Confirmado', color: 'success', icon: CheckCircle2 };
    } else if (confirmedCount > 0) {
      return { label: 'Parcialmente Confirmado', color: 'warning', icon: Clock };
    }
    return { label: 'Pendiente', color: 'warning', icon: Clock };
  };

  const handleDownloadReceipt = () => {
    if (!data) return;
    
    generateOrderReceipt({
      tickets: data.tickets,
      raffle: data.raffle,
      organization: data.organization,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando orden...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Orden no encontrada</h1>
            <p className="text-muted-foreground mb-6">
              No se encontró ninguna orden con la referencia <strong className="font-mono">{referenceCode}</strong>
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/my-tickets">Buscar mis boletos</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link to="/">Ir al inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = getOrderStatus();
  const StatusIcon = status.icon;
  const firstTicket = data.tickets[0];
  const orderTotal = firstTicket.order_total || (data.tickets.length * data.raffle.ticket_price);
  const currency = data.raffle.currency_code || 'MXN';

  return (
    <>
      <Helmet>
        <title>Verificación de Orden {referenceCode} | {data.organization?.name || 'Sortavo'}</title>
        <meta name="description" content={`Verificación de orden de compra para ${data.raffle.title}`} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
        <div className="container mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <motion.div 
            className="text-center space-y-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent mb-2 shadow-lg shadow-primary/25">
              <Receipt className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Verificación de Orden</h1>
            <p className="text-muted-foreground font-mono text-lg">{referenceCode}</p>
          </motion.div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`border-2 ${
              status.color === 'success' ? 'border-success/50 bg-success/5' :
              status.color === 'warning' ? 'border-warning/50 bg-warning/5' :
              'border-border'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    status.color === 'success' ? 'bg-success/20 text-success' :
                    status.color === 'warning' ? 'bg-warning/20 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <StatusIcon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{status.label}</h2>
                    <p className="text-muted-foreground">
                      {data.tickets.length} boleto{data.tickets.length !== 1 ? 's' : ''} en esta orden
                    </p>
                  </div>
                  <Badge variant={status.color === 'success' ? 'default' : 'secondary'} className="text-sm">
                    {formatCurrency(orderTotal, currency)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Raffle Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-primary" />
                  Sorteo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{data.raffle.title}</h3>
                  <p className="text-muted-foreground">{data.raffle.prize_name}</p>
                </div>
                {data.raffle.draw_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Fecha del sorteo: {format(new Date(data.raffle.draw_date), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
                {data.organization && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Organizado por: <strong>{data.organization.name}</strong></span>
                  </div>
                )}
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <Link to={data.organization?.slug 
                    ? `/${data.organization.slug}/${data.raffle.slug}` 
                    : `/r/${data.raffle.slug}`}>
                    <ExternalLink className="w-4 h-4" />
                    Ver sorteo
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Buyer Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" />
                  Datos del Comprador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {firstTicket.buyer_name && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground text-xs">Nombre</p>
                        <p className="font-medium">{firstTicket.buyer_name}</p>
                      </div>
                    </div>
                  )}
                  {firstTicket.buyer_email && (
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground text-xs">Email</p>
                        <p className="font-medium break-all">{firstTicket.buyer_email}</p>
                      </div>
                    </div>
                  )}
                  {firstTicket.buyer_phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground text-xs">Teléfono</p>
                        <p className="font-medium">{firstTicket.buyer_phone}</p>
                      </div>
                    </div>
                  )}
                  {firstTicket.buyer_city && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground text-xs">Ciudad</p>
                        <p className="font-medium">{firstTicket.buyer_city}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Purchase Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Detalles de Compra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground text-xs">Referencia</p>
                      <p className="font-mono font-medium">{referenceCode}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ticket className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground text-xs">Boletos</p>
                      <p className="font-medium">{data.tickets.length}</p>
                    </div>
                  </div>
                  {firstTicket.reserved_at && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground text-xs">Fecha de reserva</p>
                        <p className="font-medium">
                          {format(new Date(firstTicket.reserved_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  )}
                  {firstTicket.sold_at && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                      <div>
                        <p className="text-muted-foreground text-xs">Confirmado</p>
                        <p className="font-medium">
                          {format(new Date(firstTicket.sold_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  )}
                  {firstTicket.payment_method && (
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground text-xs">Método de pago</p>
                        <p className="font-medium">{firstTicket.payment_method}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total pagado</span>
                  <span className="text-xl font-bold">{formatCurrency(orderTotal, currency)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Ticket Numbers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ticket className="w-5 h-5 text-primary" />
                  Números de Boleto ({data.tickets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {data.tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`text-center py-1.5 px-2 rounded text-sm font-mono ${
                          ticket.status === 'sold'
                            ? 'bg-success/10 text-success border border-success/30'
                            : 'bg-warning/10 text-warning border border-warning/30'
                        }`}
                      >
                        {ticket.ticket_number}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-success/20 border border-success/40" />
                    <span>Confirmado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-warning/20 border border-warning/40" />
                    <span>Pendiente</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Download Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Button 
              onClick={handleDownloadReceipt}
              disabled={isGenerating}
              className="w-full gap-2 h-12"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generando comprobante...
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5" />
                  Descargar Comprobante PDF
                </>
              )}
            </Button>
          </motion.div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Verificado en sortavo.com
          </p>
        </div>
      </div>
    </>
  );
}
