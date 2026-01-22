import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DownloadableTicket } from '@/components/ticket/DownloadableTicket';
import { useEmails } from '@/hooks/useEmails';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Download, 
  Send, 
  CheckCircle2, 
  Clock, 
  Ticket,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';

interface TicketData {
  id: string;
  ticket_number: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
  status: string | null;
  payment_proof_uploaded_at?: string | null;
  approved_at?: string | null;
}

interface RaffleData {
  id: string;
  title: string;
  slug: string;
  prize_name: string;
  prize_images?: string[];
  draw_date: string | null;
  ticket_price: number;
  currency_code: string | null;
}

interface OrganizationData {
  name: string;
  logo_url?: string | null;
}

interface TicketDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: TicketData[];
  raffle: RaffleData;
  organization?: OrganizationData;
}

export function TicketDetailDialog({
  open,
  onOpenChange,
  tickets,
  raffle,
  organization,
}: TicketDetailDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const { sendBulkApprovedEmail } = useEmails();
  const { toast } = useToast();

  const currentTicket = tickets[selectedTicketIndex];
  const buyerEmail = currentTicket?.buyer_email;
  const buyerName = currentTicket?.buyer_name || 'Comprador';
  const ticketNumbers = tickets.map(t => t.ticket_number);
  const isConfirmed = currentTicket?.status === 'sold';

  const handleResendEmail = async () => {
    if (!buyerEmail) {
      toast({
        title: 'No hay email',
        description: 'Este comprador no tiene email registrado',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      await sendBulkApprovedEmail({
        to: buyerEmail,
        buyerName,
        ticketNumbers,
        raffleTitle: raffle.title,
        raffleSlug: raffle.slug,
      });
      toast({
        title: 'Email enviado',
        description: `Se reenviaron los boletos a ${buyerEmail}`,
      });
    } catch (error) {
      toast({
        title: 'Error al enviar',
        description: 'No se pudo enviar el email',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!currentTicket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Detalle del Boleto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Buyer Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{buyerName}</span>
              <Badge 
                variant={isConfirmed ? 'default' : 'secondary'}
                className={isConfirmed ? 'bg-success text-success-foreground' : ''}
              >
                {isConfirmed ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Confirmado</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> Pendiente</>
                )}
              </Badge>
            </div>
            {buyerEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {buyerEmail}
              </div>
            )}
            {currentTicket.buyer_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {currentTicket.buyer_phone}
              </div>
            )}
            {currentTicket.buyer_city && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {currentTicket.buyer_city}
              </div>
            )}
          </div>

          {/* Ticket Numbers */}
          {tickets.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Boletos del comprador ({tickets.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {tickets.map((t, i) => (
                  <Button
                    key={t.id}
                    variant={selectedTicketIndex === i ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedTicketIndex(i)}
                  >
                    #{t.ticket_number}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Visual */}
          <DownloadableTicket
            ticket={{
              id: currentTicket.id,
              ticket_number: currentTicket.ticket_number,
              buyer_name: buyerName,
              buyer_email: buyerEmail || '',
              status: currentTicket.status || 'reserved',
              payment_proof_uploaded_at: currentTicket.payment_proof_uploaded_at || undefined,
              approved_at: currentTicket.approved_at || undefined,
            }}
            raffle={{
              title: raffle.title,
              slug: raffle.slug,
              prize_name: raffle.prize_name,
              prize_images: raffle.prize_images,
              draw_date: raffle.draw_date || new Date().toISOString(),
              ticket_price: raffle.ticket_price,
              currency_code: raffle.currency_code || 'MXN',
            }}
            organization={organization}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleResendEmail}
              disabled={isSending || !buyerEmail}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Reenviar Email
            </Button>
          </div>
          
          {!buyerEmail && (
            <p className="text-xs text-muted-foreground text-center">
              El comprador no tiene email registrado para reenviar boletos.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
