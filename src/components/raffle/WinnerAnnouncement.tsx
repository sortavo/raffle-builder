import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Facebook, Share2, Copy, Check } from 'lucide-react';
import { FaXTwitter } from "react-icons/fa6";
import { toast } from 'sonner';
import { useState } from 'react';

interface WinnerAnnouncementProps {
  ticketNumber: string;
  winnerName: string;
  prizeName: string;
  prizeImage?: string;
  raffleTitle: string;
  orgName: string;
  orgLogo?: string;
  drawDate: string;
  brandColor?: string;
}

export function WinnerAnnouncement({
  ticketNumber,
  winnerName,
  prizeName,
  prizeImage,
  raffleTitle,
  orgName,
  orgLogo,
  drawDate,
  brandColor = '#6366f1',
}: WinnerAnnouncementProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `ganador-${ticketNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagen descargada');
    } catch {
      toast.error('Error al descargar imagen');
    }
  };

  const shareText = `🎉 ¡Tenemos ganador! El boleto #${ticketNumber} de ${winnerName} ha ganado ${prizeName} en el sorteo "${raffleTitle}" organizado por ${orgName}. ¡Felicidades! 🏆`;

  const handleShare = (platform: 'facebook' | 'x' | 'whatsapp') => {
    const encodedText = encodeURIComponent(shareText);
    const url = window.location.href;
    const encodedUrl = encodeURIComponent(url);

  const links: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      x: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    };

    window.open(links[platform], '_blank', 'width=600,height=400');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Shareable Card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-xl p-8"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
        }}
      >
        {/* Confetti decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 text-4xl">🎊</div>
          <div className="absolute top-8 right-8 text-3xl">✨</div>
          <div className="absolute bottom-6 left-8 text-2xl">🎉</div>
          <div className="absolute bottom-4 right-6 text-3xl">🏆</div>
        </div>

        <div className="relative z-10 text-center text-white space-y-4">
          {/* Trophy */}
          <div className="text-6xl">🏆</div>

          {/* Winner heading */}
          <h2 className="text-3xl font-bold tracking-wider">
            ¡GANADOR!
          </h2>

          {/* Ticket number */}
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-xl px-8 py-4">
            <p className="text-sm uppercase tracking-wider opacity-80">Boleto</p>
            <p className="text-5xl font-bold">#{ticketNumber}</p>
          </div>

          {/* Winner name */}
          <div>
            <p className="text-2xl font-semibold">{winnerName}</p>
          </div>

          {/* Prize */}
          <div className="bg-white/10 rounded-lg p-4 max-w-xs mx-auto">
            {prizeImage && (
              <img
                src={prizeImage}
                alt={prizeName}
                className="w-24 h-24 object-cover rounded-lg mx-auto mb-2"
              />
            )}
            <p className="text-lg font-medium">🎁 {prizeName}</p>
          </div>

          {/* Raffle title */}
          <p className="text-lg opacity-90">{raffleTitle}</p>

          {/* Organization */}
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/20">
            {orgLogo && (
              <img
                src={orgLogo}
                alt={orgName}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="text-sm">{orgName}</span>
          </div>

          {/* Date */}
          <p className="text-xs opacity-70">{drawDate}</p>
        </div>
      </div>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Descargar PNG
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare('facebook')}
            className="text-[#1877F2] hover:text-[#1877F2]"
          >
            <Facebook className="h-4 w-4 mr-2" />
            Facebook
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare('x')}
            className="text-foreground hover:text-foreground"
          >
            <FaXTwitter className="h-4 w-4 mr-2" />
            X
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare('whatsapp')}
            className="text-[#25D366] hover:text-[#25D366]"
          >
            <Share2 className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>

          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Copiar
          </Button>
        </div>
      </Card>
    </div>
  );
}
