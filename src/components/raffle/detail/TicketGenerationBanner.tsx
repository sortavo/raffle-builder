import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import { getRafflePublicUrl } from '@/lib/url-utils';

interface TicketGenerationBannerProps {
  raffleId: string;
  raffleSlug: string;
  orgSlug?: string | null;
  justPublished?: boolean;
  onDismiss?: () => void;
}

/**
 * Simplified banner for virtual tickets system.
 * Since tickets are now generated instantly on-demand,
 * this only shows a success message when a raffle is published.
 */
export function TicketGenerationBanner({
  raffleSlug,
  orgSlug,
  justPublished = false,
  onDismiss,
}: TicketGenerationBannerProps) {
  const [showBanner, setShowBanner] = useState(justPublished);

  // Auto-hide after 30 seconds
  useEffect(() => {
    if (showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

  const handleDismiss = () => {
    setShowBanner(false);
    onDismiss?.();
  };

  if (!showBanner) return null;

  const publicUrl = getRafflePublicUrl(raffleSlug, orgSlug);

  return (
    <Alert className="bg-emerald-500/10 border-emerald-500/30 mb-4">
      <div className="flex items-center gap-3 w-full">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <AlertDescription className="flex items-center justify-between flex-1 gap-2">
          <span className="text-sm font-medium text-emerald-700">
            ¡Tu rifa está activa y lista para recibir participantes!
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/50 text-emerald-700 hover:bg-emerald-500/10 gap-1.5"
              asChild
            >
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver página
              </a>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </div>
    </Alert>
  );
}
