import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Timer
} from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { useBuyers } from '@/hooks/useBuyers';
import { useEmails } from '@/hooks/useEmails';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ApprovalsTabProps {
  raffleId: string;
  raffleTitle?: string;
  raffleSlug?: string;
}

export function ApprovalsTab({ raffleId, raffleTitle = '', raffleSlug = '' }: ApprovalsTabProps) {
  const [selectedWithoutProof, setSelectedWithoutProof] = useState<string[]>([]);
  const [selectedWithProof, setSelectedWithProof] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { useTicketsList, approveTicket, rejectTicket, extendReservation, bulkApprove, bulkReject } = useTickets(raffleId);
  const { getWhatsAppLink } = useBuyers(raffleId);
  const { sendApprovedEmail, sendRejectedEmail } = useEmails();
  
  const { data: ticketsData, isLoading, refetch } = useTicketsList({
    status: 'reserved',
    pageSize: 100,
  });

  const reservedTickets = ticketsData?.tickets || [];

  // Split tickets by payment proof
  const withoutProof = reservedTickets.filter(t => !t.payment_proof_url);
  const withProof = reservedTickets.filter(t => t.payment_proof_url);

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
      
      // Send rejection email (non-blocking)
      if (ticket.buyer_email && ticket.buyer_name) {
        sendRejectedEmail({
          to: ticket.buyer_email,
          buyerName: ticket.buyer_name,
          ticketNumbers: [ticket.ticket_number],
          raffleTitle,
          raffleSlug,
          rejectionReason: 'El comprobante no coincide con el monto esperado',
        }).catch(console.error);
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
      setSelectedWithoutProof([]);
      setSelectedWithProof([]);
      refetch();
    } catch (error) {
      toast({ title: 'Error al rechazar', variant: 'destructive' });
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
  );
}