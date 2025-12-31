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
}

const CELL_SIZE = 52;

interface CellData {
  tickets: TicketData[];
  selectedTickets: string[];
  onTicketClick: (ticketNumber: string, status: string) => void;
  columnCount: number;
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
  const { columnIndex, rowIndex, style, tickets, selectedTickets, onTicketClick, columnCount } = props;
  const index = rowIndex * columnCount + columnIndex;
  
  if (index >= tickets.length) {
    return <div style={style} />;
  }
  
  const ticket = tickets[index];
  const isAvailable = ticket.status === 'available';
  const isSelected = selectedTickets.includes(ticket.ticket_number);
  
  return (
    <div style={{ ...style, padding: 4 }}>
      <button
        onClick={() => onTicketClick(ticket.ticket_number, ticket.status)}
        disabled={!isAvailable}
        className={cn(
          "relative w-full h-full rounded-lg text-xs font-mono font-bold transition-all border flex items-center justify-center",
          isAvailable && !isSelected && "bg-card/50 border-border/50 text-foreground hover:bg-muted cursor-pointer",
          isAvailable && isSelected && "bg-emerald-500 border-emerald-400 text-white",
          !isAvailable && "bg-muted/30 border-border/30 text-muted-foreground/50 cursor-not-allowed"
        )}
      >
        {ticket.ticket_number}
        {isSelected && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-background rounded-full flex items-center justify-center border border-emerald-500">
            <Check className="w-2.5 h-2.5 text-emerald-500" />
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
}: VirtualizedTicketGridProps) {
  const rowCount = Math.ceil(tickets.length / columnCount);
  
  const cellProps = useMemo(() => ({
    tickets,
    selectedTickets,
    onTicketClick,
    columnCount,
  }), [tickets, selectedTickets, onTicketClick, columnCount]);
  
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
