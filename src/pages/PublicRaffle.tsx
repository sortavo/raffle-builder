import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Calendar, 
  Trophy, 
  Ticket, 
  Share2, 
  Shield, 
  CheckCircle2, 
  ChevronRight,
  ChevronLeft,
  Zap,
  Users,
  Gift,
  Star,
  Sparkles
} from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";
import { PrizeDisplayMode } from "@/types/prize";
import { getTemplateById } from "@/lib/raffle-utils";
import { usePublicRaffle } from "@/hooks/usePublicRaffle";
import { TicketSelector } from "@/components/raffle/public/TicketSelector";
import { CheckoutModal } from "@/components/raffle/public/CheckoutModal";
import { CountdownTimer } from "@/components/raffle/public/CountdownTimer";
import { ShareButtons } from "@/components/raffle/public/ShareButtons";
import { HowItWorks } from "@/components/raffle/public/HowItWorks";
import { OrganizerSection } from "@/components/raffle/public/OrganizerSection";
import { PrizeShowcase } from "@/components/raffle/public/PrizeShowcase";
import { FloatingWhatsAppButton } from "@/components/raffle/public/FloatingWhatsAppButton";
import { PrizeVideoPlayer } from "@/components/raffle/public/PrizeVideoPlayer";
import { UrgencyBadge } from "@/components/marketing/UrgencyBadge";
import { SocialProof } from "@/components/marketing/SocialProof";
import { PurchaseToast } from "@/components/marketing/PurchaseToast";
import { ViewersCount } from "@/components/marketing/ViewersCount";
import { StickyUrgencyBanner } from "@/components/marketing/StickyUrgencyBanner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PublicRaffle() {
  const { slug, orgSlug } = useParams<{ slug: string; orgSlug?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ticketsRef = useRef<HTMLDivElement>(null);
  const { data: raffle, isLoading, error } = usePublicRaffle(slug);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  
  // Detect if we're coming from organization route
  const isFromOrganization = !!orgSlug;

  // Subscribe to realtime updates
  useEffect(() => {
    if (!raffle?.id) return;

    const channel = supabase
      .channel(`raffle-${raffle.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `raffle_id=eq.${raffle.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['public-raffle', slug] });
        queryClient.invalidateQueries({ queryKey: ['public-tickets', raffle.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raffle?.id, slug, queryClient]);

  const scrollToTickets = () => {
    ticketsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const shareRaffle = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: raffle?.title,
          text: raffle?.description || `Participa en ${raffle?.title}`,
          url,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleContinue = (tickets: string[]) => {
    setSelectedTickets(tickets);
    setCheckoutOpen(true);
  };

  const handleReservationComplete = (
    tickets: { id: string; ticket_number: string }[],
    reservedUntil: string,
    buyerData: { name: string; email: string }
  ) => {
    setCheckoutOpen(false);
    // Navigate to payment page, preserving organization context
    const paymentPath = isFromOrganization 
      ? `/${orgSlug}/${slug}/payment`
      : `/r/${slug}/payment`;
    navigate(paymentPath, {
      state: { tickets, reservedUntil, raffleId: raffle?.id, buyerName: buyerData.name, buyerEmail: buyerData.email },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando sorteo...</p>
        </div>
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-background via-background to-primary/5 px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl">
          <Trophy className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sorteo no encontrado</h1>
        <p className="text-muted-foreground text-center">Este sorteo no existe o ya no está activo.</p>
        <Button 
          onClick={() => navigate("/")}
          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
        >
          Volver al inicio
        </Button>
      </div>
    );
  }

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const progress = (raffle.ticketsSold / raffle.total_tickets) * 100;
  const currency = raffle.currency_code || 'MXN';
  
  // Get subscription limits for branding
  const orgTier = (raffle as any).organization?.subscription_tier as SubscriptionTier;
  const limits = getSubscriptionLimits(orgTier);

  const mainImage = raffle.prize_images?.[0] || '/placeholder.svg';

  // Feature configurations from customization (with sensible defaults)
  const customization = (raffle as any).customization || {};
  const showRandomPicker = customization.show_random_picker !== false;
  const showLuckyNumbers = true; // Always enabled
  const showWinnersHistory = customization.show_winners_history !== false;
  const showProbabilityStats = customization.show_probability_stats !== false;
  const showViewersCount = customization.show_viewers_count !== false;
  const showPurchaseToasts = customization.show_purchase_toasts !== false;
  const showUrgencyBadge = customization.show_urgency_badge !== false;
  const showStickyBanner = customization.show_sticky_banner !== false;
  const showSocialProof = customization.show_social_proof !== false;

  // Organization branding - ALWAYS available
  const org = raffle.organization;
  const orgName = org?.name || "";
  const orgLogo = org?.logo_url;
  const orgSlugValue = org?.slug;
  const hasWhatsApp = !!org?.whatsapp_number;

  // Get template styles - use raffle's template_id or default to 'modern'
  const template = getTemplateById((raffle as any).template_id);
  
  // Use template colors as primary, org brand color as accent override
  const primaryColor = template.colors.primary;
  const accentColor = template.colors.accent;
  const bgColor = template.colors.background;
  const cardBg = template.colors.cardBg;
  const textColor = template.colors.text;
  const textMuted = template.colors.textMuted;
  const fontTitle = template.fonts.title;
  const fontBody = template.fonts.body;
  const borderRadius = template.effects.borderRadius;
  const shadow = template.effects.shadow;
  const gradient = template.effects.gradient;

  // Check if template is dark (elegant template)
  const isDarkTemplate = template.id === 'elegant';

  return (
    <>
      <Helmet>
        <title>{raffle.title} - {orgName || "Sortavo"}</title>
        <meta name="description" content={raffle.description || `Participa en ${raffle.title}`} />
        <meta property="og:title" content={raffle.title} />
        <meta property="og:description" content={raffle.description || ''} />
        {raffle.prize_images?.[0] && <meta property="og:image" content={raffle.prize_images[0]} />}
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div 
        className="min-h-screen transition-colors duration-300"
        style={{ 
          backgroundColor: bgColor,
          fontFamily: `"${fontBody}", sans-serif`,
        }}
      >
        {/* Organization Header - ALWAYS visible */}
        <header 
          className="sticky top-0 z-50 border-b backdrop-blur-sm"
          style={{ 
            backgroundColor: isDarkTemplate ? `${cardBg}f0` : `${bgColor}f0`,
            borderBottomColor: `${primaryColor}20` 
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link 
                to={orgSlugValue ? `/${orgSlugValue}` : "#"}
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
              >
                {isFromOrganization && (
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                )}
                <Avatar className="h-8 w-8 border-2" style={{ borderColor: primaryColor }}>
                  <AvatarImage src={orgLogo || undefined} alt={orgName} />
                  <AvatarFallback 
                    className="text-xs font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {orgName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{orgName}</span>
                  {org?.verified && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0">
                      <CheckCircle2 className="w-3 h-3" />
                    </Badge>
                  )}
                </div>
              </Link>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shareRaffle}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Compartir</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Sticky Urgency Banner - conditionally rendered */}
        {showStickyBanner && raffle.draw_date && (
          <StickyUrgencyBanner
            drawDate={raffle.draw_date}
            totalTickets={raffle.total_tickets}
            ticketsSold={raffle.ticketsSold}
            onScrollToTickets={scrollToTickets}
          />
        )}

        {/* Purchase Toast Notifications - conditionally rendered */}
        {showPurchaseToasts && <PurchaseToast raffleId={raffle.id} />}

        {/* Premium Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-50" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.1) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Prize Image */}
              <div className="relative group order-2 lg:order-1">
                {/* Floating elements */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl animate-pulse"></div>
                
                {/* Main image */}
                <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gray-100">
                  <img 
                    src={mainImage} 
                    alt={raffle.prize_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  
                  {/* Floating badge - tickets sold */}
                  <div className="absolute top-4 right-4 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-gray-900">
                        {raffle.ticketsSold} vendidos
                      </span>
                    </div>
                  </div>

                  {/* Prize value badge */}
                  {raffle.prize_value && (
                    <div 
                      className="absolute bottom-4 left-4 px-6 py-3 rounded-2xl shadow-xl"
                      style={{ background: gradient }}
                    >
                      <div className="text-white">
                        <p className="text-xs font-medium opacity-90">Valor del Premio</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(Number(raffle.prize_value), currency)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional images */}
                {raffle.prize_images && raffle.prize_images.length > 1 && (
                  <div className="flex gap-2 mt-4">
                    {raffle.prize_images.slice(0, 4).map((img, idx) => (
                      <div 
                        key={idx}
                        className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-transform cursor-pointer"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Prize Video */}
                {raffle.prize_video_url && (
                  <PrizeVideoPlayer 
                    videoUrl={raffle.prize_video_url} 
                    title={raffle.prize_name}
                    className="mt-6"
                  />
                )}
              </div>

              {/* Right: Info */}
              <div className="space-y-6 order-1 lg:order-2">
                {/* Status badge */}
                <div className="flex flex-wrap items-center gap-3">
                  <div 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white"
                    style={{ background: gradient }}
                  >
                    <Zap className="w-4 h-4" />
                    Sorteo Activo
                  </div>
                  {showViewersCount && <ViewersCount />}
                </div>

                {/* Urgency Badge - conditionally rendered */}
                {showUrgencyBadge && raffle.draw_date && (
                  <UrgencyBadge
                    drawDate={raffle.draw_date}
                    totalTickets={raffle.total_tickets}
                    ticketsSold={raffle.ticketsSold}
                  />
                )}

                {/* Title - Nombre del Sorteo */}
                <div className="space-y-4">
                  <h1 
                    className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight"
                    style={{ 
                      fontFamily: `"${fontTitle}", sans-serif`,
                      color: textColor,
                    }}
                  >
                    {raffle.title}
                  </h1>
                  
                  {raffle.description && (
                    <p className="text-base sm:text-lg" style={{ color: textMuted }}>{raffle.description}</p>
                  )}
                </div>

                {/* Premium Prize Showcase */}
                <PrizeShowcase 
                  raffle={raffle}
                  prizes={(raffle as any).prizes || []}
                  displayMode={((raffle as any).prize_display_mode as PrizeDisplayMode) || 'hierarchical'}
                  currency={currency}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  textColor={textColor}
                  textMuted={textMuted}
                  cardBg={cardBg}
                  isDarkTemplate={isDarkTemplate}
                />

                {/* Key info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div 
                    className="p-3 sm:p-4 rounded-xl border shadow-sm"
                    style={{ 
                      backgroundColor: cardBg,
                      borderColor: `${primaryColor}20`,
                      borderRadius: borderRadius
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Ticket className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: primaryColor }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm" style={{ color: textMuted }}>Precio</p>
                        <p className="text-base sm:text-lg font-bold truncate" style={{ color: textColor }}>
                          {formatCurrency(Number(raffle.ticket_price), currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="p-3 sm:p-4 rounded-xl border shadow-sm"
                    style={{ 
                      backgroundColor: cardBg,
                      borderColor: `${primaryColor}20`,
                      borderRadius: borderRadius
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: primaryColor }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm" style={{ color: textMuted }}>Sorteo</p>
                        <p className="text-base sm:text-lg font-bold truncate" style={{ color: textColor }}>
                          {raffle.draw_date 
                            ? format(new Date(raffle.draw_date), 'dd MMM', { locale: es })
                            : 'Por definir'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color: textColor }}>
                      {raffle.ticketsSold} de {raffle.total_tickets} vendidos
                    </span>
                    <span className="font-semibold" style={{ color: primaryColor }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  
                  <div 
                    className="relative h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progress}%`,
                        background: gradient
                      }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                    </div>
                  </div>
                  
                  <p className="text-sm" style={{ color: textMuted }}>
                    {raffle.ticketsAvailable} boletos disponibles
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="flex-1 text-lg py-6 shadow-xl group text-white"
                    style={{ 
                      background: gradient,
                      borderRadius: borderRadius,
                    }}
                    onClick={scrollToTickets}
                  >
                    <Ticket className="w-5 h-5 mr-2" />
                    Comprar Boletos
                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 py-6"
                    style={{ 
                      borderColor: primaryColor,
                      color: isDarkTemplate ? '#FFFFFF' : primaryColor,
                      borderRadius: borderRadius,
                    }}
                    onClick={shareRaffle}
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Compartir
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>Pago Seguro</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>Verificable</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>{raffle.ticketsSold}+ participantes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Countdown Section */}
        {raffle.draw_date && (
          <div 
            className="py-8"
            style={{ background: gradient }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-4">
                <p className="text-white/80 text-sm font-medium uppercase tracking-wider">El sorteo se realizará en</p>
              </div>
              <CountdownTimer targetDate={new Date(raffle.draw_date)} />
            </div>
          </div>
        )}

        {/* Ticket Selection Section */}
        <div ref={ticketsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" id="tickets">
          {/* Section header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              Selecciona tus Boletos de la Suerte
            </h2>
            <p className="text-lg text-gray-600">
              Elige los números que te llevarán a la victoria
            </p>
          </div>

          {/* Ticket Selector */}
          <TicketSelector
            raffleId={raffle.id}
            totalTickets={raffle.total_tickets}
            ticketPrice={Number(raffle.ticket_price)}
            currencyCode={currency}
            maxPerPurchase={raffle.max_tickets_per_purchase || 100}
            packages={raffle.packages || []}
            onContinue={handleContinue}
            showRandomPicker={showRandomPicker}
            showLuckyNumbers={showLuckyNumbers}
            showWinnersHistory={showWinnersHistory}
            showProbabilityStats={showProbabilityStats}
            ticketsSold={raffle.ticketsSold}
            ticketsAvailable={raffle.ticketsAvailable}
          />

          {/* Social Proof - conditionally rendered */}
          {showSocialProof && (
            <div className="mt-12">
              <SocialProof raffleId={raffle.id} className="max-w-2xl mx-auto" />
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">¿Cómo Participar?</h2>
              <p className="text-lg text-gray-600">Es muy fácil, solo sigue estos pasos</p>
            </div>
            <HowItWorks />
          </div>
        </div>

        {/* About the Organizer Section */}
        {org && (
          <OrganizerSection
            organization={{
              id: org.id,
              name: org.name,
              logo_url: org.logo_url,
              slug: org.slug,
              description: org.description,
              whatsapp_number: org.whatsapp_number,
              facebook_url: org.facebook_url,
              instagram_url: org.instagram_url,
              tiktok_url: org.tiktok_url,
              website_url: org.website_url,
              city: org.city,
              verified: org.verified,
              brand_color: org.brand_color,
              created_at: org.created_at,
            }}
            raffleTitle={raffle.title}
            brandColor={primaryColor}
          />
        )}

        {/* FAQ Section - Dynamic */}
        {(() => {
          const sections = customization.sections || {};
          const faqConfig = customization.faq_config || { show_default_faqs: true, custom_faqs: [] };
          const showFaqSection = sections.faq !== false;
          const showDefaultFaqs = faqConfig.show_default_faqs !== false;
          const customFaqs: { question: string; answer: string }[] = faqConfig.custom_faqs || [];
          
          if (!showFaqSection) return null;
          
          const defaultFaqs = [
            {
              id: 'how',
              question: '¿Cómo participo?',
              answer: 'Selecciona tus boletos, completa tus datos, realiza el pago y sube tu comprobante. Una vez verificado tu pago, recibirás la confirmación de tu participación.'
            },
            {
              id: 'winner',
              question: '¿Cómo sé si gané?',
              answer: 'Te contactaremos por email y teléfono si resultas ganador. También publicaremos los resultados en nuestras redes sociales.'
            },
            {
              id: 'when',
              question: '¿Cuándo es el sorteo?',
              answer: raffle.draw_date 
                ? format(new Date(raffle.draw_date), "EEEE dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })
                : 'La fecha será confirmada próximamente'
            },
            {
              id: 'payment',
              question: '¿Qué métodos de pago aceptan?',
              answer: 'Aceptamos transferencia bancaria, depósito en OXXO y otros métodos de pago. Verás las opciones disponibles al momento de completar tu compra.'
            }
          ];
          
          const allFaqs = [
            ...(showDefaultFaqs ? defaultFaqs : []),
            ...customFaqs.map((faq, idx) => ({ id: `custom-${idx}`, ...faq }))
          ];
          
          if (allFaqs.length === 0) return null;
          
          return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Preguntas Frecuentes</h2>
              </div>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {allFaqs.map((faq) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={faq.id} 
                    className="bg-white rounded-xl border border-gray-200 px-6"
                  >
                    <AccordionTrigger className="text-left font-semibold hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          );
        })()}

        {/* Terms Section */}
        {raffle.prize_terms && (
          <div className="bg-gray-50 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Términos y Condiciones</h2>
              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 prose prose-sm max-w-none text-gray-600">
                  <p className="whitespace-pre-wrap">{raffle.prize_terms}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Share Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Comparte y gana!</h2>
          <p className="text-gray-600 mb-6">Comparte este sorteo con tus amigos</p>
          <ShareButtons url={url} title={raffle.title} description={raffle.description || undefined} />
        </div>

        {/* Footer - Only show branding for Basic plan */}
        {!limits.canRemoveBranding && (
          <footer className="border-t border-gray-200 py-8 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
              <p>Powered by <span className="font-semibold text-violet-600">Sortavo</span></p>
            </div>
          </footer>
        )}

        {/* Floating WhatsApp Button */}
        {hasWhatsApp && org?.whatsapp_number && (
          <FloatingWhatsAppButton
            whatsappNumber={org.whatsapp_number}
            organizationName={orgName}
            raffleTitle={raffle.title}
          />
        )}

        {/* Checkout Modal */}
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          raffle={raffle}
          selectedTickets={selectedTickets}
          ticketPrice={Number(raffle.ticket_price)}
          packages={raffle.packages?.map(p => ({ quantity: p.quantity, price: Number(p.price) }))}
          onReservationComplete={handleReservationComplete}
        />
      </div>
    </>
  );
}