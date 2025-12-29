import { motion } from "framer-motion";
import { Trophy, Ticket, Share2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/currency-utils";
import { CountdownTimer } from "./CountdownTimer";

interface MobileHeroProps {
  raffle: {
    title: string;
    prize_name: string;
    prize_images?: string[] | null;
    prize_value?: number | null;
    ticket_price: number;
    draw_date?: string | null;
    ticketsSold: number;
    total_tickets: number;
    ticketsAvailable: number;
  };
  organization: {
    name: string;
    logo_url?: string | null;
    slug?: string | null;
    verified?: boolean | null;
  };
  currency: string;
  onScrollToTickets: () => void;
  onShare: () => void;
  onImageClick?: () => void;
}

export function MobileHero({
  raffle,
  organization,
  currency,
  onScrollToTickets,
  onShare,
  onImageClick,
}: MobileHeroProps) {
  const mainImage = raffle.prize_images?.[0] || '/placeholder.svg';
  const progress = (raffle.ticketsSold / raffle.total_tickets) * 100;

  return (
    <div className="relative">
      {/* Minimal Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
            <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
              {organization.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-sm drop-shadow-lg">
            {organization.name}
          </span>
          {organization.verified && (
            <Badge className="bg-blue-500/90 text-white text-[10px] px-1.5 py-0.5">✓</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onShare}
          className="text-white hover:bg-white/20 h-10 w-10"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Full-width Prize Image */}
      <div 
        className="relative aspect-[4/5] w-full overflow-hidden cursor-pointer"
        onClick={onImageClick}
      >
        <img
          src={mainImage}
          alt={raffle.prize_name}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
        
        {/* Prize info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-4">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-amber-950 font-bold px-3 py-1">
              <Trophy className="w-3.5 h-3.5 mr-1" />
              GRAN SORTEO
            </Badge>
            <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-xs">
              🎟️ {raffle.ticketsSold} vendidos
            </Badge>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            {raffle.title}
          </h1>
          
          {/* Prize name and value */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white/90 text-lg font-medium">
              {raffle.prize_name}
            </span>
            {raffle.prize_value && (
              <Badge className="bg-green-500/90 text-white font-semibold">
                Valor: {formatCurrency(raffle.prize_value, currency)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Price - Prominent lottery style */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 py-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Ticket className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-amber-900/70 text-xs font-medium uppercase tracking-wide">
                Precio por boleto
              </p>
              <p className="text-3xl font-black text-amber-950">
                {formatCurrency(raffle.ticket_price, currency)}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl"
          >
            🎰
          </motion.div>
        </div>
      </div>

      {/* Countdown Timer - Lottery style */}
      {raffle.draw_date && (
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 py-5 px-4">
          <p className="text-white/80 text-xs font-medium uppercase tracking-wider text-center mb-3">
            El sorteo se realizará en
          </p>
          <CountdownTimer 
            targetDate={new Date(raffle.draw_date)} 
            variant="lottery"
          />
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white px-5 py-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {raffle.ticketsSold.toLocaleString()} de {raffle.total_tickets.toLocaleString()} vendidos
          </span>
          <span className="font-bold text-primary">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          🎟️ <span className="font-semibold text-green-600">{raffle.ticketsAvailable.toLocaleString()}</span> boletos disponibles
        </p>
      </div>

      {/* Primary CTA */}
      <div className="px-5 py-4 bg-white">
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] hover:bg-right transition-all duration-500 shadow-xl shadow-primary/30"
            onClick={onScrollToTickets}
          >
            <Ticket className="w-5 h-5 mr-2" />
            ¡COMPRAR BOLETOS!
          </Button>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="flex flex-col items-center mt-4 text-muted-foreground"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-xs">Desliza para ver boletos</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>
    </div>
  );
}
