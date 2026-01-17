import { useRef, useMemo, CSSProperties, ReactElement, useEffect } from 'react';
import { List } from 'react-window';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  ticketCount: number;
  status: string;
  orderTotal: number | null;
  date?: string;
}

interface VirtualizedBuyersListProps {
  buyers: Buyer[];
  onBuyerClick?: (buyer: Buyer) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  height?: number;
  itemHeight?: number;
  className?: string;
}

const VIRTUALIZATION_THRESHOLD = 50;
const ITEM_HEIGHT = 80;

interface RowData {
  buyers: Buyer[];
  onBuyerClick?: (buyer: Buyer) => void;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore?: () => void;
}

interface RowComponentProps {
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
  index: number;
  style: CSSProperties;
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
    sold: { variant: 'default', label: 'Vendido' },
    reserved: { variant: 'secondary', label: 'Reservado' },
    pending: { variant: 'outline', label: 'Pendiente' },
    cancelled: { variant: 'destructive', label: 'Cancelado' },
  };
  const config = variants[status] || { variant: 'outline' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function RowComponent(props: RowComponentProps & RowData): ReactElement {
  const { index, style, buyers, onBuyerClick, hasMore, isLoading, onLoadMore } = props;
  const isLoaderRow = index >= buyers.length;

  if (isLoaderRow) {
    return (
      <div style={style} className="flex items-center justify-center p-4 border-b">
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando más...
          </span>
        ) : (
          <button 
            onClick={() => onLoadMore?.()} 
            className="text-primary hover:underline"
          >
            Cargar más
          </button>
        )}
      </div>
    );
  }

  const buyer = buyers[index];

  return (
    <div
      style={style}
      onClick={() => onBuyerClick?.(buyer)}
      className={cn(
        'flex items-center gap-4 px-4 border-b hover:bg-muted/50 cursor-pointer transition-colors',
        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{buyer.name || 'Sin nombre'}</span>
          {getStatusBadge(buyer.status)}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {buyer.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{buyer.email}</span>
            </span>
          )}
          {buyer.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              {buyer.phone}
            </span>
          )}
          {buyer.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {buyer.city}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-medium">{buyer.ticketCount} boletos</p>
        {buyer.orderTotal != null && buyer.orderTotal > 0 && (
          <p className="text-sm text-muted-foreground">
            ${buyer.orderTotal.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A virtualized list of buyers that efficiently renders large lists.
 * Uses react-window for virtualization and supports infinite scroll.
 */
export function VirtualizedBuyersList({
  buyers,
  onBuyerClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  height = 600,
  itemHeight = ITEM_HEIGHT,
  className,
}: VirtualizedBuyersListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastBuyerCount = useRef(buyers.length);

  // Trigger load more when buyer count hasn't changed and we have more
  useEffect(() => {
    if (buyers.length !== lastBuyerCount.current) {
      lastBuyerCount.current = buyers.length;
    }
  }, [buyers.length]);

  // Total items including loading indicator
  const rowCount = hasMore ? buyers.length + 1 : buyers.length;

  const rowProps = useMemo(() => ({
    buyers,
    onBuyerClick,
    hasMore,
    isLoading,
    onLoadMore,
  }), [buyers, onBuyerClick, hasMore, isLoading, onLoadMore]);

  // For small lists, render without virtualization
  if (buyers.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <div className={cn('border rounded-lg overflow-hidden', className)}>
        {buyers.map((buyer, index) => (
          <div
            key={buyer.id}
            onClick={() => onBuyerClick?.(buyer)}
            className={cn(
              'flex items-center gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors',
              index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{buyer.name || 'Sin nombre'}</span>
                {getStatusBadge(buyer.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {buyer.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{buyer.email}</span>
                  </span>
                )}
                {buyer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {buyer.phone}
                  </span>
                )}
                {buyer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {buyer.city}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="font-medium">{buyer.ticketCount} boletos</p>
              {buyer.orderTotal != null && buyer.orderTotal > 0 && (
                <p className="text-sm text-muted-foreground">
                  ${buyer.orderTotal.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
        {hasMore && (
          <div className="flex items-center justify-center p-4 border-t">
            {isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando más...
              </span>
            ) : (
              <button 
                onClick={() => onLoadMore?.()} 
                className="text-primary hover:underline"
              >
                Cargar más
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Calculate list height
  const listHeight = Math.min(height, rowCount * itemHeight);

  return (
    <div ref={containerRef} className={cn('border rounded-lg overflow-hidden relative', className)}>
      {buyers.length >= VIRTUALIZATION_THRESHOLD && (
        <div className="absolute top-0 right-0 z-10 px-2 py-1 text-[10px] bg-muted/80 text-muted-foreground rounded-bl-lg">
          ⚡ Vista optimizada ({buyers.length} compradores)
        </div>
      )}
      <List
        rowComponent={RowComponent}
        rowCount={rowCount}
        rowHeight={itemHeight}
        rowProps={rowProps}
        style={{ height: listHeight }}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      />
    </div>
  );
}
