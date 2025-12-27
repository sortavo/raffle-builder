import { memo, useRef, CSSProperties, ReactElement } from 'react';
import { List } from 'react-window';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Clock, CheckCircle2, AlertCircle, Download, Eye, User, MapPin,
  Hourglass, Ticket
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Status configuration for visual display
const STATUS_CONFIG = {
  sold: {
    label: 'Confirmado',
    color: 'bg-success/10 text-success border-success/30',
    icon: CheckCircle2,
  },
  reserved: {
    label: 'Pendiente',
    color: 'bg-warning/10 text-warning border-warning/30',
    icon: Hourglass,
  },
  available: {
    label: 'Disponible',
    color: 'bg-muted text-muted-foreground border-border',
    icon: Ticket,
  },
  canceled: {
    label: 'Cancelado',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: AlertCircle,
  }
};

interface TicketData {
  id: string;
  ticket_number: string;
  status: string;
  buyer_name?: string | null;
  buyer_city?: string | null;
  reserved_at?: string | null;
  sold_at?: string | null;
  created_at?: string | null;
}

interface RaffleData {
  id?: string;
  title?: string;
  slug?: string;
  prize_name?: string;
  draw_date?: string;
  ticket_price?: number;
  currency_code?: string;
  prize_images?: string[];
  status?: string;
}

interface VirtualizedTicketListProps {
  tickets: TicketData[];
  raffle: RaffleData | null;
  onTicketClick: (ticket: TicketData, raffle: RaffleData | null) => void;
  maxHeight?: number;
}

interface TicketRowProps {
  tickets: TicketData[];
  raffle: RaffleData | null;
  onTicketClick: (ticket: TicketData, raffle: RaffleData | null) => void;
}

// Ticket row component for virtualized list
function TicketRowComponent(props: {
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
  index: number;
  style: CSSProperties;
} & TicketRowProps): ReactElement {
  const { index, style, tickets, raffle, onTicketClick } = props;
  const ticket = tickets[index];
  
  const status = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available;
  const StatusIcon = status.icon;
  const purchaseDate = ticket.reserved_at || ticket.sold_at || ticket.created_at;

  return (
    <div style={style}>
      <button
        onClick={() => onTicketClick(ticket, raffle)}
        className="w-full h-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center gap-4 border-b border-border/50"
      >
        {/* Ticket Number */}
        <div className="flex-shrink-0">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg border-2 ${status.color}`}>
            {ticket.ticket_number}
          </div>
        </div>

        {/* Ticket Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Boleto #{ticket.ticket_number}</span>
            <Badge variant="outline" className={`text-xs ${status.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            {purchaseDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(purchaseDate), { addSuffix: true, locale: es })}
              </span>
            )}
            {ticket.buyer_name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {ticket.buyer_name}
              </span>
            )}
            {ticket.buyer_city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {ticket.buyer_city}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-2 rounded-lg bg-muted/50">
            {ticket.status === 'sold' ? (
              <Download className="w-4 h-4 text-primary" />
            ) : (
              <Eye className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 50;
const ITEM_HEIGHT = 82; // Height of each ticket row in pixels
const MAX_LIST_HEIGHT = 500; // Maximum height for virtualized list

export function VirtualizedTicketList({ 
  tickets, 
  raffle, 
  onTicketClick,
  maxHeight = MAX_LIST_HEIGHT 
}: VirtualizedTicketListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate list height
  const listHeight = Math.min(tickets.length * ITEM_HEIGHT, maxHeight);

  // If below threshold, render without virtualization
  if (tickets.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <div className="divide-y">
        {tickets.map((ticket, index) => {
          const status = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available;
          const StatusIcon = status.icon;
          const purchaseDate = ticket.reserved_at || ticket.sold_at || ticket.created_at;

          return (
            <motion.button
              key={ticket.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onTicketClick(ticket, raffle)}
              className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center gap-4"
            >
              {/* Ticket Number */}
              <div className="flex-shrink-0">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg border-2 ${status.color}`}>
                  {ticket.ticket_number}
                </div>
              </div>

              {/* Ticket Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Boleto #{ticket.ticket_number}</span>
                  <Badge variant="outline" className={`text-xs ${status.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {purchaseDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(purchaseDate), { addSuffix: true, locale: es })}
                    </span>
                  )}
                  {ticket.buyer_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ticket.buyer_name}
                    </span>
                  )}
                  {ticket.buyer_city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {ticket.buyer_city}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="p-2 rounded-lg bg-muted/50">
                  {ticket.status === 'sold' ? (
                    <Download className="w-4 h-4 text-primary" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Render virtualized list for large datasets
  return (
    <div ref={containerRef} className="relative">
      {tickets.length >= VIRTUALIZATION_THRESHOLD && (
        <div className="absolute top-0 right-0 z-10 px-2 py-1 text-[10px] bg-muted/80 text-muted-foreground rounded-bl-lg">
          ⚡ Vista optimizada ({tickets.length} boletos)
        </div>
      )}
      <List
        rowComponent={TicketRowComponent}
        rowCount={tickets.length}
        rowHeight={ITEM_HEIGHT}
        rowProps={{ tickets, raffle, onTicketClick }}
        style={{ height: listHeight }}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      />
    </div>
  );
}

export { VIRTUALIZATION_THRESHOLD };
