import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  Ticket,
  ExternalLink,
  DollarSign,
  Loader2,
  Gift,
  Inbox,
  Filter,
  CheckCheck,
  X
} from 'lucide-react';
import { usePendingOrders } from '@/hooks/usePendingOrders';
import { useEmails } from '@/hooks/useEmails';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { notifyPaymentApproved } from '@/lib/notifications';
import { formatCurrency } from '@/lib/currency-utils';

export default function Approvals() {
  const { organization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRaffle, setSelectedRaffle] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendRejectedEmail } = useEmails();
  
  const { raffles, totalOrders, totalTickets, isLoading, refetch } = usePendingOrders(
    selectedRaffle !== 'all' ? selectedRaffle : undefined
  );

  // Flatten all orders for filtering
  const allOrders = useMemo(() => {
    return raffles.flatMap(r => r.orders);
  }, [raffles]);

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return allOrders;
    
    const query = searchQuery.toLowerCase().trim();
    return allOrders.filter(order => 
      order.referenceCode.toLowerCase().includes(query) ||
      order.buyerName?.toLowerCase().includes(query) ||
      order.buyerPhone?.includes(query) ||
      order.buyerEmail?.toLowerCase().includes(query) ||
      order.tickets.some(t => t.ticket_number?.toLowerCase().includes(query))
    );
  }, [allOrders, searchQuery]);

  // Selection handlers
  const toggleOrderSelection = (refCode: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(refCode)) {
        next.delete(refCode);
      } else {
        next.add(refCode);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedOrders(new Set(filteredOrders.map(o => o.referenceCode)));
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  const selectedOrdersData = useMemo(() => {
    return filteredOrders.filter(o => selectedOrders.has(o.referenceCode));
  }, [filteredOrders, selectedOrders]);

  const selectedTicketsCount = useMemo(() => {
    return selectedOrdersData.reduce((sum, o) => sum + o.tickets.length, 0);
  }, [selectedOrdersData]);

  // Bulk approval
  const handleBulkApprove = async () => {
    if (selectedOrdersData.length === 0) return;
    
    setIsBulkProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const order of selectedOrdersData) {
      try {
        const { error } = await supabase
          .from('sold_tickets')
          .update({ status: 'sold' })
          .eq('raffle_id', order.raffleId)
          .eq('payment_reference', order.referenceCode);

        if (error) throw error;
        successCount++;

        // Background notification
        if (order.buyerEmail) {
          try {
            const { data: buyerProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', order.buyerEmail)
              .maybeSingle();
            
            if (buyerProfile?.id) {
              notifyPaymentApproved(
                buyerProfile.id,
                order.raffleTitle,
                order.tickets.map((t: any) => t.ticket_number)
              ).catch(console.error);
            }
          } catch (e) {
            console.error('Notification error:', e);
          }
        }
      } catch (error) {
        console.error('Bulk approval error:', error);
        errorCount++;
      }
    }

    // Invalidate queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pending-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] }),
      queryClient.invalidateQueries({ queryKey: ['tickets'] }),
      queryClient.invalidateQueries({ queryKey: ['ticket-stats'] }),
      refetch(),
    ]);

    clearSelection();
    setIsBulkProcessing(false);

    toast({ 
      title: `✓ ${successCount} pedidos aprobados`,
      description: errorCount > 0 ? `${errorCount} fallaron` : undefined,
    });
  };

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

  const handleApproveOrder = async (order: any) => {
    setProcessingOrders(prev => new Set(prev).add(order.referenceCode));
    
    try {
      // Update all tickets with this payment_reference to 'sold'
      const { error } = await supabase
        .from('sold_tickets')
        .update({ status: 'sold' })
        .eq('raffle_id', order.raffleId)
        .eq('payment_reference', order.referenceCode);

      if (error) throw error;

      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] }),
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-stats'] }),
        refetch(),
      ]);

      toast({ 
        title: `✓ Pedido aprobado`,
        description: `${order.tickets.length} boletos de ${order.raffleTitle}`,
      });

      // Background notification
      if (order.buyerEmail) {
        try {
          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', order.buyerEmail)
            .maybeSingle();
          
          if (buyerProfile?.id) {
            notifyPaymentApproved(
              buyerProfile.id,
              order.raffleTitle,
              order.tickets.map((t: any) => t.ticket_number)
            ).catch(console.error);
          }
        } catch (e) {
          console.error('Notification error:', e);
        }
      }
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

  const handleRejectOrder = async (order: any) => {
    setProcessingOrders(prev => new Set(prev).add(order.referenceCode));
    
    try {
      const ticketIds = order.tickets.map((t: any) => t.id);
      
      // Reset tickets to available
      const { error } = await supabase
        .from('sold_tickets')
        .delete()
        .in('id', ticketIds);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] }),
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-stats'] }),
        refetch(),
      ]);

      toast({ 
        title: `${ticketIds.length} boletos rechazados`,
        description: `Pedido ${order.referenceCode}`,
      });

      // Background notification
      if (order.buyerEmail && order.buyerName) {
        sendRejectedEmail({
          to: order.buyerEmail,
          buyerName: order.buyerName,
          ticketNumbers: order.tickets.map((t: any) => t.ticket_number),
          raffleTitle: order.raffleTitle,
          raffleSlug: order.raffleSlug,
          rejectionReason: 'El pago no fue verificado correctamente',
        }).catch(console.error);
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

  const OrderCard = ({ order, showProof }: { order: any; showProof: boolean }) => {
    const timeRemaining = getTimeRemaining(order.reservedUntil);
    const isExpired = timeRemaining === 'Expirado';
    const isExpanded = expandedOrders.has(order.referenceCode);
    const isProcessing = processingOrders.has(order.referenceCode);
    const isSelected = selectedOrders.has(order.referenceCode);
    const ticketCount = order.tickets.length;
    const totalAmount = order.orderTotal ?? (ticketCount * order.ticketPrice);

    return (
      <Card className={cn(
        'transition-all',
        isExpired && 'border-destructive/50',
        isSelected && 'ring-2 ring-primary border-primary'
      )}>
        <CardContent className="p-3 sm:p-4 space-y-2.5">
          {/* Header with Checkbox and Raffle Info */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleOrderSelection(order.referenceCode)}
                className="shrink-0"
              />
              <div className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                showProof ? "bg-amber-500/10" : "bg-muted"
              )}>
                <Package className={cn(
                  "h-3.5 w-3.5",
                  showProof ? "text-amber-600" : "text-muted-foreground"
                )} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono font-semibold text-xs truncate">{order.referenceCode}</span>
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                    {ticketCount} boleto{ticketCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Gift className="h-3 w-3 shrink-0" />
                  <span className="truncate">{order.raffleTitle}</span>
                </div>
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-1 text-[10px] px-2 py-1 rounded-full',
              isExpired ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
            )}>
              <Timer className="h-3 w-3" />
              <span>{timeRemaining || 'Sin fecha'}</span>
            </div>
          </div>

          {/* Buyer Info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {order.buyerName && (
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{order.buyerName}</span>
              </div>
            )}
            {order.buyerPhone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{order.buyerPhone}</span>
              </div>
            )}
            {order.buyerEmail && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail className="h-3 w-3 text-muted-foreground" />
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
                    {ticketCount <= 4 
                      ? order.tickets.map((t: any) => `#${t.ticket_number}`).join(', ')
                      : `${order.tickets.slice(0, 3).map((t: any) => `#${t.ticket_number}`).join(', ')} +${ticketCount - 3} más`
                    }
                  </span>
                </div>
                {ticketCount > 4 && (
                  isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap gap-1 px-2">
                {order.tickets.map((ticket: any) => (
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
          {order.ticketPrice > 0 && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Total: {formatCurrency(totalAmount, order.currencyCode)}
              </span>
            </div>
          )}

          {/* Payment Proof */}
          {showProof && order.proofUrl && (
            <a 
              href={order.proofUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block relative aspect-video max-h-32 rounded-md overflow-hidden bg-muted group"
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
          )}

          {!showProof && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Esperando comprobante de pago</span>
            </div>
          )}

          {/* Actions */}
          <TooltipProvider>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button 
                size="sm" 
                variant="default"
                onClick={() => handleApproveOrder(order)}
                disabled={isProcessing}
                className="flex-1 h-8 text-xs gap-1"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Aprobar
              </Button>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectOrder(order)}
                    disabled={isProcessing}
                    className="h-8 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rechazar pedido</TooltipContent>
              </Tooltip>

              {order.buyerPhone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${order.buyerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Contactar por WhatsApp</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Aprobaciones</h1>
            <p className="text-muted-foreground text-sm">
              Gestiona los pagos pendientes de todas tus rifas
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg">
              <Package className="h-4 w-4" />
              <span className="font-semibold">{totalOrders}</span>
              <span className="text-sm">pedidos</span>
            </div>
            <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{totalTickets}</span>
              <span className="text-sm text-muted-foreground">boletos</span>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.size > 0 && (
          <div className="sticky top-0 z-10 bg-primary text-primary-foreground rounded-lg p-3 flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <CheckCheck className="h-5 w-5" />
              <span className="font-medium">
                {selectedOrders.size} pedido{selectedOrders.size !== 1 ? 's' : ''} seleccionado{selectedOrders.size !== 1 ? 's' : ''}
              </span>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {selectedTicketsCount} boletos
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBulkApprove}
                disabled={isBulkProcessing}
                className="bg-white text-primary hover:bg-white/90"
              >
                {isBulkProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Aprobar todos
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nombre, teléfono o boleto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedRaffle} onValueChange={setSelectedRaffle}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por rifa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las rifas</SelectItem>
              {raffles.map(raffle => (
                <SelectItem key={raffle.id} value={raffle.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{raffle.title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {raffle.pendingCount}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Sin pedidos pendientes</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {searchQuery 
                  ? 'No se encontraron pedidos que coincidan con tu búsqueda'
                  : 'Cuando los compradores reserven boletos, aparecerán aquí para aprobar sus pagos'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Orders Grid */}
        {filteredOrders.length > 0 && (
          <>
            {/* Select All Button */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={selectedOrders.size === filteredOrders.length ? clearSelection : selectAllVisible}
                className="text-xs"
              >
                <Checkbox
                  checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                  className="mr-2 pointer-events-none"
                />
                {selectedOrders.size === filteredOrders.length ? 'Deseleccionar todos' : `Seleccionar todos (${filteredOrders.length})`}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Without Proof */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold">Sin Comprobante</h2>
                  <Badge variant="outline">{ordersWithoutProof.length}</Badge>
                </div>
                
                {ordersWithoutProof.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      No hay pedidos esperando comprobante
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {ordersWithoutProof.map(order => (
                      <OrderCard key={order.referenceCode} order={order} showProof={false} />
                    ))}
                  </div>
                )}
              </div>

              {/* With Proof */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h2 className="font-semibold">Con Comprobante</h2>
                  <Badge variant="outline">{ordersWithProof.length}</Badge>
                </div>
                
                {ordersWithProof.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      No hay pedidos con comprobante adjunto
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {ordersWithProof.map(order => (
                      <OrderCard key={order.referenceCode} order={order} showProof={true} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
