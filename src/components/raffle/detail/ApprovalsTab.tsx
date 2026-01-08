import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  XCircle, 
  MessageCircle, 
  Clock,
  User,
  Phone,
  Mail,
  AlertTriangle,
  Timer,
  ShieldAlert,
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  Ticket,
  ExternalLink,
  DollarSign,
  Loader2
} from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { useBuyers } from '@/hooks/useBuyers';
import { useEmails } from '@/hooks/useEmails';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ProtectedAction } from '@/components/auth/ProtectedAction';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { notifyPaymentApproved, notifyPaymentRejected } from '@/lib/notifications';
import { formatCurrency } from '@/lib/currency-utils';

interface ApprovalsTabProps {
  raffleId: string;
  raffleTitle?: string;
  raffleSlug?: string;
  ticketPrice?: number;
  currencyCode?: string;
}

interface OrderGroup {
  referenceCode: string;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  tickets: any[];
  reservedUntil: string | null;
  hasProof: boolean;
  proofUrl: string | null;
  orderTotal: number | null;
}

export function ApprovalsTab({ raffleId, raffleTitle = '', raffleSlug = '', ticketPrice = 0, currencyCode = 'MXN' }: ApprovalsTabProps) {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { useTicketsList, approveTicket, rejectTicket, extendReservation, bulkApprove, bulkReject, approveByReference } = useTickets(raffleId);
  const { getWhatsAppLink } = useBuyers(raffleId);
  const { sendApprovedEmail, sendRejectedEmail, sendBulkApprovedEmail } = useEmails();
  
  const { data: ticketsData, isLoading, refetch } = useTicketsList({
    status: 'reserved',
    pageSize: 100,
  });

  const reservedTickets = ticketsData?.tickets || [];

  const { data: rafflePackages = [] } = useQuery({
    queryKey: ['raffle-packages', raffleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raffle_packages')
        .select('quantity, price')
        .eq('raffle_id', raffleId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const orderGroups = useMemo(() => {
    const groups: Record<string, OrderGroup> = {};
    
    reservedTickets.forEach(ticket => {
      const refCode = ticket.payment_reference || `no-ref-${ticket.id}`;
      
      if (!groups[refCode]) {
        groups[refCode] = {
          referenceCode: ticket.payment_reference || 'Sin código',
          buyerName: ticket.buyer_name,
          buyerPhone: ticket.buyer_phone,
          buyerEmail: ticket.buyer_email,
          tickets: [],
          reservedUntil: ticket.reserved_until,
          hasProof: !!ticket.payment_proof_url,
          proofUrl: ticket.payment_proof_url,
          orderTotal: ticket.order_total ?? null,
        };
      }
      
      groups[refCode].tickets.push(ticket);
      
      // Update proof status if any ticket has proof
      if (ticket.payment_proof_url) {
        groups[refCode].hasProof = true;
        groups[refCode].proofUrl = ticket.payment_proof_url;
      }
      
      // Capture order_total from any ticket if not already set
      if (ticket.order_total && !groups[refCode].orderTotal) {
        groups[refCode].orderTotal = ticket.order_total;
      }
    });
    
    return Object.values(groups);
  }, [reservedTickets]);

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orderGroups;
    
    const query = searchQuery.toLowerCase().trim();
    return orderGroups.filter(order => 
      order.referenceCode.toLowerCase().includes(query) ||
      order.buyerName?.toLowerCase().includes(query) ||
      order.buyerPhone?.includes(query) ||
      order.buyerEmail?.toLowerCase().includes(query) ||
      order.tickets.some(t => t.ticket_number?.toLowerCase().includes(query))
    );
  }, [orderGroups, searchQuery]);

  // Split orders by payment proof
  const ordersWithoutProof = filteredOrders.filter(o => !o.hasProof);
  const ordersWithProof = filteredOrders.filter(o => o.hasProof);

  const getTimeRemaining = (reservedUntil: string | null) => {
    if (!reservedUntil) return null;
    const remaining = new Date(reservedUntil).getTime() - Date.now();
    if (remaining <= 0) return 'Expirado';
    
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Background notifications - separated from main flow
  const sendApprovalNotificationsInBackground = async (order: OrderGroup, ticketNumbers: string[]) => {
    try {
      if (order.buyerEmail && order.buyerName) {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', order.buyerEmail)
          .maybeSingle();
        
        if (buyerProfile?.id) {
          notifyPaymentApproved(
            buyerProfile.id,
            raffleTitle,
            ticketNumbers
          ).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Background notification error:', error);
    }
  };

  const handleApproveOrder = async (order: OrderGroup) => {
    const ticketIds = order.tickets.map(t => t.id);
    const ticketNumbers = order.tickets.map(t => t.ticket_number);
    
    // Set processing state
    setProcessingOrders(prev => new Set(prev).add(order.referenceCode));
    
    try {
      // Main operation - approval
      await bulkApprove.mutateAsync({ 
        ticketIds, 
        raffleTitle, 
        raffleSlug 
      });
      
      // Immediately invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] }),
        queryClient.invalidateQueries({ queryKey: ['raffle-stats'] }),
        refetch(),
      ]);
      
      // Background notifications - don't block UI
      sendApprovalNotificationsInBackground(order, ticketNumbers);
      
    } catch (error) {
      console.error('Approval error:', error);
      toast({ title: 'Error al aprobar', variant: 'destructive' });
    } finally {
      setProcessingOrders(prev => {
        const next = new Set(prev);
        next.delete(order.referenceCode);
        return next;
      });
    }
  };

  const handleRejectOrder = async (order: OrderGroup) => {
    const ticketIds = order.tickets.map(t => t.id);
    const ticketNumbers = order.tickets.map(t => t.ticket_number);
    
    setProcessingOrders(prev => new Set(prev).add(order.referenceCode));
    
    try {
      await bulkReject.mutateAsync(ticketIds);
      
      // Immediately invalidate and refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] }),
        queryClient.invalidateQueries({ queryKey: ['raffle-stats'] }),
        refetch(),
      ]);
      
      toast({ 
        title: `${ticketIds.length} boletos rechazados`,
        description: `Pedido ${order.referenceCode}`,
      });
      
      // Background notifications
      if (order.buyerEmail && order.buyerName) {
        sendRejectedEmail({
          to: order.buyerEmail,
          buyerName: order.buyerName,
          ticketNumbers,
          raffleTitle,
          raffleSlug,
          rejectionReason: 'El pago no fue verificado correctamente',
        }).catch(console.error);
        
        (async () => {
          try {
            const { data: buyerProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', order.buyerEmail!)
              .maybeSingle();
            
            if (buyerProfile?.id) {
              await notifyPaymentRejected(
                buyerProfile.id,
                raffleTitle,
                ticketNumbers,
                'El pago no fue verificado correctamente'
              );
            }
          } catch (e) {
            console.error('Background rejection notification error:', e);
          }
        })();
      }
    } catch (error) {
      toast({ title: 'Error al rechazar', variant: 'destructive' });
    } finally {
      setProcessingOrders(prev => {
        const next = new Set(prev);
        next.delete(order.referenceCode);
        return next;
      });
    }
  };

  const handleExtendOrder = async (order: OrderGroup) => {
    try {
      // Extend all tickets in the order
      for (const ticket of order.tickets) {
        await extendReservation.mutateAsync({ ticketId: ticket.id, minutes: 30 });
      }
      toast({ title: `Reservación extendida 30 minutos para ${order.tickets.length} boletos` });
      refetch();
    } catch (error) {
      toast({ title: 'Error al extender', variant: 'destructive' });
    }
  };

  const toggleOrderExpanded = (refCode: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(refCode)) {
        next.delete(refCode);
      } else {
        next.add(refCode);
      }
      return next;
    });
  };

  const OrderCard = ({ order, showProof }: { order: OrderGroup; showProof: boolean }) => {
    const timeRemaining = getTimeRemaining(order.reservedUntil);
    const isExpired = timeRemaining === 'Expirado';
    const isExpanded = expandedOrders.has(order.referenceCode);
    const isProcessing = processingOrders.has(order.referenceCode);
    const ticketCount = order.tickets.length;
    const unitTotal = ticketCount * ticketPrice;
    const packagePrice = (rafflePackages as any[]).find(p => p.quantity === ticketCount)?.price;
    const packageTotal = packagePrice != null ? Number(packagePrice) : unitTotal;

    // Use saved orderTotal (with discount) if available, otherwise package pricing, otherwise unit pricing
    const totalAmount = order.orderTotal ?? packageTotal;

    return (
      <Card className={cn(
        'transition-all',
        isExpired && 'border-destructive/50'
      )}>
        <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0",
                showProof ? "bg-amber-500/10" : "bg-muted"
              )}>
                <Package className={cn(
                  "h-3.5 w-3.5 sm:h-4 sm:w-4",
                  showProof ? "text-amber-600" : "text-muted-foreground"
                )} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-xs sm:text-sm truncate">{order.referenceCode}</span>
                  <Badge variant="outline" className="font-mono text-[10px] sm:text-xs shrink-0">
                    {ticketCount} boleto{ticketCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-[10px] sm:text-xs',
                  isExpired ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  <Timer className="h-3 w-3 shrink-0" />
                  <span>{timeRemaining || 'Sin fecha'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Info */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-3 sm:gap-y-1 text-xs sm:text-sm">
            {order.buyerName && (
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{order.buyerName}</span>
              </div>
            )}
            {order.buyerPhone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{order.buyerPhone}</span>
              </div>
            )}
            {order.buyerEmail && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">{order.buyerEmail}</span>
              </div>
            )}
          </div>

          {/* Ticket Numbers - Collapsible */}
          <Collapsible open={isExpanded} onOpenChange={() => toggleOrderExpanded(order.referenceCode)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-2 py-1.5 h-auto bg-muted/50 hover:bg-muted">
                <div className="flex items-center gap-2">
                  <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    {ticketCount <= 6 
                      ? order.tickets.map(t => `#${t.ticket_number}`).join(', ')
                      : `${order.tickets.slice(0, 4).map(t => `#${t.ticket_number}`).join(', ')} +${ticketCount - 4} más`
                    }
                  </span>
                </div>
                {ticketCount > 6 && (
                  isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap gap-1 px-2">
                {order.tickets.map(ticket => (
                  <Badge 
                    key={ticket.id} 
                    variant="outline" 
                    className="font-mono text-xs px-1.5 py-0"
                  >
                    #{ticket.ticket_number}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Total Amount */}
          {ticketPrice > 0 && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Total: {formatCurrency(totalAmount, currencyCode)}
              </span>
            </div>
          )}

          {/* Payment Proof */}
          {showProof && order.proofUrl && (
            <div className="relative">
              <a 
                href={order.proofUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block relative aspect-video max-h-40 rounded-md overflow-hidden bg-muted group"
              >
                <img 
                  src={order.proofUrl} 
                  alt="Comprobante de pago" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="h-5 w-5 text-white" />
                </div>
              </a>
            </div>
          )}

          {!showProof && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Esperando comprobante de pago</span>
            </div>
          )}

          {/* Actions */}
          <TooltipProvider>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t">
              <div className="flex gap-2 flex-1">
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => handleApproveOrder(order)}
                  disabled={isProcessing || bulkApprove.isPending}
                  className="flex-1 h-8 sm:h-9 text-xs sm:text-sm gap-1"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  <span className="truncate">Aprobar{ticketCount > 1 ? ` (${ticketCount})` : ''}</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRejectOrder(order)}
                  disabled={isProcessing || bulkReject.isPending}
                  className="flex-1 h-8 sm:h-9 text-xs sm:text-sm gap-1 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  <span className="truncate">Rechazar</span>
                </Button>
              </div>
              <div className="flex gap-2 justify-center">
                {order.buyerPhone && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="outline"
                        asChild
                        className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                      >
                        <a 
                          href={getWhatsAppLink(order.buyerPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>WhatsApp</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => handleExtendOrder(order)}
                      disabled={extendReservation.isPending}
                      className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Extender 30 min</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((j) => (
                <div key={j} className="h-48 bg-muted animate-pulse rounded" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <ProtectedAction
      resource="ticket"
      action="approve"
      showAlert
      fallback={
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Solo administradores pueden aprobar pagos. Contacta al propietario de la organización.
          </AlertDescription>
        </Alert>
      }
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o boleto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
          {searchQuery && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs">
              {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span>{orderGroups.length} pedido{orderGroups.length !== 1 ? 's' : ''} pendiente{orderGroups.length !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{reservedTickets.length} boleto{reservedTickets.length !== 1 ? 's' : ''} total</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Without Proof Column */}
          <div className="space-y-3 sm:space-y-4">
            <Card className="border-amber-500/30">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Sin Comprobante ({ordersWithoutProof.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2.5 sm:space-y-4">
                {ordersWithoutProof.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm">No hay pedidos sin comprobante</p>
                  </div>
                ) : (
                  ordersWithoutProof.map((order) => (
                    <OrderCard
                      key={order.referenceCode}
                      order={order}
                      showProof={false}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* With Proof Column */}
          <div className="space-y-3 sm:space-y-4">
            <Card className="border-emerald-500/30">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Con Comprobante ({ordersWithProof.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2.5 sm:space-y-4">
                {ordersWithProof.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm">No hay comprobantes pendientes</p>
                  </div>
                ) : (
                  ordersWithProof.map((order) => (
                    <OrderCard
                      key={order.referenceCode}
                      order={order}
                      showProof={true}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedAction>
  );
}
