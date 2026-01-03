import { useMemo, CSSProperties, ReactElement } from 'react';
import { Grid } from 'react-window';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TicketData {
  id: string;
  ticket_number: string;
  status: string;
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

  // Theme-aware colors
  const colors = isLightTemplate ? {
    available: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
    selected: 'bg-emerald-500 border-emerald-400 text-white',
    unavailable: 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed',
    checkBg: 'bg-white',
    checkBorder: 'border-emerald-500',
    checkText: 'text-emerald-500',
  } : {
    available: 'bg-card/50 border-border/50 text-foreground hover:bg-muted',
    selected: 'bg-emerald-500 border-emerald-400 text-white',
    unavailable: 'bg-muted/30 border-border/30 text-muted-foreground/50 cursor-not-allowed',
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
          !isAvailable && colors.unavailable
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
  const rowCount = Math.ceil(tickets.length / columnCount);
  
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
