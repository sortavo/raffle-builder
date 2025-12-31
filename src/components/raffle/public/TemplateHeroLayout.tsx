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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency-utils";
import { RaffleTemplate } from "@/lib/raffle-utils";
import { ViewersCount } from "@/components/marketing/ViewersCount";
import { UrgencyBadge } from "@/components/marketing/UrgencyBadge";
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

  const { colors, fonts, effects, layout } = template;
  const { heroStyle, galleryStyle, pricePosition, contentAlignment, decorations } = layout;

  const isDarkTemplate = template.id === 'elegant';
  const progress = (raffle.ticketsSold / raffle.total_tickets) * 100;
  const mainImage = raffle.prize_images?.[0] || '/placeholder.svg';

  // Common header component
  const Header = () => (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ease-out ${
        isScrolled ? 'backdrop-blur-xl shadow-xl' : 'backdrop-blur-sm shadow-none'
      }`}
      style={{ 
        backgroundColor: isScrolled 
          ? (isDarkTemplate ? `${colors.cardBg}fa` : `${colors.background}fa`)
          : (isDarkTemplate ? `${colors.cardBg}40` : `${colors.background}20`),
        boxShadow: isScrolled ? `0 8px 40px -12px ${colors.primary}25` : 'none'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          className={`flex items-center justify-between overflow-hidden transition-all duration-500 ease-out border-b ${
            isScrolled ? 'h-0 opacity-0 border-transparent' : 'h-10 opacity-100'
          }`}
          style={{ borderBottomColor: isScrolled ? 'transparent' : `${colors.primary}10` }}
        >
          {isFromOrganization ? (
            <Link 
              to={`/${organization.slug}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all group"
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
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-3"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Compartir
          </Button>
        </div>

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
              {decorations.includes('glow') && (
                <div 
                  className={`absolute inset-0 blur-xl transition-all duration-500 ${
                    isScrolled ? 'opacity-30' : 'opacity-50 group-hover:opacity-70'
                  }`}
                  style={{ backgroundColor: colors.primary }}
                />
              )}
              <Avatar 
                className={`relative border-[3px] shadow-xl transition-all duration-500 group-hover:scale-105 ${
                  isScrolled ? 'h-10 w-10' : 'h-16 w-16'
                }`}
                style={{ borderColor: colors.primary }}
              >
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} className="object-cover" />
                <AvatarFallback 
                  className={`font-bold text-white transition-all duration-500 ${
                    isScrolled ? 'text-sm' : 'text-xl'
                  }`}
                  style={{ backgroundColor: colors.primary }}
                >
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className={`text-center transition-all duration-500 ${isScrolled ? 'space-y-0' : 'space-y-1.5'}`}>
              <h2 
                className={`font-bold tracking-wider uppercase transition-all duration-500 group-hover:opacity-80 ${
                  isScrolled ? 'text-base' : 'text-lg sm:text-xl'
                }`}
                style={{ 
                  color: colors.text,
                  fontFamily: `"${fonts.title}", sans-serif`
                }}
              >
                {organization.name}
              </h2>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );

  // Gallery component based on style
  const GalleryComponent = () => {
    if (!showGallery || !raffle.prize_images?.length) return null;

    switch (galleryStyle) {
      case 'grid':
        return (
          <div className="grid grid-cols-2 gap-4">
            {raffle.prize_images.slice(0, 4).map((img, idx) => (
              <motion.div 
                key={idx}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer shadow-lg"
                style={{ borderRadius: effects.borderRadius }}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </div>
        );
      
      case 'single-focus':
        return (
          <div className="relative">
            <motion.div 
              className="aspect-[4/3] rounded-xl overflow-hidden cursor-pointer shadow-2xl"
              style={{ borderRadius: effects.borderRadius }}
              whileHover={{ scale: 1.01 }}
              onClick={() => setLightboxOpen(true)}
            >
              <img src={mainImage} alt={raffle.prize_name} className="w-full h-full object-cover" />
            </motion.div>
            {raffle.prize_images.length > 1 && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {raffle.prize_images.slice(0, 4).map((_, idx) => (
                  <div 
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${idx === 0 ? 'bg-primary' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      
      case 'masonry':
        return (
          <div className="grid grid-cols-3 gap-3">
            <motion.div 
              className="col-span-2 row-span-2 aspect-square rounded-xl overflow-hidden cursor-pointer shadow-xl"
              style={{ borderRadius: effects.borderRadius }}
              whileHover={{ scale: 1.01 }}
              onClick={() => setLightboxOpen(true)}
            >
              <img src={mainImage} alt={raffle.prize_name} className="w-full h-full object-cover" />
            </motion.div>
            {raffle.prize_images.slice(1, 3).map((img, idx) => (
              <motion.div 
                key={idx}
                className="aspect-square rounded-lg overflow-hidden cursor-pointer shadow-lg"
                style={{ borderRadius: effects.borderRadius }}
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  setLightboxIndex(idx + 1);
                  setLightboxOpen(true);
                }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </div>
        );
      
      case 'carousel':
      default:
        return (
          <div className="relative">
            <div 
              className="aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl"
              style={{ borderRadius: effects.borderRadius }}
            >
              <img src={mainImage} alt={raffle.prize_name} className="w-full h-full object-cover" />
            </div>
            {raffle.prize_images.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center">
                {raffle.prize_images.slice(0, 4).map((img, idx) => (
                  <motion.div 
                    key={idx}
                    className="w-20 h-20 rounded-xl overflow-hidden border-2 shadow-md cursor-pointer"
                    style={{ borderColor: idx === 0 ? colors.primary : 'white', borderRadius: effects.borderRadius }}
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
        );
    }
  };

  // Price display based on position
  const PriceDisplay = () => {
    const priceContent = (
      <div className="text-white">
        <p className="text-xs font-medium opacity-90">Valor del Premio</p>
        <p className="text-2xl font-bold">
          {formatCurrency(Number(raffle.prize_value), currency)}
        </p>
      </div>
    );

    if (!raffle.prize_value) return null;

    switch (pricePosition) {
      case 'overlay':
        return (
          <div 
            className="absolute bottom-4 left-4 px-6 py-3 rounded-2xl shadow-xl pointer-events-none"
            style={{ background: effects.gradient }}
          >
            {priceContent}
          </div>
        );
      case 'badge':
        return (
          <div 
            className="absolute top-4 left-4 px-4 py-2 rounded-full shadow-xl pointer-events-none"
            style={{ background: effects.gradient }}
          >
            <p className="text-white font-bold">{formatCurrency(Number(raffle.prize_value), currency)}</p>
          </div>
        );
      case 'side':
      case 'below':
      default:
        return null;
    }
  };

  // Info section
  const InfoSection = ({ className = "" }: { className?: string }) => (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white"
          style={{ background: effects.gradient }}
        >
          <Zap className="w-4 h-4" />
          Sorteo Activo
        </div>
        {showViewersCount && <ViewersCount />}
      </div>

      {showUrgencyBadge && raffle.draw_date && (
        <UrgencyBadge
          drawDate={raffle.draw_date}
          totalTickets={raffle.total_tickets}
          ticketsSold={raffle.ticketsSold}
        />
      )}

      <div className="space-y-4">
        <h1 
          className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight ${
            contentAlignment === 'center' ? 'text-center' : ''
          }`}
          style={{ 
            fontFamily: `"${fonts.title}", sans-serif`,
            color: colors.text,
          }}
        >
          {raffle.title}
        </h1>
        
        {raffle.description && (
          <p 
            className={`text-base sm:text-lg ${contentAlignment === 'center' ? 'text-center' : ''}`} 
            style={{ color: colors.textMuted }}
          >
            {raffle.description}
          </p>
        )}
      </div>

      <PrizeShowcase 
        raffle={raffle as any}
        prizes={raffle.prizes || []}
        displayMode={(raffle.prize_display_mode as any) || 'hierarchical'}
        currency={currency}
        primaryColor={colors.primary}
        accentColor={colors.accent}
        textColor={colors.text}
        textMuted={colors.textMuted}
        cardBg={colors.cardBg}
        isDarkTemplate={isDarkTemplate}
      />

      <div className={`grid grid-cols-2 gap-4 ${contentAlignment === 'center' ? 'max-w-md mx-auto' : ''}`}>
        <motion.div 
          className="p-4 rounded-xl border shadow-sm"
          whileHover={{ scale: 1.02 }}
          style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}20`, borderRadius: effects.borderRadius }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Ticket className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Precio</p>
              <p className="text-lg font-bold" style={{ color: colors.text }}>
                {formatCurrency(raffle.ticket_price, currency)}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          className="p-4 rounded-xl border shadow-sm"
          whileHover={{ scale: 1.02 }}
          style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}20`, borderRadius: effects.borderRadius }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Calendar className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Sorteo</p>
              <p className="text-lg font-bold" style={{ color: colors.text }}>
                {raffle.draw_date 
                  ? format(new Date(raffle.draw_date), 'dd MMM', { locale: es })
                  : 'Por definir'
                }
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {showStats && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: colors.text }}>
              {raffle.ticketsSold} de {raffle.total_tickets} vendidos
            </span>
            <span className="font-semibold" style={{ color: colors.primary }}>
              {Math.round(progress)}%
            </span>
          </div>
          
          <div 
            className="relative h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <motion.div 
              className="absolute inset-y-0 left-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ background: effects.gradient }}
            />
          </div>
          
          <p className="text-sm" style={{ color: colors.textMuted }}>
            {raffle.ticketsAvailable} boletos disponibles
          </p>
        </div>
      )}

      <div className={`flex gap-4 ${contentAlignment === 'center' ? 'justify-center' : ''}`}>
        <motion.div className="flex-1 max-w-xs" whileTap={{ scale: 0.98 }}>
          <Button
            size="lg"
            className="w-full text-lg py-6 shadow-xl text-white"
            style={{ background: effects.gradient, borderRadius: effects.borderRadius }}
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
            className="border-2 py-6"
            style={{ borderColor: colors.primary, color: isDarkTemplate ? '#FFFFFF' : colors.primary, borderRadius: effects.borderRadius }}
            onClick={onShare}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Compartir
          </Button>
        </motion.div>
      </div>

      <div 
        className={`flex flex-wrap items-center gap-4 pt-4 border-t ${contentAlignment === 'center' ? 'justify-center' : ''}`}
        style={{ borderTopColor: `${colors.primary}20` }}
      >
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.textMuted }}>
          <Shield className="w-5 h-5 text-green-600" />
          <span>Pago Seguro</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.textMuted }}>
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span>Verificable</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.textMuted }}>
          <Users className="w-5 h-5 text-green-600" />
          <span>{raffle.ticketsSold}+ participantes</span>
        </div>
      </div>
    </div>
  );

  // Pattern overlay for festive/sports templates
  const PatternOverlay = () => {
    if (!decorations.includes('patterns') || !effects.pattern) return null;
    return (
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
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
              backgroundColor: i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.accent : colors.secondary,
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
              <div 
                className="absolute inset-0"
                style={{ background: `linear-gradient(to top, ${colors.background}, transparent 50%)` }}
              />
              <PriceDisplay />
              
              {showStats && (
                <div className="absolute top-4 right-4 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-gray-900">
                      {raffle.ticketsSold} vendidos
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Content below */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
              <motion.div 
                className="p-8 rounded-2xl shadow-2xl"
                style={{ backgroundColor: colors.cardBg, borderRadius: effects.borderRadius }}
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
                      className="w-16 h-16 rounded-lg overflow-hidden shadow-md cursor-pointer border-2"
                      style={{ borderColor: idx === 0 ? colors.primary : 'transparent', borderRadius: effects.borderRadius }}
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
                      className="mt-6 p-6 rounded-xl shadow-lg"
                      style={{ backgroundColor: colors.cardBg, borderRadius: effects.borderRadius }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Valor estimado del premio</p>
                      <p 
                        className="text-4xl font-bold mt-1"
                        style={{ color: colors.primary, fontFamily: `"${fonts.title}", sans-serif` }}
                      >
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
        return (
          <div className="relative py-12 lg:py-20">
            <PatternOverlay />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                {/* Left: Gallery */}
                <div className="relative order-2 lg:order-1">
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

                {/* Right: Info */}
                <InfoSection className="order-1 lg:order-2" />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Header />
      
      <div 
        className="relative"
        style={{ backgroundColor: colors.background }}
      >
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
