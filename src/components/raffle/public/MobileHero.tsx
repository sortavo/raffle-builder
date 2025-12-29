import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Ticket, 
  Share2, 
  ChevronDown, 
  Home, 
  MessageCircle, 
  Play,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/currency-utils";
import { CountdownTimer } from "./CountdownTimer";
import { getVideoEmbedUrl } from "@/lib/video-utils";

interface MobileHeroProps {
  raffle: {
    title: string;
    prize_name: string;
    prize_images?: string[] | null;
    prize_video_url?: string | null;
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
    city?: string | null;
    whatsapp_number?: string | null;
  };
  currency: string;
  onScrollToTickets: () => void;
  onShare: () => void;
  onImageClick?: (index: number) => void;
}

export function MobileHero({
  raffle,
  organization,
  currency,
  onScrollToTickets,
  onShare,
  onImageClick,
}: MobileHeroProps) {
  const images = raffle.prize_images || [];
  const hasVideo = !!raffle.prize_video_url;
  const progress = (raffle.ticketsSold / raffle.total_tickets) * 100;

  // Build media items: images first, then video as last slide
  const mediaItems: Array<{ type: 'image' | 'video'; url: string }> = [
    ...images.map(url => ({ type: 'image' as const, url })),
    ...(hasVideo ? [{ type: 'video' as const, url: raffle.prize_video_url! }] : []),
  ];

  // Fallback if no media
  if (mediaItems.length === 0) {
    mediaItems.push({ type: 'image', url: '/placeholder.svg' });
  }

  // Embla carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  // WhatsApp link
  const whatsappLink = organization.whatsapp_number
    ? `https://wa.me/${organization.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre el sorteo "${raffle.title}"`)}`
    : null;

  return (
    <div className="relative bg-background">
      {/* Expanded Header */}
      <div className="bg-card border-b border-border">
        {/* Top row: Avatar, Name, Share */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link 
            to={organization.slug ? `/${organization.slug}` : '#'}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <Avatar className="h-12 w-12 border-2 border-primary shadow-md flex-shrink-0">
              <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {organization.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-foreground truncate">
                  {organization.name}
                </h2>
                {organization.verified && (
                  <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0 flex-shrink-0">
                    ✓
                  </Badge>
                )}
              </div>
              {organization.city && (
                <p className="text-xs text-muted-foreground">
                  📍 {organization.city}
                </p>
              )}
            </div>
          </Link>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="h-10 w-10 flex-shrink-0"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Menu row */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {organization.slug && (
            <Link to={`/${organization.slug}`}>
              <Button variant="secondary" size="sm" className="h-8 text-xs">
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Ver sorteos
              </Button>
            </Link>
          )}
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" className="h-8 text-xs">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Contactar
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Image/Video Carousel with Swipe */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <div className="overflow-hidden h-full" ref={emblaRef}>
          <div className="flex h-full">
            {mediaItems.map((item, idx) => (
              <div 
                key={idx} 
                className="flex-[0_0_100%] min-w-0 relative"
                onClick={() => item.type === 'image' && onImageClick?.(idx)}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={`${raffle.prize_name} ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                  />
                ) : (
                  <VideoSlide videoUrl={item.url} title={raffle.prize_name} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gradient overlay on images */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Pagination dots */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={`transition-all duration-200 ${
                  idx === selectedIndex 
                    ? 'w-6 h-2 bg-white rounded-full' 
                    : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/70'
                }`}
                aria-label={`Ir a ${item.type === 'video' ? 'video' : `imagen ${idx + 1}`}`}
              >
                {item.type === 'video' && idx !== selectedIndex && (
                  <Play className="w-2 h-2 fill-current" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Prize info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3 pointer-events-none">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-1">
              <Trophy className="w-3.5 h-3.5 mr-1" />
              SORTEO
            </Badge>
            <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-xs">
              🎟️ {raffle.ticketsSold.toLocaleString()} vendidos
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

      {/* Ticket Price - Elegant dark style */}
      <div className="bg-gray-900 py-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                Precio por boleto
              </p>
              <p className="text-3xl font-black text-white">
                {formatCurrency(raffle.ticket_price, currency)}
              </p>
            </div>
          </div>
          <div className="text-4xl">🎟️</div>
        </div>
      </div>

      {/* Countdown Timer - Clean light style */}
      {raffle.draw_date && (
        <div className="bg-muted py-5 px-4">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider text-center mb-3">
            El sorteo se realizará en
          </p>
          <CountdownTimer 
            targetDate={new Date(raffle.draw_date)} 
            variant="lottery"
          />
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-background px-5 py-4 space-y-3">
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
            className="absolute inset-y-0 left-0 bg-primary rounded-full"
          />
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          🎟️ <span className="font-semibold text-green-600">{raffle.ticketsAvailable.toLocaleString()}</span> boletos disponibles
        </p>
      </div>

      {/* Primary CTA */}
      <div className="px-5 py-4 bg-background">
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg"
            onClick={onScrollToTickets}
          >
            <Ticket className="w-5 h-5 mr-2" />
            ¡COMPRAR BOLETOS!
            <ChevronRight className="w-5 h-5 ml-2" />
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

// Video slide component with thumbnail and swipe layers
function VideoSlide({ videoUrl, title }: { videoUrl: string; title: string }) {
  const [showVideo, setShowVideo] = useState(false);
  const { embedUrl, thumbnailUrl } = getVideoEmbedUrl(videoUrl);

  if (!embedUrl) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <p className="text-white/60">Video no disponible</p>
      </div>
    );
  }

  // Show thumbnail by default - allows swipe navigation
  if (!showVideo) {
    return (
      <div 
        className="w-full h-full bg-black relative cursor-pointer"
        onClick={() => setShowVideo(true)}
      >
        {/* Video thumbnail */}
        <img 
          src={thumbnailUrl || '/placeholder.svg'}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to medium quality thumbnail if maxres fails
            const target = e.target as HTMLImageElement;
            if (thumbnailUrl?.includes('maxresdefault')) {
              target.src = thumbnailUrl.replace('maxresdefault', 'hqdefault');
            }
          }}
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </div>
        {/* Hint text */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="text-white text-sm bg-black/60 px-4 py-2 rounded-full">
            Toca para ver el video
          </span>
        </div>
      </div>
    );
  }

  // Once activated, show the iframe with swipe layers on edges
  return (
    <div className="w-full h-full bg-black relative">
      {/* Left swipe layer - allows swiping back */}
      <div 
        className="absolute top-0 bottom-0 left-0 w-16 z-10 touch-pan-x"
        onClick={() => setShowVideo(false)}
      />
      {/* Right swipe layer - allows swiping forward */}
      <div 
        className="absolute top-0 bottom-0 right-0 w-16 z-10 touch-pan-x"
        onClick={() => setShowVideo(false)}
      />
      
      <iframe
        src={embedUrl}
        title={title || "Video del premio"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
        loading="lazy"
      />
      
      {/* Close button to return to thumbnail */}
      <button
        onClick={() => setShowVideo(false)}
        className="absolute top-4 right-4 z-20 bg-black/70 text-white rounded-full p-2 hover:bg-black/90 transition-colors"
        aria-label="Cerrar video"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}
