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
  ChevronRight,
  Check
} from "lucide-react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
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
    <div className="relative bg-ultra-dark">
      {/* Premium Header - Glassmorphism */}
      <div className="backdrop-blur-2xl border-b bg-ultra-dark/95 border-ultra-dark-subtle">
        {/* Top row: Avatar, Name, Share */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link 
            to={organization.slug ? `/${organization.slug}` : '#'}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div className="relative">
              {/* Subtle glow behind avatar */}
              <div className="absolute inset-0 blur-xl opacity-30 bg-emerald-500" />
              <Avatar className="h-11 w-11 relative border-2 flex-shrink-0 border-emerald-500/30">
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                <AvatarFallback className="font-bold text-white bg-emerald-700">
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white truncate tracking-tight">
                  {organization.name}
                </h2>
                {organization.verified && (
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                )}
              </div>
              {organization.city && (
                <p className="text-xs text-ultra-dark-muted">
                  {organization.city}
                </p>
              )}
            </div>
          </Link>
          <button
            onClick={onShare}
            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors bg-ultra-dark-card text-ultra-dark-muted"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Menu row - subtle buttons */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {organization.slug && (
            <Link to={`/${organization.slug}`}>
              <button className="h-8 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors bg-ultra-dark-card text-white/70">
                <Home className="w-3.5 h-3.5" />
                Ver sorteos
              </button>
            </Link>
          )}
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <button className="h-8 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors bg-ultra-dark-card text-white/70">
                <MessageCircle className="w-3.5 h-3.5" />
                Contactar
              </button>
            </a>
          )}
        </div>
      </div>

      {/* Image/Video Carousel */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
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

        {/* Elegant gradient overlays */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            background: 'linear-gradient(to bottom, rgba(3,7,18,0.4) 0%, transparent 30%, transparent 50%, rgba(3,7,18,0.95) 100%)' 
          }}
        />

        {/* Pagination dots - minimal white */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={`transition-all duration-200 ${
                  idx === selectedIndex 
                    ? 'w-6 h-1.5 bg-white rounded-full' 
                    : 'w-1.5 h-1.5 bg-white/40 rounded-full hover:bg-white/60'
                }`}
                aria-label={`Ir a ${item.type === 'video' ? 'video' : `imagen ${idx + 1}`}`}
              />
            ))}
          </div>
        )}

        {/* Prize info overlay - DRAMATIC PREMIUM typography */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3 pointer-events-none">
          {/* Title - Large and dramatic */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[0.95] tracking-[-0.03em]">
            {raffle.title}
          </h1>
          
          {/* Prize name with value */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white/80 text-base tracking-tight">
              {raffle.prize_name}
            </span>
            {raffle.prize_value && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 shimmer-badge">
                {formatCurrency(raffle.prize_value, currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Price Section - DRAMATIC PREMIUM */}
      <div className="py-5 px-5 bg-ultra-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-emerald-500/10 ambient-glow">
              <Ticket className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-ultra-dark-dimmed">
                Precio por boleto
              </p>
              <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-[-0.03em]">
                {formatCurrency(raffle.ticket_price, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Timer - Enterprise lottery style */}
      {raffle.draw_date && (
        <div className="py-6 px-4 bg-ultra-dark">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-center mb-4 text-ultra-dark-dimmed">
            El sorteo se realizará en
          </p>
          <CountdownTimer 
            targetDate={new Date(raffle.draw_date)} 
            variant="lottery"
          />
        </div>
      )}

      {/* Progress bar - Minimal emerald */}
      <div className="px-5 py-5 space-y-3 bg-ultra-dark">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">
            {raffle.ticketsSold.toLocaleString()} de {raffle.total_tickets.toLocaleString()} vendidos
          </span>
          <span className="font-semibold text-emerald-400">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="relative h-1.5 rounded-full overflow-hidden bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400"
          />
        </div>
        
        <p className="text-sm text-center text-ultra-dark-muted">
          <span className="font-medium text-emerald-400">
            {raffle.ticketsAvailable.toLocaleString()}
          </span>
          {' '}boletos disponibles
        </p>
      </div>

      {/* Primary CTA - White button (inverted) with premium touch feedback */}
      <div className="px-5 py-5 bg-ultra-dark">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            variant="inverted"
            size="lg"
            className="w-full h-14 text-base font-bold rounded-xl shadow-lg touch-active btn-mobile tracking-tight"
            onClick={onScrollToTickets}
          >
            Comprar Boletos
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
        
        {/* Scroll indicator - minimal */}
        <motion.div 
          className="flex flex-col items-center mt-5"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-[10px] uppercase tracking-widest text-ultra-dark-dimmed">
            Desliza para ver boletos
          </span>
          <ChevronDown className="w-4 h-4 mt-1 text-ultra-dark-dimmed" />
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
      <div className="w-full h-full flex items-center justify-center bg-ultra-dark">
        <p className="text-ultra-dark-muted">Video no disponible</p>
      </div>
    );
  }

  // Show thumbnail by default - allows swipe navigation
  if (!showVideo) {
    return (
      <div 
        className="w-full h-full relative cursor-pointer bg-black"
        onClick={() => setShowVideo(true)}
      >
        {/* Video thumbnail */}
        <img 
          src={thumbnailUrl || '/placeholder.svg'}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (thumbnailUrl?.includes('maxresdefault')) {
              target.src = thumbnailUrl.replace('maxresdefault', 'hqdefault');
            }
          }}
        />
        {/* Play button overlay - minimal */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl bg-white/15 backdrop-blur-lg">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
        {/* Hint text */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="text-white text-xs px-4 py-2 rounded-full bg-black/60">
            Toca para ver el video
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative">
      <div 
        className="absolute top-0 bottom-0 left-0 w-16 z-10 touch-pan-x"
        onClick={() => setShowVideo(false)}
      />
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
