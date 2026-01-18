import { useMemo, CSSProperties, ReactElement } from 'react';
import { Grid } from 'react-window';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TicketData {
  ticket_index: number;
  ticket_number: string;
  status: string;
  buyer_name?: string | null;
  buyer_city?: string | null;
}

interface VirtualizedTicketGridProps {
  tickets: TicketData[];
  selectedTickets: string[];
  onTicketClick: (ticketNumber: string, status: string) => void;
  columnCount: number;
  height: number;
  width: number;
  isLightTemplate?: boolean;
}

const CELL_SIZE = 52;

interface CellData {
  tickets: TicketData[];
  selectedTickets: string[];
  onTicketClick: (ticketNumber: string, status: string) => void;
  columnCount: number;
  isLightTemplate: boolean;
}

interface CellComponentProps {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  ariaAttributes: {
    "aria-colindex": number;
    role: "gridcell";
  };
}

function CellComponent(props: CellComponentProps & CellData): ReactElement {
  const { columnIndex, rowIndex, style, tickets, selectedTickets, onTicketClick, columnCount, isLightTemplate } = props;
  const index = rowIndex * columnCount + columnIndex;
  
  if (index >= tickets.length) {
    return <div style={style} />;
  }
  
  const ticket = tickets[index];
  const isAvailable = ticket.status === 'available';
  const isSelected = selectedTickets.includes(ticket.ticket_number);

  // Theme-aware colors - TRAFFIC LIGHT SYSTEM
  // Green = Available | Red = Sold | Yellow = Reserved
  const colors = isLightTemplate ? {
    // AVAILABLE - Green
    available: 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200',
    selected: 'bg-emerald-500 border-emerald-400 text-white',
    // SOLD - Red
    sold: 'bg-red-100 border-red-200 text-red-400 cursor-not-allowed',
    // RESERVED - Amber
    reserved: 'bg-amber-100 border-amber-300 text-amber-600 cursor-not-allowed',
    // Fallback unavailable
    unavailable: 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed',
    checkBg: 'bg-white',
    checkBorder: 'border-emerald-500',
    checkText: 'text-emerald-500',
  } : {
    // AVAILABLE - Green
    available: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30',
    selected: 'bg-emerald-500 border-emerald-400 text-white',
    // SOLD - Red  
    sold: 'bg-red-500/15 border-red-500/30 text-red-400/60 cursor-not-allowed',
    // RESERVED - Amber
    reserved: 'bg-amber-500/20 border-amber-500/40 text-amber-400 cursor-not-allowed',
    // Fallback unavailable
    unavailable: 'bg-gray-500/10 border-gray-500/20 text-gray-500/50 cursor-not-allowed',
    checkBg: 'bg-background',
    checkBorder: 'border-emerald-500',
    checkText: 'text-emerald-500',
  };
  
  return (
    <div style={{ ...style, padding: 4 }}>
      <button
        onClick={() => onTicketClick(ticket.ticket_number, ticket.status)}
        disabled={!isAvailable}
        className={cn(
          "relative w-full h-full rounded-lg text-xs font-mono font-bold transition-all border flex items-center justify-center",
          isAvailable && !isSelected && colors.available,
          isAvailable && isSelected && colors.selected,
          ticket.status === 'sold' && colors.sold,
          ticket.status === 'reserved' && colors.reserved,
          !isAvailable && ticket.status !== 'sold' && ticket.status !== 'reserved' && colors.unavailable
        )}
      >
        {ticket.ticket_number}
        {isSelected && (
          <span className={cn(
            "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border",
            colors.checkBg, colors.checkBorder
          )}>
            <Check className={cn("w-2.5 h-2.5", colors.checkText)} />
          </span>
        )}
      </button>
    </div>
  );
}

export function VirtualizedTicketGrid({
  tickets,
  selectedTickets,
  onTicketClick,
  columnCount,
  height,
  width,
  isLightTemplate = false,
}: VirtualizedTicketGridProps) {
  // Memoize row count calculation to avoid recalculation on every render
  const rowCount = useMemo(
    () => Math.ceil(tickets.length / columnCount),
    [tickets.length, columnCount]
  );
  
  const cellProps = useMemo(() => ({
    tickets,
    selectedTickets,
    onTicketClick,
    columnCount,
    isLightTemplate,
  }), [tickets, selectedTickets, onTicketClick, columnCount, isLightTemplate]);
  
  return (
    <Grid<CellData>
      className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent mx-auto"
      columnCount={columnCount}
      columnWidth={CELL_SIZE}
      rowCount={rowCount}
      rowHeight={CELL_SIZE}
      style={{ height, width: Math.min(width, columnCount * CELL_SIZE) }}
      cellComponent={CellComponent}
      cellProps={cellProps}
    />
  );
}
