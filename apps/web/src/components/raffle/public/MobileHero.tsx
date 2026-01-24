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
import { cn } from "@/lib/utils";


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
  logoPosition?: 'top-left' | 'top-center' | 'top-right';
  isLightTemplate?: boolean;
  customColors?: {
    primary: string;
    secondary: string;
    fontTitle: string;
    fontBody: string;
  };
}

export function MobileHero({
  raffle,
  organization,
  currency,
  onScrollToTickets,
  onShare,
  onImageClick,
  logoPosition = 'top-left',
  isLightTemplate = false,
  customColors,
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

  // Embla carousel setup with touch/swipe enabled
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    dragFree: false,
    containScroll: 'trimSnaps',
    skipSnaps: false,
    duration: 20,
    dragThreshold: 5,
  });
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
    <div className={cn(
      "relative overflow-hidden",
      isLightTemplate ? "bg-white" : "bg-ultra-dark"
    )}>
      {/* TIER S: Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* TIER S: Animated background orbs - adaptive to light/dark */}
      {isLightTemplate ? (
        <>
          <motion.div 
            className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-200/40 rounded-full blur-[120px] pointer-events-none"
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 left-0 w-[350px] h-[350px] bg-teal-200/30 rounded-full blur-[120px] pointer-events-none"
            animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div 
            className="absolute top-1/3 left-1/2 w-[300px] h-[300px] bg-amber-100/40 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />
        </>
      ) : (
        <>
          <motion.div 
            className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 left-0 w-[350px] h-[350px] bg-teal-500/8 rounded-full blur-[120px] pointer-events-none"
            animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div 
            className="absolute top-1/3 left-1/2 w-[300px] h-[300px] bg-emerald-400/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />
          <motion.div 
            className="absolute bottom-0 right-1/3 w-[280px] h-[280px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none"
            animate={{ x: [0, 15, 0], y: [0, -20, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 6 }}
          />
          <motion.div 
            className="absolute top-1/2 right-0 w-[250px] h-[250px] bg-teal-400/5 rounded-full blur-[120px] pointer-events-none"
            animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 8 }}
          />
        </>
      )}
      
      {/* Premium Header - TIER S Glassmorphism */}
      <div className={cn(
        "relative backdrop-blur-2xl border-b",
        isLightTemplate 
          ? "bg-white/95 border-gray-200/50" 
          : "bg-ultra-dark/95 border-white/[0.08]"
      )}>
        {/* Top row: Avatar, Name, Share - Position based on logoPosition */}
        <div className={cn(
          "flex items-center px-5 py-4",
          logoPosition === 'top-center' ? "flex-col gap-3" : "justify-between"
        )}>
          {/* Share button - only show on left for right-aligned logo */}
          {logoPosition === 'top-right' && (
            <button
              onClick={onShare}
              className={cn(
                "h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors border",
                isLightTemplate
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200"
                  : "bg-white/[0.05] hover:bg-white/[0.08] text-white/60 border-white/[0.08]"
              )}
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
          
          <Link 
            to={organization.slug ? `/${organization.slug}` : '#'}
            className={cn(
              "flex items-center gap-4 min-w-0",
              logoPosition === 'top-center' ? "flex-col text-center" : "flex-1",
              logoPosition === 'top-right' && "flex-row-reverse"
            )}
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
            <div className={cn(
              "min-w-0",
              logoPosition === 'top-center' ? "text-center" : "flex-1",
              logoPosition === 'top-right' && "text-right"
            )}>
              <div className={cn(
                "flex items-center gap-2",
                logoPosition === 'top-center' && "justify-center",
                logoPosition === 'top-right' && "justify-end"
              )}>
                <h2 className={cn(
                  "font-bold truncate tracking-tight text-lg",
                  isLightTemplate ? "text-gray-900" : "text-white"
                )}>
                  {organization.name}
                </h2>
                {organization.verified && (
                  <Check className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                )}
              </div>
              {organization.city && (
                <p className={cn(
                  "text-sm",
                  isLightTemplate ? "text-gray-500" : "text-white/50"
                )}>
                  {organization.city}
                </p>
              )}
            </div>
          </Link>
          
          {/* Share button - show on right for left-aligned or centered logo */}
          {logoPosition !== 'top-right' && (
            <button
              onClick={onShare}
              className={cn(
                "h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors border",
                isLightTemplate
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200"
                  : "bg-white/[0.05] hover:bg-white/[0.08] text-white/60 border-white/[0.08]",
                logoPosition === 'top-center' && "absolute right-5 top-4"
              )}
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu row - TIER S subtle buttons */}
        <div className="flex items-center gap-3 px-5 pb-4">
          {organization.slug && (
            <Link to={`/${organization.slug}`}>
              <button className={cn(
                "h-10 px-4 text-sm font-medium rounded-xl flex items-center gap-2 transition-colors border",
                isLightTemplate
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
                  : "bg-white/[0.05] hover:bg-white/[0.08] text-white/70 border-white/[0.08]"
              )}>
                <Home className="w-4 h-4" />
                Ver sorteos
              </button>
            </Link>
          )}
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <button className={cn(
                "h-10 px-4 text-sm font-medium rounded-xl flex items-center gap-2 transition-colors border",
                isLightTemplate
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
                  : "bg-white/[0.05] hover:bg-white/[0.08] text-white/70 border-white/[0.08]"
              )}>
                <MessageCircle className="w-4 h-4" />
                Contactar
              </button>
            </a>
          )}
        </div>
      </div>

      {/* Image/Video Carousel - CLEAN, NO OVERLAY TEXT */}
      <div className="relative aspect-square w-full overflow-hidden">
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

        {/* Subtle gradient only for pagination dots visibility */}
        <div 
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{ 
            background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)' 
          }}
        />

        {/* Pagination dots - TIER S minimal white with video indicator */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={`transition-all duration-300 flex items-center justify-center ${
                  idx === selectedIndex 
                    ? item.type === 'video' 
                      ? 'w-10 h-6 bg-white rounded-full shadow-lg' 
                      : 'w-8 h-2 bg-white rounded-full shadow-lg' 
                    : 'w-2 h-2 bg-white/40 rounded-full hover:bg-white/60'
                }`}
                aria-label={`Ir a ${item.type === 'video' ? 'video' : `imagen ${idx + 1}`}`}
              >
                {/* Show play icon for video dot when selected */}
                {item.type === 'video' && idx === selectedIndex && (
                  <Play className="w-3 h-3 text-black fill-black" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Raffle Info Section - BELOW THE IMAGE, NOT OVERLAY */}
      <div className={cn(
        "relative px-6 py-6",
        isLightTemplate ? "bg-white" : "bg-ultra-dark"
      )}>
        {/* Clean title with em-dash fix for better line breaks */}
        <h1 className={cn(
          "font-black leading-[1.0] tracking-[-0.02em]",
          // Responsive font sizing with clamp
          "text-[clamp(1.75rem,6vw,2.75rem)]",
          isLightTemplate ? "text-gray-900" : "text-white"
        )}>
          {raffle.title.replace(/ - /g, ' — ')}
        </h1>
        
        {/* Prize name and value - subtle hierarchy */}
        <div className="mt-3 space-y-1">
          <p className={cn(
            "text-lg font-semibold",
            isLightTemplate ? "text-gray-800" : "text-white/90"
          )}>
            {raffle.prize_name}
          </p>
          {raffle.prize_value && (
            <p className={cn(
              "text-sm",
              isLightTemplate ? "text-gray-500" : "text-white/50"
            )}>
              Valor estimado: {formatCurrency(raffle.prize_value, currency)}
            </p>
          )}
        </div>
      </div>



      {/* Countdown Timer - TIER S Enterprise lottery style */}
      {raffle.draw_date && (
        <div className={cn(
          "relative py-8 px-5",
          isLightTemplate ? "bg-white" : "bg-ultra-dark"
        )}>
          <p className={cn(
            "text-xs font-semibold uppercase tracking-[0.25em] text-center mb-5",
            isLightTemplate ? "text-gray-400" : "text-white/40"
          )}>
            El sorteo se realizará en
          </p>
          <CountdownTimer 
            targetDate={new Date(raffle.draw_date)} 
            variant="lottery"
          />
        </div>
      )}

      {/* Progress bar - TIER S Minimal emerald */}
      <div className={cn(
        "relative px-6 py-8 space-y-4",
        isLightTemplate ? "bg-white" : "bg-ultra-dark"
      )}>
        <div className="flex items-center justify-between text-base">
          <span className={isLightTemplate ? "text-gray-500" : "text-white/60"}>
            {raffle.ticketsSold.toLocaleString()} de {raffle.total_tickets.toLocaleString()} vendidos
          </span>
          <span className="font-bold text-emerald-500 text-lg">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className={cn(
          "relative h-2.5 rounded-full overflow-hidden",
          isLightTemplate ? "bg-gray-100" : "bg-white/[0.06]"
        )}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
          />
        </div>
        
        <p className={cn(
          "text-base text-center",
          isLightTemplate ? "text-gray-500" : "text-white/50"
        )}>
          <span className="font-bold text-emerald-500">
            {raffle.ticketsAvailable.toLocaleString()}
          </span>
          {' '}boletos disponibles
        </p>
      </div>

      {/* Primary CTA - TIER S button with premium touch feedback */}
      <div className={cn(
        "relative px-6 py-8",
        isLightTemplate ? "bg-white" : "bg-ultra-dark"
      )}>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            variant={isLightTemplate ? "default" : "inverted"}
            size="lg"
            className="w-full h-16 text-lg font-bold rounded-2xl shadow-xl touch-active btn-mobile tracking-tight"
            style={customColors?.primary ? {
              backgroundColor: customColors.primary,
              color: '#ffffff',
            } : undefined}
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
          <span className={cn(
            "text-xs uppercase tracking-[0.2em]",
            isLightTemplate ? "text-gray-400" : "text-white/40"
          )}>
            Desliza para ver boletos
          </span>
          <ChevronDown className={cn(
            "w-5 h-5 mt-1.5",
            isLightTemplate ? "text-gray-400" : "text-white/40"
          )} />
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
        <p className="text-white/50">Video no disponible</p>
      </div>
    );
  }

  // Show thumbnail by default - allows swipe navigation
  if (!showVideo) {
    return (
      <div 
        className="w-full h-full relative cursor-pointer bg-black"
        onClick={(e) => {
          e.stopPropagation();
          setShowVideo(true);
        }}
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
        {/* Play button overlay - premium glassmorphism */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl bg-white/20 backdrop-blur-xl border border-white/20">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </div>
        {/* Hint text */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="text-white text-sm font-medium px-5 py-2.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10">
            Toca para ver el video
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative">
      {/* Edge zones to exit video on swipe */}
      <div 
        className="absolute top-0 bottom-0 left-0 w-16 z-10 touch-pan-x"
        onClick={(e) => {
          e.stopPropagation();
          setShowVideo(false);
        }}
      />
      <div 
        className="absolute top-0 bottom-0 right-0 w-16 z-10 touch-pan-x"
        onClick={(e) => {
          e.stopPropagation();
          setShowVideo(false);
        }}
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
        onClick={(e) => {
          e.stopPropagation();
          setShowVideo(false);
        }}
        className="absolute top-4 right-4 z-20 bg-black/70 text-white rounded-full p-2.5 hover:bg-black/90 transition-colors backdrop-blur-sm border border-white/10"
        aria-label="Cerrar video"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}
