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
    <div className="relative bg-ultra-dark overflow-hidden">
      {/* TIER S: Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* TIER S: 5 Animated background orbs */}
      <motion.div 
        className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"
        animate={{ 
          x: [0, 30, 0], 
          y: [0, -20, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1/4 left-0 w-[350px] h-[350px] bg-teal-500/8 rounded-full blur-[120px] pointer-events-none"
        animate={{ 
          x: [0, -20, 0], 
          y: [0, 25, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div 
        className="absolute top-1/3 left-1/2 w-[300px] h-[300px] bg-emerald-400/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
      <motion.div 
        className="absolute bottom-0 right-1/3 w-[280px] h-[280px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none"
        animate={{ 
          x: [0, 15, 0], 
          y: [0, -20, 0]
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 6 }}
      />
      <motion.div 
        className="absolute top-1/2 right-0 w-[250px] h-[250px] bg-teal-400/5 rounded-full blur-[120px] pointer-events-none"
        animate={{ 
          x: [0, -25, 0], 
          y: [0, 15, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 8 }}
      />
      
      {/* Premium Header - TIER S Glassmorphism */}
      <div className="relative backdrop-blur-2xl border-b bg-ultra-dark/95 border-white/[0.08]">
        {/* Top row: Avatar, Name, Share */}
        <div className="flex items-center justify-between px-5 py-4">
          <Link 
            to={organization.slug ? `/${organization.slug}` : '#'}
            className="flex items-center gap-4 flex-1 min-w-0"
          >
            <div className="relative">
              {/* Enhanced glow behind avatar */}
              <div className="absolute inset-0 blur-xl opacity-40 bg-emerald-500" />
              <Avatar className="h-14 w-14 relative border-2 flex-shrink-0 border-emerald-500/40 shadow-lg shadow-emerald-500/20">
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                <AvatarFallback className="font-bold text-white bg-gradient-to-br from-emerald-600 to-teal-600 text-lg">
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white truncate tracking-tight text-lg">
                  {organization.name}
                </h2>
                {organization.verified && (
                  <Check className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                )}
              </div>
              {organization.city && (
                <p className="text-sm text-white/50">
                  {organization.city}
                </p>
              )}
            </div>
          </Link>
          <button
            onClick={onShare}
            className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors bg-white/[0.05] hover:bg-white/[0.08] text-white/60 border border-white/[0.08]"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Menu row - TIER S subtle buttons */}
        <div className="flex items-center gap-3 px-5 pb-4">
          {organization.slug && (
            <Link to={`/${organization.slug}`}>
              <button className="h-10 px-4 text-sm font-medium rounded-xl flex items-center gap-2 transition-colors bg-white/[0.05] hover:bg-white/[0.08] text-white/70 border border-white/[0.08]">
                <Home className="w-4 h-4" />
                Ver sorteos
              </button>
            </Link>
          )}
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <button className="h-10 px-4 text-sm font-medium rounded-xl flex items-center gap-2 transition-colors bg-white/[0.05] hover:bg-white/[0.08] text-white/70 border border-white/[0.08]">
                <MessageCircle className="w-4 h-4" />
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
            background: 'linear-gradient(to bottom, rgba(3,7,18,0.5) 0%, transparent 25%, transparent 45%, rgba(3,7,18,0.97) 100%)' 
          }}
        />

        {/* Pagination dots - TIER S minimal white */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={`transition-all duration-300 ${
                  idx === selectedIndex 
                    ? 'w-8 h-2 bg-white rounded-full shadow-lg' 
                    : 'w-2 h-2 bg-white/40 rounded-full hover:bg-white/60'
                }`}
                aria-label={`Ir a ${item.type === 'video' ? 'video' : `imagen ${idx + 1}`}`}
              />
            ))}
          </div>
        )}

        {/* Prize info overlay - TIER S DRAMATIC PREMIUM typography */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4 pointer-events-none">
          {/* Title - TIER S Large and dramatic */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[0.9] tracking-[-0.04em]">
            {raffle.title}
          </h1>
          
          {/* Prize name with value */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-white/80 text-lg tracking-tight">
              {raffle.prize_name}
            </span>
            {raffle.prize_value && (
              <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-400 shimmer-badge border border-emerald-500/30">
                {formatCurrency(raffle.prize_value, currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Price Section - TIER S DRAMATIC PREMIUM */}
      <div className="relative py-8 px-6 bg-ultra-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            {/* TIER S: w-20 h-20 icon container */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 shadow-xl shadow-emerald-500/20 border border-emerald-500/20">
              <Ticket className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40 mb-1">
                Precio por boleto
              </p>
              <p className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-[-0.04em]">
                {formatCurrency(raffle.ticket_price, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Timer - TIER S Enterprise lottery style */}
      {raffle.draw_date && (
        <div className="relative py-8 px-5 bg-ultra-dark">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-center mb-5 text-white/40">
            El sorteo se realizará en
          </p>
          <CountdownTimer 
            targetDate={new Date(raffle.draw_date)} 
            variant="lottery"
          />
        </div>
      )}

      {/* Progress bar - TIER S Minimal emerald */}
      <div className="relative px-6 py-8 space-y-4 bg-ultra-dark">
        <div className="flex items-center justify-between text-base">
          <span className="text-white/60">
            {raffle.ticketsSold.toLocaleString()} de {raffle.total_tickets.toLocaleString()} vendidos
          </span>
          <span className="font-bold text-emerald-400 text-lg">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="relative h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
          />
        </div>
        
        <p className="text-base text-center text-white/50">
          <span className="font-bold text-emerald-400">
            {raffle.ticketsAvailable.toLocaleString()}
          </span>
          {' '}boletos disponibles
        </p>
      </div>

      {/* Primary CTA - TIER S White button (inverted) with premium touch feedback */}
      <div className="relative px-6 py-8 bg-ultra-dark">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            variant="inverted"
            size="lg"
            className="w-full h-16 text-lg font-bold rounded-2xl shadow-xl touch-active btn-mobile tracking-tight"
            onClick={onScrollToTickets}
          >
            Comprar Boletos
            <ChevronRight className="w-6 h-6 ml-2" />
          </Button>
        </motion.div>
        
        {/* Scroll indicator - minimal */}
        <motion.div 
          className="flex flex-col items-center mt-6"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-xs uppercase tracking-[0.2em] text-white/40">
            Desliza para ver boletos
          </span>
          <ChevronDown className="w-5 h-5 mt-1.5 text-white/40" />
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
