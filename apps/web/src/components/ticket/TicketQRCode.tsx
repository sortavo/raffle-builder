import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface TicketQRCodeProps {
  ticketId: string;
  ticketNumber: string;
  raffleSlug: string;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export function TicketQRCode({ 
  ticketId, 
  ticketNumber, 
  raffleSlug, 
  size = 120,
  className,
  showLabel = true
}: TicketQRCodeProps) {
  const verificationUrl = `${window.location.origin}/ticket/${ticketId}`;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="bg-white p-3 rounded-xl shadow-sm">
        <QRCodeSVG
          value={verificationUrl}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#1a1a2e"
        />
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground font-medium">
          Escanea para verificar
        </span>
      )}
    </div>
  );
}
