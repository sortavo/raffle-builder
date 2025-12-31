import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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
}: TemplateHeroLayoutProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { fonts, effects, layout } = template;
  const { heroStyle, galleryStyle, pricePosition, contentAlignment, decorations } = layout;

  const progress = (raffle.ticketsSold / raffle.total_tickets) * 100;
  const mainImage = raffle.prize_images?.[0] || '/placeholder.svg';

  // Premium Header - Ultra Dark Glassmorphism
  const Header = () => (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ease-out ${
        isScrolled 
          ? 'bg-[#030712]/95 backdrop-blur-2xl shadow-2xl border-b border-white/[0.06]' 
          : 'bg-[#030712]/80 backdrop-blur-xl'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top nav row */}
        <div 
          className={`flex items-center justify-between overflow-hidden transition-all duration-500 ease-out border-b border-white/[0.06] ${
            isScrolled ? 'h-0 opacity-0 border-transparent' : 'h-10 opacity-100'
          }`}
        >
          {isFromOrganization ? (
            <Link 
              to={`/${organization.slug}`}
              className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white transition-all group"
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
            className="text-xs text-white/50 hover:text-white hover:bg-white/[0.05] h-8 px-3"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Compartir
          </Button>
        </div>

        {/* Organization branding */}
        <div 
          className={`flex items-center justify-center transition-all duration-500 ease-out ${
            isScrolled ? 'py-2' : 'py-5'
          }`}
        >
          <Link 
            to={organization.slug ? `/${organization.slug}` : "#"}
            className={`flex items-center gap-3 group transition-all duration-500 ${
              isScrolled ? 'flex-row' : 'flex-col'
            }`}
          >
            <div className="relative">
              {/* Emerald glow behind avatar */}
              <div 
                className={`absolute inset-0 blur-xl bg-emerald-500 transition-all duration-500 ${
                  isScrolled ? 'opacity-20' : 'opacity-40 group-hover:opacity-60'
                }`}
              />
              <Avatar 
                className={`relative border-2 border-emerald-500/30 shadow-xl transition-all duration-500 group-hover:scale-105 ${
                  isScrolled ? 'h-10 w-10' : 'h-16 w-16'
                }`}
              >
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} className="object-cover" />
                <AvatarFallback 
                  className={`font-bold text-white bg-emerald-700 transition-all duration-500 ${
                    isScrolled ? 'text-sm' : 'text-xl'
                  }`}
                >
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className={`text-center transition-all duration-500 ${isScrolled ? 'space-y-0' : 'space-y-1.5'}`}>
              <h2 
                className={`font-bold tracking-wider uppercase text-white transition-all duration-500 group-hover:opacity-80 ${
                  isScrolled ? 'text-base' : 'text-lg sm:text-xl'
                }`}
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

  // Gallery component with premium styling - VIDEO ALWAYS INTEGRATED
  const GalleryComponent = () => {
    const images = raffle.prize_images || [];
    const hasImages = images.length > 0;
    
    // If no images and no video, return null
    if (!showGallery && !hasVideo) return null;
    if (!hasImages && !hasVideo) return null;

    switch (galleryStyle) {
      case 'grid':
        return (
          <div className="grid grid-cols-2 gap-4">
            {images.slice(0, hasVideo ? 3 : 4).map((img, idx) => (
              <motion.div 
                key={idx}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer shadow-lg border border-white/[0.06]"
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
            {/* Video as last grid item */}
            {hasVideo && raffle.prize_video_url && (
              <motion.div 
                className="aspect-square rounded-xl overflow-hidden"
                whileHover={{ scale: 1.02 }}
              >
                <VideoSlide videoUrl={raffle.prize_video_url} className="!aspect-square !rounded-xl" />
              </motion.div>
            )}
          </div>
        );
      
      case 'single-focus':
        return (
          <div className="space-y-4">
            {hasImages && (
              <div className="relative">
                <motion.div 
                  className="aspect-[4/3] rounded-xl overflow-hidden cursor-pointer shadow-2xl border border-white/[0.06]"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setLightboxOpen(true)}
                >
                  <img src={mainImage} alt={raffle.prize_name} className="w-full h-full object-cover" />
                </motion.div>
                {images.length > 1 && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.slice(0, 4).map((_, idx) => (
                      <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === 0 ? 'bg-emerald-400' : 'bg-white/20'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Video after images */}
            {hasVideo && raffle.prize_video_url && (
              <VideoSlide videoUrl={raffle.prize_video_url} />
            )}
          </div>
        );
      
      case 'masonry':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {hasImages && (
                <>
                  <motion.div 
                    className="col-span-2 row-span-2 aspect-square rounded-xl overflow-hidden cursor-pointer shadow-xl border border-white/[0.06]"
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setLightboxOpen(true)}
                  >
                    <img src={mainImage} alt={raffle.prize_name} className="w-full h-full object-cover" />
                  </motion.div>
                  {images.slice(1, 3).map((img, idx) => (
                    <motion.div 
                      key={idx}
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer shadow-lg border border-white/[0.06]"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        setLightboxIndex(idx + 1);
                        setLightboxOpen(true);
                      }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </>
              )}
            </div>
            {/* Video after masonry grid */}
            {hasVideo && raffle.prize_video_url && (
              <VideoSlide videoUrl={raffle.prize_video_url} />
            )}
          </div>
        );
      
      case 'carousel':
      default:
        return (
          <div className="space-y-6">
            {hasImages && (
              <div className="relative">
                <div className="aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06]">
                  <img src={mainImage} alt={raffle.prize_name} className="w-full h-full object-cover" />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 mt-4 justify-center">
                    {images.slice(0, 4).map((img, idx) => (
                      <motion.div 
                        key={idx}
                        className={`w-20 h-20 rounded-xl overflow-hidden shadow-md cursor-pointer border-2 ${
                          idx === 0 ? 'border-emerald-500' : 'border-white/10'
                        }`}
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
                )}
              </div>
            )}
            {/* Video as last item in carousel view */}
            {hasVideo && raffle.prize_video_url && (
              <VideoSlide videoUrl={raffle.prize_video_url} />
            )}
          </div>
        );
    }
  };

  // Price display with premium styling
  const PriceDisplay = () => {
    const priceContent = (
      <div className="text-white">
        <p className="text-xs font-medium text-white/70">Valor del Premio</p>
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

  // Split InfoSection into modular parts for Visual-First layout
  const HeaderBadges = () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/25">
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
        className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[0.95] tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
          {raffle.title}
        </span>
      </motion.h1>
    </div>
  );

  const DescriptionSection = () => (
    raffle.description ? (
      <div className="text-center max-w-3xl mx-auto">
        <p className="text-base sm:text-lg lg:text-xl text-gray-300">
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
        primaryColor="#10b981"
        accentColor="#14b8a6"
        textColor="#ffffff"
        textMuted="rgba(255,255,255,0.6)"
        cardBg="rgba(255,255,255,0.03)"
        isDarkTemplate={true}
      />
    </div>
  );

  const StatsCards = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
      <motion.div 
        className="p-5 rounded-2xl bg-gray-900/80 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 text-center"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Precio</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(raffle.ticket_price, currency)}
            </p>
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="p-5 rounded-2xl bg-gray-900/80 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 text-center"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Sorteo</p>
            <p className="text-xl font-bold text-white">
              {raffle.draw_date 
                ? format(new Date(raffle.draw_date), 'dd MMM', { locale: es })
                : 'Por definir'
              }
            </p>
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="p-5 rounded-2xl bg-gray-900/80 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 text-center"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Boletos</p>
            <p className="text-xl font-bold text-white">
              {raffle.total_tickets.toLocaleString()}
            </p>
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="p-5 rounded-2xl bg-gray-900/80 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 text-center"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Vendidos</p>
            <p className="text-xl font-bold text-emerald-400">
              {raffle.ticketsSold.toLocaleString()}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const ProgressSection = () => (
    showStats ? (
      <div className="space-y-3 max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-200">
            {raffle.ticketsSold} de {raffle.total_tickets} vendidos
          </span>
          <span className="font-bold text-emerald-400">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="relative h-3 rounded-full overflow-hidden bg-gray-800">
          <motion.div 
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        
        <p className="text-sm text-gray-400 text-center">
          {raffle.ticketsAvailable} boletos disponibles
        </p>
      </div>
    ) : null
  );

  const CTASection = () => (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          size="lg"
          className="text-lg px-10 py-6 font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/25"
          onClick={onScrollToTickets}
        >
          <Ticket className="w-5 h-5 mr-2" />
          Comprar Boletos
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
      
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          size="lg"
          variant="outline"
          className="border-2 px-8 py-6 border-white/20 text-white hover:bg-white/[0.05] hover:border-emerald-500/50"
          onClick={onShare}
        >
          <Share2 className="w-5 h-5 mr-2" />
          Compartir
        </Button>
      </motion.div>
    </div>
  );

  const TrustBadges = () => (
    <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-white/10">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10">
          <Shield className="w-4 h-4 text-emerald-400" />
        </div>
        <span>Pago Seguro</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <span>Verificable</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10">
          <Users className="w-4 h-4 text-emerald-400" />
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/50 to-transparent" />
              <PriceDisplay />
              
              {showStats && (
                <div className="absolute top-4 right-4 px-4 py-2 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-full shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-white">
                      {raffle.ticketsSold} vendidos
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Content below */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
              <motion.div 
                className="p-8 rounded-2xl shadow-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl"
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
                      className={`w-16 h-16 rounded-lg overflow-hidden shadow-md cursor-pointer border-2 ${
                        idx === 0 ? 'border-emerald-500' : 'border-white/10'
                      }`}
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
                      className="mt-6 p-6 rounded-xl shadow-lg bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
                      whileHover={{ scale: 1.02 }}
                    >
                      <p className="text-sm font-medium text-white/50">Valor estimado del premio</p>
                      <p className="text-4xl font-bold mt-1 text-emerald-400">
                        {formatCurrency(Number(raffle.prize_value), currency)}
                      </p>
                    </motion.div>
                  )}
                  
                  {showVideo && raffle.prize_video_url && (
                    <PrizeVideoPlayer 
                      videoUrl={raffle.prize_video_url} 
                      title={raffle.prize_name}
                      className="mt-6"
                    />
                  )}
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
                
                {/* 2. PROMINENT GALLERY - Visual Hook */}
                <div className="w-full max-w-4xl mx-auto">
                  <motion.div 
                    className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    {/* Main image - prominent 16:9 aspect ratio */}
                    <div className="aspect-[16/9] relative overflow-hidden cursor-pointer group" onClick={() => setLightboxOpen(true)}>
                      <img 
                        src={mainImage} 
                        alt={raffle.prize_name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <PriceDisplay />
                      
                      {/* Zoom hint */}
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white/80 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Ver galería
                      </div>
                    </div>
                    
                    {/* Thumbnails below image */}
                    {raffle.prize_images && raffle.prize_images.length > 1 && (
                      <div className="p-4 bg-gray-900/80 border-t border-white/10">
                        <div className="flex gap-3 justify-center">
                          {raffle.prize_images.slice(0, 6).map((img, idx) => (
                            <motion.div 
                              key={idx}
                              className={`w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden shadow-md cursor-pointer border-2 transition-all ${
                                idx === 0 ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-white/10 hover:border-emerald-500/50'
                              }`}
                              whileHover={{ scale: 1.1 }}
                              onClick={(e) => {
                                e.stopPropagation();
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
      
      {/* Force ultra-dark background */}
      <div className="relative bg-[#030712]">
        {/* Subtle gradient overlay for depth */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16, 185, 129, 0.03) 0%, transparent 50%)'
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
