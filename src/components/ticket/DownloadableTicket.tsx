import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download, Ticket, Calendar, Trophy, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { formatCurrency } from '@/lib/currency-utils';

interface DownloadableTicketProps {
  ticket: {
    id: string;
    ticket_number: string;
    buyer_name: string;
    buyer_email: string;
    status: string;
  };
  raffle: {
    title: string;
    slug: string;
    prize_name: string;
    prize_images?: string[];
    draw_date: string;
    ticket_price: number;
    currency_code: string;
  };
  organization?: {
    name: string;
    logo_url?: string | null;
  };
}

export function DownloadableTicket({ ticket, raffle, organization }: DownloadableTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `boleto-${ticket.ticket_number}-${raffle.slug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating ticket image:', error);
    }
  };

  const verificationUrl = `${window.location.origin}/ticket/${ticket.id}`;
  const isConfirmed = ticket.status === 'sold';

  return (
    <div className="space-y-4">
      {/* Ticket Visual */}
      <div
        ref={ticketRef}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-1"
      >
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            {/* Organization */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {organization?.logo_url ? (
                  <img 
                    src={organization.logo_url} 
                    alt={organization.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-violet-400" />
                  </div>
                )}
                <span className="text-sm text-slate-400 font-medium">
                  {organization?.name || 'Sorteo'}
                </span>
              </div>
              {isConfirmed && (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">CONFIRMADO</span>
                </div>
              )}
            </div>

            {/* Raffle Title */}
            <h2 className="text-xl font-bold text-white mb-1 leading-tight">
              {raffle.title}
            </h2>
            
            {/* Prize */}
            <div className="flex items-center gap-2 text-violet-300">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">{raffle.prize_name}</span>
            </div>
          </div>

          {/* Divider with circles */}
          <div className="relative flex items-center">
            <div className="absolute -left-4 w-8 h-8 bg-slate-950 rounded-full" />
            <div className="flex-1 border-t-2 border-dashed border-slate-700" />
            <div className="absolute -right-4 w-8 h-8 bg-slate-950 rounded-full" />
          </div>

          {/* Ticket Content */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              {/* Ticket Number */}
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Número de Boleto
                </p>
                <p className="text-4xl font-bold text-white tracking-tight">
                  #{ticket.ticket_number}
                </p>
                
                {/* Buyer & Date */}
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-slate-400">
                    <span className="text-slate-500">Nombre:</span> {ticket.buyer_name}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>
                      {format(new Date(raffle.draw_date), "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex-shrink-0">
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeSVG
                    value={verificationUrl}
                    size={80}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#1a1a2e"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>ID: {ticket.id.slice(0, 8)}</span>
              <span>sortavo.com</span>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-tr-full" />
        </div>
      </div>

      {/* Download Button */}
      <Button onClick={handleDownload} className="w-full gap-2">
        <Download className="w-4 h-4" />
        Descargar Boleto
      </Button>
    </div>
  );
}
