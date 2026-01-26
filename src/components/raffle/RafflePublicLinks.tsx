import { Link2, ExternalLink, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RafflePublicLinksProps {
  orgSlug?: string | null;
  raffleSlug?: string | null;
  organizationId?: string;
  compact?: boolean; // For list view
}

export function RafflePublicLinks({ 
  orgSlug, 
  raffleSlug, 
  organizationId,
  compact = false
}: RafflePublicLinksProps) {
  const { data: customDomains } = useQuery({
    queryKey: ['custom-domains-for-raffle', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_domains')
        .select('domain, is_primary')
        .eq('organization_id', organizationId!)
        .eq('verified', true)
        .order('is_primary', { ascending: false });
      return data;
    },
    enabled: !!organizationId,
    staleTime: 60000 // Cache for 1 minute
  });

  if (!orgSlug || !raffleSlug) return null;

  const sortavoUrl = `https://sortavo.com/${orgSlug}/${raffleSlug}`;
  const primaryCustomDomain = customDomains?.find(d => d.is_primary) || customDomains?.[0];
  const customDomainUrl = primaryCustomDomain 
    ? `https://${primaryCustomDomain.domain}/${raffleSlug}` 
    : null;

  const copyToClipboard = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* Sortavo link */}
        <div 
          className="flex items-center gap-1 text-primary hover:text-primary/80 cursor-pointer group"
          onClick={(e) => copyToClipboard(sortavoUrl, e)}
          title="Clic para copiar URL"
        >
          <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span className="truncate max-w-[140px] sm:max-w-[200px] text-xs sm:text-sm">
            /{raffleSlug}
          </span>
          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        {/* Custom domain link */}
        {customDomainUrl && (
          <div 
            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer group"
            onClick={(e) => copyToClipboard(customDomainUrl, e)}
            title="Clic para copiar URL"
          >
            <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[200px] text-xs sm:text-sm">
              {primaryCustomDomain?.domain}/{raffleSlug}
            </span>
            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {/* Sortavo link */}
      <div className="inline-flex items-center gap-1 group">
        <Link2 className="h-3 w-3 text-muted-foreground" />
        <a 
          href={sortavoUrl} 
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline truncate max-w-[180px] sm:max-w-[250px]"
        >
          sortavo.com/{orgSlug}/{raffleSlug}
        </a>
        <button
          onClick={(e) => copyToClipboard(sortavoUrl, e)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
        >
          <Copy className="h-3 w-3 text-muted-foreground" />
        </button>
        <a 
          href={sortavoUrl} 
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Custom domain link */}
      {customDomainUrl && (
        <div className="inline-flex items-center gap-1 group">
          <Link2 className="h-3 w-3 text-emerald-600" />
          <a 
            href={customDomainUrl} 
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:underline truncate max-w-[180px] sm:max-w-[250px]"
          >
            {primaryCustomDomain?.domain}/{raffleSlug}
          </a>
          <button
            onClick={(e) => copyToClipboard(customDomainUrl, e)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
          >
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
          <a 
            href={customDomainUrl} 
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-700"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
