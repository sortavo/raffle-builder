import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  XCircle, 
  MessageCircle, 
  Clock,
  User,
  Phone,
  Mail,
  Image,
  AlertCircle,
  Timer,
  ShieldAlert,
  Search,
  Hash,
  CheckCheck
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

interface ApprovalsTabProps {
  raffleId: string;
  raffleTitle?: string;
  raffleSlug?: string;
}

export function ApprovalsTab({ raffleId, raffleTitle = '', raffleSlug = '' }: ApprovalsTabProps) {
  const { role } = useAuth();
  const [selectedWithoutProof, setSelectedWithoutProof] = useState<string[]>([]);
  const [selectedWithProof, setSelectedWithProof] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { toast } = useToast();
  const { useTicketsList, approveTicket, rejectTicket, extendReservation, bulkApprove, bulkReject, approveByReference } = useTickets(raffleId);
  const { getWhatsAppLink } = useBuyers(raffleId);
  const { sendApprovedEmail, sendRejectedEmail, sendBulkApprovedEmail } = useEmails();
  
  const { data: ticketsData, isLoading, refetch } = useTicketsList({
    status: 'reserved',
    pageSize: 100,
  });

  const reservedTickets = ticketsData?.tickets || [];

  // Filter tickets based on search query (by reference code, name, phone, or ticket number)
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return reservedTickets;
    
    const query = searchQuery.toLowerCase().trim();
    return reservedTickets.filter(ticket => 
      ticket.payment_reference?.toLowerCase().includes(query) ||
      ticket.buyer_name?.toLowerCase().includes(query) ||
      ticket.buyer_phone?.includes(query) ||
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.buyer_email?.toLowerCase().includes(query)
    );
  }, [reservedTickets, searchQuery]);

  // Group tickets by reference code for bulk approval
  const ticketsByReference = useMemo(() => {
    const groups: Record<string, typeof reservedTickets> = {};
    reservedTickets.forEach(ticket => {
      if (ticket.payment_reference) {
        if (!groups[ticket.payment_reference]) {
          groups[ticket.payment_reference] = [];
        }
        groups[ticket.payment_reference].push(ticket);
      }
    });
    return groups;
  }, [reservedTickets]);

  // Check if search matches a reference code with multiple tickets
  const matchedReferenceGroup = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const upperQuery = searchQuery.toUpperCase().trim();
    if (ticketsByReference[upperQuery] && ticketsByReference[upperQuery].length > 1) {
      return {
        code: upperQuery,
        tickets: ticketsByReference[upperQuery],
      };
    }
    return null;
  }, [searchQuery, ticketsByReference]);

  // Split filtered tickets by payment proof
  const withoutProof = filteredTickets.filter(t => !t.payment_proof_url);
  const withProof = filteredTickets.filter(t => t.payment_proof_url);

  const handleApprove = async (ticket: any) => {
    try {
      await approveTicket.mutateAsync(ticket.id);
      toast({ title: 'Boleto aprobado' });
      
      // Send approval email (non-blocking)
      if (ticket.buyer_email && ticket.buyer_name) {
        sendApprovedEmail({
          to: ticket.buyer_email,
          buyerName: ticket.buyer_name,
          ticketNumbers: [ticket.ticket_number],
          raffleTitle,
          raffleSlug,
        }).catch(console.error);
        
        // Send in-app notification to buyer if they have an account
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', ticket.buyer_email)
          .maybeSingle();
        
        if (buyerProfile?.id) {
          notifyPaymentApproved(
            buyerProfile.id,
            raffleTitle,
            [ticket.ticket_number]
          ).catch(console.error);
        }
      }
      
      refetch();
    } catch (error) {
      toast({ title: 'Error al aprobar', variant: 'destructive' });
    }
  };

  const handleReject = async (ticket: any) => {
    try {
      await rejectTicket.mutateAsync(ticket.id);
      toast({ title: 'Boleto rechazado' });
      
      const rejectionReason = 'El comprobante no coincide con el monto esperado';
      
      // Send rejection email (non-blocking)
      if (ticket.buyer_email && ticket.buyer_name) {
        sendRejectedEmail({
          to: ticket.buyer_email,
          buyerName: ticket.buyer_name,
          ticketNumbers: [ticket.ticket_number],
          raffleTitle,
          raffleSlug,
          rejectionReason,
        }).catch(console.error);
        
        // Send in-app notification to buyer if they have an account
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', ticket.buyer_email)
          .maybeSingle();
        
        if (buyerProfile?.id) {
          notifyPaymentRejected(
            buyerProfile.id,
            raffleTitle,
            [ticket.ticket_number],
            rejectionReason
          ).catch(console.error);
        }
      }
      
      refetch();
    } catch (error) {
      toast({ title: 'Error al rechazar', variant: 'destructive' });
    }
  };

  const handleExtend = async (ticketId: string) => {
    try {
      await extendReservation.mutateAsync({ ticketId, minutes: 30 });
      toast({ title: 'Reservación extendida 30 minutos' });
      refetch();
    } catch (error) {
      toast({ title: 'Error al extender', variant: 'destructive' });
    }
  };

  const handleBulkApprove = async (ticketIds: string[]) => {
    try {
      await bulkApprove.mutateAsync(ticketIds);
      toast({ title: `${ticketIds.length} boletos aprobados` });
      
      // Send notifications to buyers (non-blocking)
      const ticketsToNotify = withProof.filter(t => ticketIds.includes(t.id));
      const buyerEmails = [...new Set(ticketsToNotify.map(t => t.buyer_email).filter(Boolean))];
      
      for (const email of buyerEmails) {
        const buyerTickets = ticketsToNotify.filter(t => t.buyer_email === email);
        const ticketNumbers = buyerTickets.map(t => t.ticket_number);
        
        // Get buyer profile for notification
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (buyerProfile?.id) {
          notifyPaymentApproved(
            buyerProfile.id,
            raffleTitle,
            ticketNumbers
          ).catch(console.error);
        }
      }
      
      setSelectedWithProof([]);
      refetch();
    } catch (error) {
      toast({ title: 'Error al aprobar', variant: 'destructive' });
    }
  };

  const handleBulkReject = async (ticketIds: string[]) => {
    try {
      await bulkReject.mutateAsync(ticketIds);
      toast({ title: `${ticketIds.length} boletos rechazados` });
      
      // Send notifications to buyers (non-blocking)
      const allReserved = [...withoutProof, ...withProof];
      const ticketsToNotify = allReserved.filter(t => ticketIds.includes(t.id));
      const buyerEmails = [...new Set(ticketsToNotify.map(t => t.buyer_email).filter(Boolean))];
      
      for (const email of buyerEmails) {
        const buyerTickets = ticketsToNotify.filter(t => t.buyer_email === email);
        const ticketNumbers = buyerTickets.map(t => t.ticket_number);
        
        // Get buyer profile for notification
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (buyerProfile?.id) {
          notifyPaymentRejected(
            buyerProfile.id,
            raffleTitle,
            ticketNumbers,
            'El pago no fue verificado correctamente'
          ).catch(console.error);
        }
      }
      
      setSelectedWithoutProof([]);
      setSelectedWithProof([]);
      refetch();
    } catch (error) {
      toast({ title: 'Error al rechazar', variant: 'destructive' });
    }
  };

  const handleApproveByReference = async (referenceCode: string) => {
    const ticketsInGroup = ticketsByReference[referenceCode];
    if (!ticketsInGroup || ticketsInGroup.length === 0) return;
    
    try {
      const result = await approveByReference.mutateAsync(referenceCode);
      const ticketNumbers = result?.map(t => t.ticket_number) || ticketsInGroup.map(t => t.ticket_number);
      
      toast({ 
        title: `${ticketNumbers.length} boletos aprobados`,
        description: `Código de referencia: ${referenceCode}`,
      });
      
      // Send bulk approval email notification (non-blocking)
      const firstTicket = ticketsInGroup[0];
      if (firstTicket.buyer_email && firstTicket.buyer_name) {
        sendBulkApprovedEmail({
          to: firstTicket.buyer_email,
          buyerName: firstTicket.buyer_name,
          ticketNumbers,
          raffleTitle,
          raffleSlug,
          referenceCode,
        }).catch(console.error);
        
        // Send in-app notification to buyer if they have an account
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', firstTicket.buyer_email)
          .maybeSingle();
        
        if (buyerProfile?.id) {
          notifyPaymentApproved(
            buyerProfile.id,
            raffleTitle,
            ticketNumbers
          ).catch(console.error);
        }
      }
      
      setSearchQuery('');
      refetch();
    } catch (error) {
      toast({ title: 'Error al aprobar por código', variant: 'destructive' });
    }
  };
  const getTimeRemaining = (reservedUntil: string | null) => {
    if (!reservedUntil) return null;
    const remaining = new Date(reservedUntil).getTime() - Date.now();
    if (remaining <= 0) return 'Expirado';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const TicketCard = ({ 
    ticket, 
    isSelected, 
    onSelect, 
    showProof 
  }: { 
    ticket: any; 
    isSelected: boolean; 
    onSelect: (id: string) => void;
    showProof: boolean;
  }) => {
    const timeRemaining = getTimeRemaining(ticket.reserved_until);
    const isExpired = timeRemaining === 'Expirado';

    return (
      <Card className={cn(
        'transition-all',
        isSelected && 'ring-2 ring-primary',
        isExpired && 'border-destructive'
      )}>
        <CardContent className="p-4 space-y-3">
          {/* Header with checkbox and ticket number */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect(ticket.id)}
              />
              <Badge variant="outline" className="font-mono">
                #{ticket.ticket_number}
              </Badge>
              {ticket.payment_reference && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "font-mono text-xs cursor-pointer hover:bg-primary/20 transition-colors",
                    ticketsByReference[ticket.payment_reference]?.length > 1 && "ring-1 ring-primary/50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(ticket.payment_reference || '');
                  }}
                  title={ticketsByReference[ticket.payment_reference]?.length > 1 
                    ? `Click para ver todos los ${ticketsByReference[ticket.payment_reference].length} boletos con este código` 
                    : undefined
                  }
                >
                  <Hash className="h-3 w-3 mr-1" />
                  {ticket.payment_reference}
                  {ticketsByReference[ticket.payment_reference]?.length > 1 && (
                    <span className="ml-1 text-primary">
                      ({ticketsByReference[ticket.payment_reference].length})
                    </span>
                  )}
                </Badge>
              )}
            </div>
            <div className={cn(
              'flex items-center gap-1 text-sm',
              isExpired ? 'text-destructive' : 'text-muted-foreground'
            )}>
              <Timer className="h-3 w-3" />
              {timeRemaining}
            </div>
          </div>

          {/* Buyer Info */}
          <div className="space-y-1 text-sm">
            {ticket.buyer_name && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>{ticket.buyer_name}</span>
              </div>
            )}
            {ticket.buyer_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{ticket.buyer_phone}</span>
              </div>
            )}
            {ticket.buyer_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{ticket.buyer_email}</span>
              </div>
            )}
          </div>

          {/* Payment Proof */}
          {showProof && ticket.payment_proof_url && (
            <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
              <img 
                src={ticket.payment_proof_url} 
                alt="Comprobante" 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="default"
              onClick={() => handleApprove(ticket)}
              disabled={approveTicket.isPending}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Aprobar
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleReject(ticket)}
              disabled={rejectTicket.isPending}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rechazar
            </Button>
            {ticket.buyer_phone && (
              <Button 
                size="sm" 
                variant="outline"
                asChild
              >
                <a 
                  href={getWhatsAppLink(ticket.buyer_phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleExtend(ticket.id)}
              disabled={extendReservation.isPending}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
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
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-40 bg-muted animate-pulse rounded" />
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
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código de referencia, nombre, teléfono o boleto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2">
              {filteredTickets.length} resultado{filteredTickets.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Bulk approval by reference code banner */}
        {matchedReferenceGroup && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      Código de referencia: <span className="font-mono">{matchedReferenceGroup.code}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {matchedReferenceGroup.tickets.length} boletos encontrados • 
                      Comprador: {matchedReferenceGroup.tickets[0]?.buyer_name || 'Desconocido'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-sm text-muted-foreground">Boletos:</p>
                    <p className="font-mono text-sm">
                      {matchedReferenceGroup.tickets.map(t => `#${t.ticket_number}`).join(', ')}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleApproveByReference(matchedReferenceGroup.code)}
                    disabled={approveByReference.isPending}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Aprobar todos ({matchedReferenceGroup.tickets.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Without Proof Column */}
          <div className="space-y-4">
          <Card className="border-destructive/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Sin Comprobante ({withoutProof.length})
              </CardTitle>
              {selectedWithoutProof.length > 0 && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleBulkReject(selectedWithoutProof)}
                >
                  Rechazar ({selectedWithoutProof.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {withoutProof.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay reservaciones sin comprobante</p>
              </div>
            ) : (
              withoutProof.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedWithoutProof.includes(ticket.id)}
                  onSelect={(id) => {
                    setSelectedWithoutProof(prev => 
                      prev.includes(id) 
                        ? prev.filter(x => x !== id)
                        : [...prev, id]
                    );
                  }}
                  showProof={false}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* With Proof Column */}
      <div className="space-y-4">
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
                <Image className="h-5 w-5" />
                Con Comprobante ({withProof.length})
              </CardTitle>
              {selectedWithProof.length > 0 && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => handleBulkApprove(selectedWithProof)}
                  >
                    Aprobar ({selectedWithProof.length})
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleBulkReject(selectedWithProof)}
                  >
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {withProof.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay comprobantes pendientes</p>
              </div>
            ) : (
              withProof.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedWithProof.includes(ticket.id)}
                  onSelect={(id) => {
                    setSelectedWithProof(prev => 
                      prev.includes(id) 
                        ? prev.filter(x => x !== id)
                        : [...prev, id]
                    );
                  }}
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