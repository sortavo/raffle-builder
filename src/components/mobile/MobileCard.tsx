import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, MoreVertical, Ticket, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";

interface MobileCardProps {
  raffle: {
    id: string;
    title: string;
    prize_name: string;
    prize_images?: string[] | null;
    status: string;
    total_tickets: number;
    tickets_sold?: number;
    total_revenue?: number;
    draw_date?: string | null;
    currency_code?: string | null;
  };
  onClick: () => void;
  onMenuClick?: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-green-500 text-white" },
  draft: { label: "Borrador", className: "bg-gray-500 text-white" },
  paused: { label: "Pausado", className: "bg-yellow-500 text-white" },
  completed: { label: "Completado", className: "bg-blue-500 text-white" },
  canceled: { label: "Cancelado", className: "bg-red-500 text-white" },
};

export function MobileCard({ raffle, onClick, onMenuClick }: MobileCardProps) {
  const ticketsSold = raffle.tickets_sold || 0;
  const progress = (ticketsSold / raffle.total_tickets) * 100;
  const status = statusConfig[raffle.status] || statusConfig.draft;
  const imageUrl = raffle.prize_images?.[0] || "/placeholder.svg";

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-2xl overflow-hidden shadow-lg active:shadow-xl transition-shadow touch-manipulation cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={raffle.prize_name}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <Badge className={cn("text-xs font-semibold shadow-lg", status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Quick stats */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex justify-between">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-[10px] text-white/70 uppercase tracking-wide">
                Vendidos
              </p>
              <p className="text-sm font-bold text-white">
                {ticketsSold}/{raffle.total_tickets}
              </p>
            </div>
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-[10px] text-white/70 uppercase tracking-wide">
                Ingresos
              </p>
              <p className="text-sm font-bold text-white">
                {formatCurrency(raffle.total_revenue || 0, raffle.currency_code || 'MXN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg text-foreground line-clamp-1">
          {raffle.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {raffle.prize_name}
        </p>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Ticket className="h-3 w-3" />
              Progreso
            </span>
            <span className="font-semibold text-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                progress >= 75 
                  ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                  : "bg-gradient-to-r from-violet-600 to-indigo-600"
              )}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {raffle.draw_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(raffle.draw_date), "dd MMM", { locale: es })}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mr-2"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick?.();
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

interface MobileCardListProps {
  raffles: MobileCardProps['raffle'][];
  onCardClick: (raffleId: string) => void;
  onMenuClick?: (raffleId: string) => void;
}

export function MobileCardList({ raffles, onCardClick, onMenuClick }: MobileCardListProps) {
  return (
    <div className="space-y-4 px-4 py-4">
      {raffles.map((raffle, index) => (
        <motion.div
          key={raffle.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <MobileCard
            raffle={raffle}
            onClick={() => onCardClick(raffle.id)}
            onMenuClick={() => onMenuClick?.(raffle.id)}
          />
        </motion.div>
      ))}
    </div>
  );
}
