import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  Ticket, 
  Share2, 
  Shield, 
  CheckCircle2, 
  ChevronRight,
  ChevronLeft,
  Zap,
  Users,
  Eye,
  Play,
  Gift,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency-utils";
import { RaffleTemplate } from "@/lib/raffle-utils";
import { ViewersCount } from "@/components/marketing/ViewersCount";
import { UrgencyBadge } from "@/components/marketing/UrgencyBadge";
import { getVideoEmbedUrl } from "@/lib/video-utils";
import { PrizeShowcase } from "@/components/raffle/public/PrizeShowcase";
import { PrizeVideoPlayer } from "@/components/raffle/public/PrizeVideoPlayer";
import { PrizeLightbox } from "@/components/raffle/public/PrizeLightbox";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

interface TemplateHeroLayoutProps {
  raffle: {
    title: string;
    description?: string | null;
    prize_name: string;
    prize_images?: string[] | null;
    prize_video_url?: string | null;
    prize_value?: number | null;
    ticket_price: number;
    draw_date?: string | null;
    ticketsSold: number;
    ticketsAvailable: number;
    total_tickets: number;
    prizes?: any[];
    prize_display_mode?: string;
  };
  organization: {
    name: string;
    logo_url?: string | null;
    slug?: string | null;
    verified?: boolean | null;
  };
  template: RaffleTemplate;
  currency: string;
  isScrolled: boolean;
  isFromOrganization: boolean;
  showViewersCount: boolean;
  showUrgencyBadge: boolean;
  showGallery: boolean;
  showVideo: boolean;
  showStats: boolean;
  onScrollToTickets: () => void;
  onShare: () => void;
  logoPosition?: 'top-left' | 'top-center' | 'top-right';
  isLightTemplate?: boolean;
  customColors?: {
    primary: string;
    secondary: string;
    fontTitle: string;
    fontBody: string;
  };
}

export function TemplateHeroLayout({
  raffle,
  organization,
  template,
  currency,
  isScrolled,
  isFromOrganization,
  showViewersCount,
  showUrgencyBadge,
  showGallery,
  showVideo,
  showStats,
  onScrollToTickets,
  onShare,
  logoPosition = 'top-center',
  isLightTemplate = false,
  customColors,
}: TemplateHeroLayoutProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { fonts, effects, layout } = template;
  const { heroStyle, galleryStyle, pricePosition, contentAlignment, decorations } = layout;

  const progress = (raffle.ticketsSold / raffle.total_tickets) * 100;
  const mainImage = raffle.prize_images?.[0] || '/placeholder.svg';

  // Premium Header - Theme-adaptive Glassmorphism
  const Header = () => (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-500 ease-out",
        isLightTemplate
          ? (isScrolled 
              ? 'bg-white/95 backdrop-blur-2xl shadow-lg border-b border-gray-200' 
              : 'bg-white/80 backdrop-blur-xl')
          : (isScrolled 
              ? 'bg-[#030712]/95 backdrop-blur-2xl shadow-2xl border-b border-white/[0.06]' 
              : 'bg-[#030712]/80 backdrop-blur-xl')
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top nav row */}
        <div 
          className={cn(
            "flex items-center justify-between overflow-hidden transition-all duration-500 ease-out border-b",
            isLightTemplate ? "border-gray-200" : "border-white/[0.06]",
            isScrolled ? 'h-0 opacity-0 border-transparent' : 'h-10 opacity-100'
          )}
        >
          {isFromOrganization ? (
            <Link 
              to={`/${organization.slug}`}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-all group",
                isLightTemplate 
                  ? "text-gray-500 hover:text-gray-900" 
                  : "text-white/50 hover:text-white"
              )}
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Volver a {organization.name}</span>
            </Link>
          ) : (
            <div />
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className={cn(
              "text-xs h-8 px-3",
              isLightTemplate
                ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                : "text-white/50 hover:text-white hover:bg-white/[0.05]"
            )}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Compartir
          </Button>
        </div>

        {/* Organization branding - Position based on logoPosition */}
        <div 
          className={`flex items-center transition-all duration-500 ease-out ${
            isScrolled ? 'py-2' : 'py-5'
          } ${
            logoPosition === 'top-center' ? 'justify-center' :
            logoPosition === 'top-right' ? 'justify-end' : 'justify-start'
          }`}
        >
          <Link 
            to={organization.slug ? `/${organization.slug}` : "#"}
            className={`flex items-center gap-3 group transition-all duration-500 ${
              isScrolled ? 'flex-row' : 
              logoPosition === 'top-center' ? 'flex-col' : 'flex-row'
            }`}
          >
            <div className="relative">
              {/* Custom color glow behind avatar */}
              <div 
                className={`absolute inset-0 blur-xl transition-all duration-500 ${
                  isScrolled ? 'opacity-20' : 'opacity-40 group-hover:opacity-60'
                }`}
                style={{ backgroundColor: customColors?.primary || template.colors.primary }}
              />
              <Avatar 
                className={`relative border-2 shadow-xl transition-all duration-500 group-hover:scale-105 ${
                  isScrolled ? 'h-10 w-10' : 'h-16 w-16'
                }`}
                style={{ borderColor: `${customColors?.primary || template.colors.primary}50` }}
              >
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} className="object-cover" />
                <AvatarFallback 
                  className={`font-bold text-white transition-all duration-500 ${
                    isScrolled ? 'text-sm' : 'text-xl'
                  }`}
                  style={{ backgroundColor: customColors?.primary || template.colors.primary }}
                >
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className={cn(
              "transition-all duration-500",
              isScrolled ? 'space-y-0' : 'space-y-1.5',
              logoPosition === 'top-center' && !isScrolled ? 'text-center' :
              logoPosition === 'top-right' ? 'text-right' : 'text-left'
            )}>
              <h2 
                className={cn(
                  "font-bold tracking-wider uppercase transition-all duration-500 group-hover:opacity-80",
                  isLightTemplate ? "text-gray-900" : "text-white",
                  isScrolled ? 'text-base' : 'text-lg sm:text-xl'
                )}
              >
                {organization.name}
              </h2>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );

  // Video slide component for gallery integration
  const [videoPlaying, setVideoPlaying] = useState(false);
  
  const VideoSlide = ({ videoUrl, className = "" }: { videoUrl: string; className?: string }) => {
    const { type, embedUrl } = getVideoEmbedUrl(videoUrl);
    
    // Extract YouTube thumbnail
    const getYouTubeThumbnail = (url: string) => {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
      return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : null;
    };
    
    const thumbnail = type === 'youtube' ? getYouTubeThumbnail(videoUrl) : null;
    
    if (!embedUrl || !type) return null;
    
    if (!videoPlaying && thumbnail) {
      return (
        <div 
          className={`aspect-video rounded-2xl overflow-hidden relative cursor-pointer group shadow-2xl border border-white/[0.06] ${className}`}
          onClick={() => setVideoPlaying(true)}
        >
          <img 
            src={thumbnail} 
            alt="Video del premio"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform border border-white/30">
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-2">
            <Play className="w-4 h-4" />
            Video del Premio
          </div>
        </div>
      );
    }
    
    return (
      <div className={`aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06] bg-black ${className}`}>
        <iframe
          src={embedUrl}
          title="Video del premio"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  };

  // Check if video should be included in gallery
  const hasVideo = showVideo && !!raffle.prize_video_url;

  // Unified media items array: images + video as last item
  type MediaItem = { type: 'image'; url: string } | { type: 'video'; url: string };
  const images = raffle.prize_images || [];
  
  const mediaItems: MediaItem[] = [
    ...images.map(url => ({ type: 'image' as const, url })),
    ...(hasVideo && raffle.prize_video_url ? [{ type: 'video' as const, url: raffle.prize_video_url }] : []),
  ];

  // State for current media index in gallery
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const currentItem = mediaItems[currentMediaIndex];

  // Helper to get YouTube thumbnail
  const getYouTubeThumbnailUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : null;
  };

  // Gallery component with premium styling - VIDEO ALWAYS INTEGRATED AS NAVIGABLE SLIDE
  const GalleryComponent = () => {
    // If no media items, return null
    if (mediaItems.length === 0) return null;
    if (!showGallery && !hasVideo) return null;

    // Navigation functions
    const canGoPrev = currentMediaIndex > 0;
    const canGoNext = currentMediaIndex < mediaItems.length - 1;
    const goToPrev = () => {
      if (canGoPrev) {
        setCurrentMediaIndex(prev => prev - 1);
        setVideoPlaying(false);
      }
    };
    const goToNext = () => {
      if (canGoNext) {
        setCurrentMediaIndex(prev => prev + 1);
        setVideoPlaying(false);
      }
    };

    // Render current item (image or video) with navigation arrows
    const renderCurrentItem = (aspectClass = "aspect-[16/10]") => {
      if (!currentItem) return null;
      
      const showArrows = mediaItems.length > 1;
      
      return (
        <div className="relative group">
          {currentItem.type === 'image' ? (
            <motion.div 
              key={currentMediaIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${aspectClass} rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06] cursor-pointer`}
              onClick={() => {
                if (currentItem.type === 'image') {
                  setLightboxIndex(currentMediaIndex);
                  setLightboxOpen(true);
                }
              }}
            >
              <img 
                src={currentItem.url} 
                alt={raffle.prize_name} 
                className="w-full h-full object-cover"
              />
            </motion.div>
          ) : (
            <motion.div
              key={`video-${currentMediaIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <VideoSlide videoUrl={currentItem.url} className={`${aspectClass} !rounded-2xl`} />
            </motion.div>
          )}
          
          {/* Navigation arrows */}
          {showArrows && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                disabled={!canGoPrev}
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all ${
                  canGoPrev 
                    ? 'opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:scale-110 cursor-pointer' 
                    : 'opacity-0 cursor-not-allowed'
                }`}
                aria-label="Anterior"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                disabled={!canGoNext}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all ${
                  canGoNext 
                    ? 'opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:scale-110 cursor-pointer' 
                    : 'opacity-0 cursor-not-allowed'
                }`}
                aria-label="Siguiente"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>
      );
    };

    // Render thumbnails for all media items
    const renderThumbnails = () => {
      if (mediaItems.length <= 1) return null;
      
      return (
        <div className="flex gap-2 mt-4 justify-center flex-wrap">
          {mediaItems.map((item, idx) => (
            <motion.div 
              key={idx}
              className={`w-20 h-20 rounded-xl overflow-hidden shadow-md cursor-pointer border-2 transition-all ${
                idx === currentMediaIndex 
                  ? 'border-emerald-500 ring-2 ring-emerald-500/50' 
                  : 'border-white/10 hover:border-white/30'
              }`}
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                setCurrentMediaIndex(idx);
                // Reset video playing state when switching
                if (item.type !== 'video') {
                  setVideoPlaying(false);
                }
              }}
            >
              {item.type === 'image' ? (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="relative w-full h-full">
                  <img 
                    src={getYouTubeThumbnailUrl(item.url) || ''} 
                    alt="Video" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" fill="white" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      );
    };

    switch (galleryStyle) {
      case 'grid':
        return (
          <div className="space-y-4">
            {renderCurrentItem("aspect-[16/10]")}
            <div className="grid grid-cols-4 gap-2">
              {mediaItems.map((item, idx) => (
                <motion.div 
                  key={idx}
                  className={`aspect-square rounded-lg overflow-hidden cursor-pointer shadow-lg border-2 transition-all ${
                    idx === currentMediaIndex 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/50' 
                      : 'border-white/[0.06] hover:border-white/20'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setCurrentMediaIndex(idx);
                    if (item.type !== 'video') setVideoPlaying(false);
                  }}
                >
                  {item.type === 'image' ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="relative w-full h-full">
                      <img 
                        src={getYouTubeThumbnailUrl(item.url) || ''} 
                        alt="Video" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white" fill="white" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        );
      
      case 'single-focus':
        return (
          <div className="space-y-4">
            <div className="relative">
              {renderCurrentItem("aspect-[4/3]")}
              {mediaItems.length > 1 && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {mediaItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentMediaIndex(idx);
                        if (item.type !== 'video') setVideoPlaying(false);
                      }}
                      className={`w-3 h-3 rounded-full transition-all ${
                        idx === currentMediaIndex 
                          ? 'bg-emerald-400 scale-125' 
                          : 'bg-white/30 hover:bg-white/50'
                      } ${item.type === 'video' ? 'ring-1 ring-white/50' : ''}`}
                      aria-label={item.type === 'video' ? 'Ver video' : `Ver imagen ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'masonry':
        return (
          <div className="space-y-4">
            {renderCurrentItem("aspect-[16/10]")}
            <div className="grid grid-cols-4 gap-2">
              {mediaItems.slice(0, 4).map((item, idx) => (
                <motion.div 
                  key={idx}
                  className={`aspect-square rounded-lg overflow-hidden cursor-pointer shadow-lg border-2 transition-all ${
                    idx === currentMediaIndex 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/50' 
                      : 'border-white/[0.06] hover:border-white/20'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    setCurrentMediaIndex(idx);
                    if (item.type !== 'video') setVideoPlaying(false);
                  }}
                >
                  {item.type === 'image' ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="relative w-full h-full">
                      <img 
                        src={getYouTubeThumbnailUrl(item.url) || ''} 
                        alt="Video" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white" fill="white" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        );
      
      case 'carousel':
      default:
        return (
          <div className="space-y-4">
            {renderCurrentItem("aspect-[16/10]")}
            {renderThumbnails()}
          </div>
        );
    }
  };

  // Price display with premium styling
  const PriceDisplay = () => {
    const priceContent = (
      <div className={cn(isLightTemplate ? "text-white" : "text-white")}>
        <p className="text-xs font-medium text-white/90">Valor del Premio</p>
        <p className="text-2xl font-bold">
          {formatCurrency(Number(raffle.prize_value), currency)}
        </p>
      </div>
    );

    if (!raffle.prize_value) return null;

    switch (pricePosition) {
      case 'overlay':
        return (
          <div className="absolute bottom-4 left-4 px-6 py-3 rounded-2xl shadow-xl pointer-events-none bg-gradient-to-r from-emerald-600 to-teal-600">
            {priceContent}
          </div>
        );
      case 'badge':
        return (
          <div className="absolute top-4 left-4 px-4 py-2 rounded-full shadow-xl pointer-events-none bg-gradient-to-r from-emerald-600 to-teal-600">
            <p className="text-white font-bold">{formatCurrency(Number(raffle.prize_value), currency)}</p>
          </div>
        );
      case 'side':
      case 'below':
      default:
        return null;
    }
  };

  // Get brand colors for dynamic styling
  const brandPrimary = customColors?.primary || template.colors.primary;
  const brandSecondary = customColors?.secondary || template.colors.secondary;

  // Split InfoSection into modular parts for Visual-First layout
  const HeaderBadges = () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div 
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white shadow-lg animate-pulse"
        style={{ 
          background: `linear-gradient(135deg, ${brandPrimary}, ${brandSecondary})`,
          boxShadow: `0 10px 25px -5px ${brandPrimary}40`
        }}
      >
        <Zap className="w-4 h-4" />
        Sorteo Activo
      </div>
      {showViewersCount && <ViewersCount />}
    </div>
  );

  const TitleSection = () => (
    <div className="space-y-4 text-center">
      {showUrgencyBadge && raffle.draw_date && (
        <div className="flex justify-center mb-6">
          <UrgencyBadge
            drawDate={raffle.draw_date}
            totalTickets={raffle.total_tickets}
            ticketsSold={raffle.ticketsSold}
          />
        </div>
      )}
      <motion.h1 
        className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.9] tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          backgroundImage: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 50%, ${brandPrimary} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {raffle.title}
      </motion.h1>
    </div>
  );

  const DescriptionSection = () => (
    raffle.description ? (
      <div className="text-center max-w-3xl mx-auto">
        <p className={cn(
          "text-base sm:text-lg lg:text-xl",
          isLightTemplate ? "text-gray-600" : "text-gray-300"
        )}>
          {raffle.description}
        </p>
      </div>
    ) : null
  );

  const PrizesSection = () => (
    <div className="flex justify-center">
      <PrizeShowcase 
        raffle={raffle as any}
        prizes={raffle.prizes || []}
        displayMode={(raffle.prize_display_mode as any) || 'hierarchical'}
        currency={currency}
        primaryColor={brandPrimary}
        accentColor={brandSecondary}
        textColor={isLightTemplate ? "#111827" : "#ffffff"}
        textMuted={isLightTemplate ? "rgba(75,85,99,0.8)" : "rgba(255,255,255,0.6)"}
        cardBg={isLightTemplate ? "rgba(249,250,251,1)" : "rgba(255,255,255,0.03)"}
        isDarkTemplate={!isLightTemplate}
        excludePreDraws={true}
      />
    </div>
  );

  const StatsCards = () => {
    const cardStyle = isLightTemplate 
      ? { 
          backgroundColor: 'white',
          boxShadow: `0 10px 25px -10px ${brandPrimary}15, 0 4px 6px -4px rgba(0,0,0,0.05)`,
        }
      : { 
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
        };

    const iconStyle = {
      background: `linear-gradient(135deg, ${brandPrimary}, ${brandSecondary})`,
      boxShadow: `0 8px 20px -5px ${brandPrimary}40`,
    };

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
        <motion.div 
          className={cn(
            "p-5 rounded-2xl transition-all duration-300 text-center border-2",
            isLightTemplate
              ? "border-gray-100 hover:border-opacity-100"
              : "border-white/10 hover:border-white/20"
          )}
          style={cardStyle}
          whileHover={{ scale: 1.03, borderColor: brandPrimary }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={iconStyle}>
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className={cn("text-sm", isLightTemplate ? "text-gray-500" : "text-gray-400")}>Precio</p>
              <p className={cn("text-xl font-bold", isLightTemplate ? "text-gray-900" : "text-white")}>
                {formatCurrency(raffle.ticket_price, currency)}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          className={cn(
            "p-5 rounded-2xl transition-all duration-300 text-center border-2",
            isLightTemplate
              ? "border-gray-100 hover:border-opacity-100"
              : "border-white/10 hover:border-white/20"
          )}
          style={cardStyle}
          whileHover={{ scale: 1.03, borderColor: brandPrimary }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={iconStyle}>
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className={cn("text-sm", isLightTemplate ? "text-gray-500" : "text-gray-400")}>Sorteo</p>
              <p className={cn("text-xl font-bold", isLightTemplate ? "text-gray-900" : "text-white")}>
                {raffle.draw_date 
                  ? format(new Date(raffle.draw_date), 'dd MMM', { locale: es })
                  : 'Por definir'
                }
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          className={cn(
            "p-5 rounded-2xl transition-all duration-300 text-center border-2",
            isLightTemplate
              ? "border-gray-100 hover:border-opacity-100"
              : "border-white/10 hover:border-white/20"
          )}
          style={cardStyle}
          whileHover={{ scale: 1.03, borderColor: brandPrimary }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={iconStyle}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className={cn("text-sm", isLightTemplate ? "text-gray-500" : "text-gray-400")}>Boletos</p>
              <p className={cn("text-xl font-bold", isLightTemplate ? "text-gray-900" : "text-white")}>
                {raffle.total_tickets.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          className={cn(
            "p-5 rounded-2xl transition-all duration-300 text-center border-2",
            isLightTemplate
              ? "border-gray-100 hover:border-opacity-100"
              : "border-white/10 hover:border-white/20"
          )}
          style={cardStyle}
          whileHover={{ scale: 1.03, borderColor: brandPrimary }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={iconStyle}>
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className={cn("text-sm", isLightTemplate ? "text-gray-500" : "text-gray-400")}>Vendidos</p>
              <p className="text-xl font-bold" style={{ color: brandPrimary }}>
                {raffle.ticketsSold.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const ProgressSection = () => (
    showStats ? (
      <div className="space-y-3 max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-sm">
          <span className={cn("font-medium", isLightTemplate ? "text-gray-700" : "text-gray-200")}>
            {raffle.ticketsSold} de {raffle.total_tickets} vendidos
          </span>
          <span className="font-bold" style={{ color: brandPrimary }}>
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className={cn(
          "relative h-3 rounded-full overflow-hidden",
          isLightTemplate ? "bg-gray-200" : "bg-gray-800"
        )}>
          <motion.div 
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: `linear-gradient(90deg, ${brandPrimary}, ${brandSecondary})` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progress, 2)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        
        {raffle.ticketsSold === 0 ? (
          <p className="text-sm text-center font-medium animate-pulse" style={{ color: brandPrimary }}>
            ¡Sé el primero en participar!
          </p>
        ) : (
          <p className={cn("text-sm text-center", isLightTemplate ? "text-gray-500" : "text-gray-400")}>
            {raffle.ticketsAvailable} boletos disponibles
          </p>
        )}
      </div>
    ) : null
  );

  const CTASection = () => (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <motion.div 
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.03 }}
      >
        <Button
          size="lg"
          className="text-lg px-12 py-7 font-bold transition-all duration-300"
          style={{
            backgroundColor: brandPrimary,
            color: '#ffffff',
            boxShadow: `0 20px 40px -10px ${brandPrimary}50`,
          }}
          onClick={onScrollToTickets}
        >
          <Ticket className="w-5 h-5 mr-2" />
          Comprar Boletos
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
      
      <motion.div 
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
      >
        <Button
          size="lg"
          variant="outline"
          className={cn(
            "px-10 py-7 transition-all duration-300",
            isLightTemplate
              ? "border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
              : "border-2 border-white/20 text-white hover:bg-white/[0.05]"
          )}
          style={{
            '--hover-border': brandPrimary,
          } as React.CSSProperties}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = brandPrimary}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = isLightTemplate ? '#d1d5db' : 'rgba(255,255,255,0.2)'}
          onClick={onShare}
        >
          <Share2 className="w-5 h-5 mr-2" />
          Compartir
        </Button>
      </motion.div>
    </div>
  );

  const TrustBadges = () => (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-6 pt-6 border-t",
      isLightTemplate ? "border-gray-200" : "border-white/10"
    )}>
      <div className={cn("flex items-center gap-2 text-sm", isLightTemplate ? "text-gray-500" : "text-gray-400")}>
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${brandPrimary}15` }}
        >
          <Shield className="w-4 h-4" style={{ color: brandPrimary }} />
        </div>
        <span>Pago Seguro</span>
      </div>
      <div className={cn("flex items-center gap-2 text-sm", isLightTemplate ? "text-gray-500" : "text-gray-400")}>
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${brandPrimary}15` }}
        >
          <CheckCircle2 className="w-4 h-4" style={{ color: brandPrimary }} />
        </div>
        <span>Verificable</span>
      </div>
      <div className={cn("flex items-center gap-2 text-sm", isLightTemplate ? "text-gray-500" : "text-gray-400")}>
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${brandPrimary}15` }}
        >
          <Users className="w-4 h-4" style={{ color: brandPrimary }} />
        </div>
        <span>{raffle.ticketsSold}+ participantes</span>
      </div>
    </div>
  );

  // Legacy InfoSection for other layouts
  const InfoSection = ({ className = "" }: { className?: string }) => (
    <div className={`space-y-8 ${className}`}>
      <HeaderBadges />
      <TitleSection />
      <DescriptionSection />
      <PrizesSection />
      <StatsCards />
      <ProgressSection />
      <CTASection />
      <TrustBadges />
    </div>
  );

  // Pattern overlay for festive/sports templates
  const PatternOverlay = () => {
    if (!decorations.includes('patterns') || !effects.pattern) return null;
    return (
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: effects.pattern, backgroundSize: '20px 20px' }}
      />
    );
  };

  // Confetti effect for festive template
  const ConfettiDecoration = () => {
    if (!decorations.includes('confetti')) return null;
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              backgroundColor: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#14b8a6' : '#8b5cf6',
              left: `${Math.random() * 100}%`,
              top: -20,
            }}
            animate={{
              y: [0, 1000],
              rotate: [0, 360],
              opacity: [1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>
    );
  };

  // Render based on hero style
  const renderHero = () => {
    switch (heroStyle) {
      case 'centered':
        return (
          <div className="relative py-12 lg:py-20">
            <PatternOverlay />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center gap-10">
                <div className="w-full max-w-2xl">
                  <div className="relative">
                    <GalleryComponent />
                    <PriceDisplay />
                  </div>
                  {showVideo && raffle.prize_video_url && (
                    <PrizeVideoPlayer 
                      videoUrl={raffle.prize_video_url} 
                      title={raffle.prize_name}
                      className="mt-6"
                    />
                  )}
                </div>
                <InfoSection className="max-w-2xl" />
              </div>
            </div>
          </div>
        );
      
      case 'full-width':
        return (
          <div className="relative">
            <ConfettiDecoration />
            <PatternOverlay />
            
            {/* Full-width hero image */}
            <div className="relative h-[50vh] lg:h-[60vh] overflow-hidden">
              <img 
                src={mainImage} 
                alt={raffle.prize_name}
                className="w-full h-full object-cover"
              />
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t to-transparent",
                isLightTemplate 
                  ? "from-white via-white/50"
                  : "from-[#030712] via-[#030712]/50"
              )} />
              <PriceDisplay />
              
              {showStats && (
                <div className={cn(
                  "absolute top-4 right-4 px-4 py-2 backdrop-blur-xl rounded-full shadow-lg",
                  isLightTemplate
                    ? "bg-white/90 border border-gray-200"
                    : "bg-white/[0.03] border border-white/[0.06]"
                )}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className={cn(
                      "text-sm font-semibold",
                      isLightTemplate ? "text-gray-900" : "text-white"
                    )}>
                      {raffle.ticketsSold} vendidos
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Content below */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
              <motion.div 
                className={cn(
                  "p-8 rounded-2xl shadow-2xl backdrop-blur-xl",
                  isLightTemplate
                    ? "bg-white/95 border border-gray-200"
                    : "bg-white/[0.03] border border-white/[0.06]"
                )}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <InfoSection />
              </motion.div>
            </div>
            
            {/* Thumbnail gallery */}
            {showGallery && raffle.prize_images && raffle.prize_images.length > 1 && (
              <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex gap-3 justify-center">
                  {raffle.prize_images.slice(0, 5).map((img, idx) => (
                    <motion.div 
                      key={idx}
                      className={cn(
                        "w-16 h-16 rounded-lg overflow-hidden shadow-md cursor-pointer border-2",
                        idx === 0 ? 'border-emerald-500' : (isLightTemplate ? 'border-gray-200' : 'border-white/10')
                      )}
                      whileHover={{ scale: 1.1 }}
                      onClick={() => {
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'asymmetric':
        return (
          <div className="relative py-12 lg:py-20">
            <PatternOverlay />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
                {/* Text content - takes 5 columns */}
                <div className="lg:col-span-5 order-2 lg:order-1 lg:sticky lg:top-32">
                  <InfoSection />
                </div>
                
                {/* Gallery - takes 7 columns */}
                <div className="lg:col-span-7 order-1 lg:order-2">
                  <div className="relative">
                    <GalleryComponent />
                    {pricePosition !== 'side' && <PriceDisplay />}
                  </div>
                  
                  {/* Side price display */}
                  {pricePosition === 'side' && raffle.prize_value && (
                    <motion.div 
                      className={cn(
                        "mt-6 p-6 rounded-xl shadow-lg backdrop-blur-sm",
                        isLightTemplate
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-white/[0.03] border border-white/[0.06]"
                      )}
                      whileHover={{ scale: 1.02 }}
                    >
                      <p className={cn("text-sm font-medium", isLightTemplate ? "text-gray-500" : "text-white/50")}>Valor estimado del premio</p>
                      <p className="text-4xl font-bold mt-1 text-emerald-500">
                        {formatCurrency(Number(raffle.prize_value), currency)}
                      </p>
                    </motion.div>
                  )}
                  
                  {/* Video is now integrated in GalleryComponent */}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'side-by-side':
      default:
        // Visual-First Premium Layout: Title → Gallery → Video → Prizes → Description → Stats → CTAs
        return (
          <div className="relative py-16 lg:py-24">
            <PatternOverlay />
            
            {/* Animated orbs like /pricing */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl animate-blob pointer-events-none" />
            <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-blob animation-delay-4000 pointer-events-none" />
            
            {/* Grid pattern like /pricing */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
            
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center gap-10 lg:gap-12">
                
                {/* 1. Header badges + Title - FIRST */}
                <div className="w-full text-center space-y-6">
                  <HeaderBadges />
                  <TitleSection />
                </div>
                
                {/* 2. PROMINENT GALLERY - Visual Hook - Uses GalleryComponent for consistency */}
                <div className="w-full max-w-4xl mx-auto">
                  <motion.div 
                    className={cn(
                      "relative rounded-2xl overflow-hidden shadow-2xl",
                      isLightTemplate
                        ? "border border-gray-200 bg-gray-50"
                        : "border border-white/10 bg-gray-900/50"
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <GalleryComponent />
                    <PriceDisplay />
                  </motion.div>
                </div>
                
                {/* Video is now integrated in GalleryComponent above */}
                
                {/* 3. PRIZES - After visual content */}
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <PrizesSection />
                </motion.div>
                
                {/* 5. DESCRIPTION - Context after seeing prizes */}
                <DescriptionSection />
                
                {/* 6. STATS + PROGRESS */}
                <div className="w-full space-y-8">
                  <StatsCards />
                  <ProgressSection />
                </div>
                
                {/* 7. CTAs + Trust Badges */}
                <div className="w-full space-y-8">
                  <CTASection />
                  <TrustBadges />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Header />
      
      {/* Template-adaptive background */}
      <div className={cn("relative", isLightTemplate ? "bg-white" : "bg-[#030712]")}>
        {/* Subtle gradient overlay for depth */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isLightTemplate 
              ? 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)'
              : 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16, 185, 129, 0.03) 0%, transparent 50%)'
          }}
        />
        {renderHero()}
      </div>

      {/* Lightbox */}
      {showGallery && raffle.prize_images && raffle.prize_images.length > 0 && (
        <PrizeLightbox
          images={raffle.prize_images}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}
    </>
  );
}
