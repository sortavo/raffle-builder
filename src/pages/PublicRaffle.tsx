import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScopedDarkMode } from "@/hooks/useScopedDarkMode";
import { useTrackingEvents } from "@/hooks/useTrackingEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  Trophy, 
} from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";
import { getTemplateById } from "@/lib/raffle-utils";
import { usePublicRaffle, usePreviewRaffle } from "@/hooks/usePublicRaffle";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { TicketSelector } from "@/components/raffle/public/TicketSelector";
import { CheckoutModal } from "@/components/raffle/public/CheckoutModal";
import { CountdownTimer } from "@/components/raffle/public/CountdownTimer";
import { ShareButtons } from "@/components/raffle/public/ShareButtons";
import { OrganizerSection } from "@/components/raffle/public/OrganizerSection";
import { FloatingWhatsAppButton } from "@/components/raffle/public/FloatingWhatsAppButton";
import { SocialProof } from "@/components/marketing/SocialProof";
import { PurchaseToast } from "@/components/marketing/PurchaseToast";
import { MobileHero } from "@/components/raffle/public/MobileHero";
import { MobileStickyFooter } from "@/components/raffle/public/MobileStickyFooter";
import { TransparencySection } from "@/components/raffle/public/TransparencySection";
import { HowToParticipate } from "@/components/raffle/public/HowToParticipate";
import { FAQSection } from "@/components/raffle/public/FAQSection";
import { TemplateHeroLayout } from "@/components/raffle/public/TemplateHeroLayout";
import { PrizeLightbox } from "@/components/raffle/public/PrizeLightbox";
import { ContactSection } from "@/components/raffle/public/ContactSection";
import { PreviewBanner } from "@/components/raffle/public/PreviewBanner";
import { UpcomingPreDraws } from "@/components/raffle/public/UpcomingPreDraws";
import { AnnouncedWinners } from "@/components/raffle/public/AnnouncedWinners";
import { PricingSection } from "@/components/raffle/public/sections/PricingSection";
import { parsePrizes } from "@/types/prize";
import { StructuredData, createEventSchema, createBreadcrumbSchema } from "@/components/seo/StructuredData";

interface PublicRaffleProps {
  tenantOrgSlug?: string;
  raffleSlugOverride?: string;
}

export default function PublicRaffle({ tenantOrgSlug, raffleSlugOverride }: PublicRaffleProps = {}) {
  const { slug: paramSlug, orgSlug: paramOrgSlug } = useParams<{ slug: string; orgSlug?: string }>();
  
  // Priority: override (from custom domain router) > route param
  const slug = raffleSlugOverride || paramSlug;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ticketsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { trackViewItem, trackAddToCart } = useTrackingEvents();
  
  // Use tenant org slug if provided (custom domain), otherwise use route param
  const effectiveOrgSlug = tenantOrgSlug || paramOrgSlug;
  
  // Try to load active raffle first, with optional org filter
  const { data: publicRaffle, isLoading: isLoadingPublic, error: publicError } = usePublicRaffle(slug, effectiveOrgSlug);
  
  // If no active raffle found and user is authenticated, try preview mode
  const { 
    data: previewRaffle, 
    isLoading: isLoadingPreview 
  } = usePreviewRaffle(slug, !publicRaffle && !isLoadingPublic && !!user);
  
  // Use either active raffle or preview
  const raffle = publicRaffle || previewRaffle;
  const isPreviewMode = !publicRaffle && previewRaffle?.isPreviewMode;
  const isLoading = isLoadingPublic || (isLoadingPreview && !publicRaffle && !!user);
  const error = publicError;
  
  // Get template early so we can determine light/dark mode
  const template = getTemplateById((raffle as any)?.template_id);
  
  // Detect if template is light based on background color
  const isLightTemplate = useMemo(() => {
    const bg = template.colors.background;
    // White or very light colors (starts with #F, #E, #D, or is white)
    return bg === '#FFFFFF' || bg === '#ffffff' || /^#[fFeEdD]/.test(bg);
  }, [template]);
  
  // Only activate dark mode for dark templates
  useScopedDarkMode(!isLightTemplate);
  
  
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedTicketIndices, setSelectedTicketIndices] = useState<number[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Track view_item when raffle loads (only once)
  useEffect(() => {
    if (raffle && !hasTrackedView && !isPreviewMode) {
      trackViewItem({
        itemId: raffle.id,
        itemName: raffle.title,
        category: (raffle as any).category || 'raffle',
        price: Number(raffle.ticket_price),
        currency: raffle.currency_code || 'MXN',
      });
      setHasTrackedView(true);
    }
  }, [raffle, hasTrackedView, isPreviewMode, trackViewItem]);

  // Track scroll position for header animation and sticky footer
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 50);
      // Show sticky footer after scrolling past hero (roughly 60vh)
      setShowStickyFooter(scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Detect if we're coming from organization route (via URL param or tenant)
  const isFromOrganization = !!effectiveOrgSlug;

  // Subscribe to realtime updates on orders
  useEffect(() => {
    if (!raffle?.id) return;

    const channel = supabase
      .channel(`raffle-${raffle.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `raffle_id=eq.${raffle.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['public-raffle', slug] });
        queryClient.invalidateQueries({ queryKey: ['virtual-tickets', raffle.id] });
        queryClient.invalidateQueries({ queryKey: ['virtual-ticket-counts', raffle.id] });
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

  const handleContinue = (tickets: string[], ticketIndices?: number[]) => {
    // Track add_to_cart event
    if (raffle) {
      const packages = (raffle as any).packages || [];
      const matchingPackage = packages.find((p: any) => p.quantity === tickets.length);
      const totalValue = matchingPackage ? matchingPackage.price : tickets.length * Number(raffle.ticket_price);
      
      trackAddToCart({
        itemId: raffle.id,
        itemName: raffle.title,
        price: Number(raffle.ticket_price),
        quantity: tickets.length,
        currency: raffle.currency_code || 'MXN',
      });
    }
    
    setSelectedTickets(tickets);
    setSelectedTicketIndices(ticketIndices || []);
    setCheckoutOpen(true);
  };

  const handleReservationComplete = (
    tickets: { id: string; ticket_number: string }[],
    reservedUntil: string,
    buyerData: { name: string; email: string },
    totalAmount: number,
    referenceCode: string
  ) => {
    setCheckoutOpen(false);
    // Navigate to payment page, preserving organization context
    // For tenant (custom domain), use just /:slug/payment
    // For org route on main domain, use /:orgSlug/:slug/payment
    const paymentPath = tenantOrgSlug 
      ? `/${slug}/payment`
      : isFromOrganization 
        ? `/${effectiveOrgSlug}/${slug}/payment`
        : `/r/${slug}/payment`;
    navigate(paymentPath, {
      state: { tickets, reservedUntil, raffleId: raffle?.id, buyerName: buyerData.name, buyerEmail: buyerData.email, totalAmount, referenceCode },
    });
  };

  // Calculate total amount for selected tickets
  const calculateTotalAmount = () => {
    if (!raffle) return 0;
    const packages = raffle.packages || [];
    const matchingPackage = packages.find(p => p.quantity === selectedTickets.length);
    if (matchingPackage) {
      return matchingPackage.price;
    }
    return selectedTickets.length * Number(raffle.ticket_price);
  };

  // Fetch announced draws for this raffle (must be before early returns - React hooks rule)
  const { data: announcedDrawsData } = useQuery({
    queryKey: ['announced-draws', raffle?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raffle_draws')
        .select('id, prize_id, prize_name, prize_value, ticket_number, winner_name, winner_city, draw_type, drawn_at')
        .eq('raffle_id', raffle!.id)
        .eq('announced', true)
        .order('drawn_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!raffle?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ultra-dark">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-white/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-white/50 text-sm">Cargando sorteo...</p>
        </div>
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-ultra-dark px-4">
        <div className="w-20 h-20 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center">
          <Trophy className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Sorteo no encontrado</h1>
        <p className="text-white/50 text-center">Este sorteo no existe o ya no está activo.</p>
        <Button 
          onClick={() => navigate("/")}
          className="bg-white text-[#030712] hover:bg-white/90 font-semibold"
        >
          Volver al inicio
        </Button>
      </div>
    );
  }

  // Parse prizes and separate main prize from pre-draws (after early returns)
  const allPrizes = parsePrizes((raffle as any).prizes, raffle.prize_name, raffle.prize_value ? Number(raffle.prize_value) : null);
  
  // Main prize = prize without scheduled_draw_date, or the last prize if all have dates
  const mainPrize = allPrizes.find(p => !p.scheduled_draw_date) || allPrizes[allPrizes.length - 1];
  
  // Pre-draw prizes = prizes with scheduled_draw_date (excluding main prize)
  const preDrawPrizes = allPrizes.filter(p => p.scheduled_draw_date && p.id !== mainPrize?.id);

  const announcedDraws = announcedDrawsData || [];

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const progress = (raffle.ticketsSold / raffle.total_tickets) * 100;
  const currency = raffle.currency_code || 'MXN';
  
  // Get subscription limits for branding
  const orgTier = (raffle as any).organization?.subscription_tier as SubscriptionTier;
  const limits = getSubscriptionLimits(orgTier);

  const mainImage = raffle.prize_images?.[0] || '/placeholder.svg';
  
  // Filter out pre-draw prizes that have already been drawn
  const drawnPrizeIds = new Set(announcedDraws.map(d => d.prize_id));
  const upcomingPreDrawPrizes = preDrawPrizes.filter(p => !drawnPrizeIds.has(p.id));

  // Feature configurations from customization (with sensible defaults)
  const customization = (raffle as any).customization || {};
  const sections = customization.sections || {};
  
  // Section visibility toggles (default to true if not explicitly set to false)
  const showHero = sections.hero !== false;
  const showCountdown = sections.countdown !== false;
  const showTicketGrid = sections.ticket_grid !== false;
  const showPackages = sections.packages !== false;
  const showGallery = sections.gallery !== false;
  // Video is now ALWAYS part of the gallery - if gallery is visible and video URL exists, show it
  // This removes the dependency on sections.video toggle
  const hasVideoUrl = !!raffle.prize_video_url;
  const showVideoInGallery = showGallery && hasVideoUrl;
  const showHowItWorks = sections.how_it_works !== false;
  const showFAQ = sections.faq !== false;
  const showStats = sections.stats !== false;
  const showShareButtons = sections.share_buttons !== false;
  
  // Feature toggles
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

  // Template already loaded at component top level for dark mode detection
  // Custom colors/fonts from customization override template defaults
  const primaryColor = customization.primary_color || template.colors.primary;
  const secondaryColor = customization.secondary_color || template.colors.accent;
  const accentColor = customization.secondary_color || template.colors.accent;
  const bgColor = template.colors.background;
  const cardBg = template.colors.cardBg;
  const textColor = template.colors.text;
  const textMuted = template.colors.textMuted;
  const fontTitle = customization.title_font || template.fonts.title;
  const fontBody = customization.body_font || template.fonts.body;
  const borderRadius = template.effects.borderRadius;
  const gradient = template.effects.gradient;
  
  // Custom colors object to pass to child components
  const customColors = {
    primary: primaryColor,
    secondary: secondaryColor,
    fontTitle: fontTitle,
    fontBody: fontBody,
  };

  // Build canonical URL
  const canonicalUrl = orgSlugValue 
    ? `https://sortavo.com/${orgSlugValue}/${raffle.slug}`
    : url;

  // Create structured data for this raffle
  const eventSchema = createEventSchema(
    {
      title: raffle.title,
      description: raffle.description || undefined,
      drawDate: raffle.draw_date || undefined,
      ticketPrice: raffle.ticket_price,
      currencyCode: currency,
      prizeImages: raffle.prize_images || undefined,
      slug: raffle.slug,
      status: raffle.status || 'active',
    },
    {
      name: orgName,
      slug: orgSlugValue || undefined,
    },
    canonicalUrl
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Inicio', url: 'https://sortavo.com' },
    ...(orgSlugValue ? [{ name: orgName, url: `https://sortavo.com/${orgSlugValue}` }] : []),
    { name: raffle.title },
  ]);

  return (
    <>
      <Helmet>
        <title>{raffle.title} - {orgName || "Sortavo"}</title>
        <meta name="description" content={raffle.description || `Participa en ${raffle.title}. Boletos desde ${formatCurrency(raffle.ticket_price, currency)}.`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Sortavo" />
        <meta property="og:title" content={`${raffle.title} - ${orgName}`} />
        <meta property="og:description" content={raffle.description || `Participa en ${raffle.title}`} />
        {raffle.prize_images?.[0] && <meta property="og:image" content={raffle.prize_images[0]} />}
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content="es_MX" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${raffle.title} - ${orgName}`} />
        <meta name="twitter:description" content={raffle.description || `Participa en ${raffle.title}`} />
        {raffle.prize_images?.[0] && <meta name="twitter:image" content={raffle.prize_images[0]} />}
        
        {/* Dynamic Google Fonts for custom typography */}
        {(customization.title_font || customization.body_font) && (
          <link
            href={`https://fonts.googleapis.com/css2?family=${[
              customization.title_font,
              customization.body_font
            ].filter(Boolean).map(f => f?.replace(/ /g, '+')).join('&family=')}&display=swap`}
            rel="stylesheet"
          />
        )}
      </Helmet>

      {/* Schema.org Structured Data */}
      <StructuredData data={[eventSchema, breadcrumbSchema]} />

      {/* Preview Banner for organizers viewing draft raffles */}
      {isPreviewMode && (
        <PreviewBanner 
          raffleId={raffle.id} 
          status={raffle.status || 'draft'} 
        />
      )}

      <div
        className={`min-h-screen transition-colors duration-300 relative overflow-hidden ${isPreviewMode ? 'pt-20 sm:pt-16' : ''}`}
        style={{ 
          backgroundColor: bgColor,
          fontFamily: `"${fontBody}", sans-serif`,
          '--custom-primary': primaryColor,
          '--custom-secondary': secondaryColor,
        } as React.CSSProperties}
      >
        {/* Animated orbs - dynamic brand colors */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {isLightTemplate ? (
            <>
              {/* Light template: brand-colored orbs with increased visibility */}
              <div 
                className="absolute top-1/4 -left-32 w-[650px] h-[650px] rounded-full blur-[100px] animate-blob" 
                style={{ backgroundColor: `${primaryColor}45` }}
              />
              <div 
                className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full blur-[100px] animate-blob animation-delay-2000" 
                style={{ backgroundColor: `${secondaryColor}35` }}
              />
              <div 
                className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px] animate-blob animation-delay-4000" 
                style={{ backgroundColor: `${primaryColor}30` }}
              />
              <div 
                className="absolute top-1/2 right-1/4 w-[450px] h-[450px] rounded-full blur-[100px] animate-blob animation-delay-1000" 
                style={{ backgroundColor: `${secondaryColor}25` }}
              />
              {/* Subtle grid for light templates */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
            </>
          ) : (
            <>
              {/* Dark template: brand-colored orbs */}
              <div 
                className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full blur-[120px] animate-blob" 
                style={{ backgroundColor: `${primaryColor}25` }}
              />
              <div 
                className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full blur-[120px] animate-blob animation-delay-2000" 
                style={{ backgroundColor: `${secondaryColor}18` }}
              />
              <div 
                className="absolute bottom-1/4 left-1/3 w-96 h-96 rounded-full blur-[120px] animate-blob animation-delay-4000" 
                style={{ backgroundColor: `${primaryColor}15` }}
              />
              <div 
                className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] animate-blob animation-delay-1000" 
                style={{ backgroundColor: `${secondaryColor}12` }}
              />
              {/* Grid pattern overlay for dark templates */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
            </>
          )}
        </div>
        
        <div className="relative z-10">
        {/* Mobile Hero - Full lottery experience */}
        {isMobile && showHero ? (
          <>
            <MobileHero
              raffle={{
                title: raffle.title,
                prize_name: raffle.prize_name,
                prize_images: showGallery ? raffle.prize_images : [],
                prize_video_url: showVideoInGallery ? raffle.prize_video_url : null,
                prize_value: raffle.prize_value ? Number(raffle.prize_value) : null,
                ticket_price: Number(raffle.ticket_price),
                draw_date: showCountdown ? raffle.draw_date : null,
                ticketsSold: showStats ? raffle.ticketsSold : 0,
                total_tickets: raffle.total_tickets,
                ticketsAvailable: raffle.ticketsAvailable,
              }}
              organization={{
                name: orgName,
                logo_url: orgLogo,
                slug: orgSlugValue,
                verified: org?.verified,
                city: org?.city,
                whatsapp_number: org?.whatsapp_number || (org as any)?.whatsapp_numbers?.[0],
              }}
              currency={currency}
              logoPosition={customization.logo_position || 'top-left'}
              isLightTemplate={isLightTemplate}
              customColors={customColors}
              onScrollToTickets={scrollToTickets}
              onShare={showShareButtons ? shareRaffle : undefined}
              onImageClick={(index) => {
                setLightboxIndex(index);
                setLightboxOpen(true);
              }}
            />

            {/* Lightbox for mobile */}
            {showGallery && raffle.prize_images && raffle.prize_images.length > 0 && (
              <PrizeLightbox
                images={raffle.prize_images}
                videoUrl={showVideoInGallery ? raffle.prize_video_url : undefined}
                initialIndex={lightboxIndex}
                open={lightboxOpen}
                onOpenChange={setLightboxOpen}
              />
            )}
          </>
        ) : isMobile ? (
          /* Mobile without hero - simple header */
          <div className={`py-8 px-4 border-b ${isLightTemplate ? 'bg-white border-gray-200' : 'bg-ultra-dark border-white/[0.06]'}`}>
            <h1 className={`text-2xl font-bold text-center tracking-tight ${isLightTemplate ? 'text-gray-900' : 'text-white'}`}>{raffle.title}</h1>
            <p className={`text-center mt-2 ${isLightTemplate ? 'text-gray-500' : 'text-white/50'}`}>{raffle.prize_name}</p>
          </div>
        ) : null}

        {/* Mobile Pricing Section - Paquetes de descuento */}
        {isMobile && showPackages && (raffle.packages || []).length > 0 && (
          <PricingSection
            ticketPrice={Number(raffle.ticket_price)}
            packages={raffle.packages || []}
            currencyCode={currency}
            isLightTemplate={isLightTemplate}
            primaryColor={primaryColor}
            onPackageSelect={(qty) => {
              scrollToTickets();
            }}
          />
        )}
        
        {!isMobile && showHero && (
          <>
            <TemplateHeroLayout
              raffle={{
                title: raffle.title,
                description: raffle.description,
                prize_name: raffle.prize_name,
                prize_images: showGallery ? raffle.prize_images : [],
                prize_video_url: showVideoInGallery ? raffle.prize_video_url : null,
                prize_value: raffle.prize_value ? Number(raffle.prize_value) : null,
                ticket_price: Number(raffle.ticket_price),
                draw_date: raffle.draw_date,
                ticketsSold: showStats ? raffle.ticketsSold : 0,
                ticketsAvailable: raffle.ticketsAvailable,
                total_tickets: raffle.total_tickets,
                prizes: (raffle as any).prizes,
                prize_display_mode: (raffle as any).prize_display_mode,
              }}
              organization={{
                name: orgName,
                logo_url: orgLogo,
                slug: orgSlugValue,
                verified: org?.verified,
              }}
              template={template}
              currency={currency}
              isScrolled={isScrolled}
              isFromOrganization={isFromOrganization}
              showViewersCount={showViewersCount}
              showUrgencyBadge={showUrgencyBadge}
              showGallery={showGallery}
              showVideo={showVideoInGallery}
              showStats={showStats}
              logoPosition={customization.logo_position || 'top-center'}
              onScrollToTickets={scrollToTickets}
              onShare={shareRaffle}
              isLightTemplate={isLightTemplate}
              customColors={customColors}
              upcomingPreDrawPrizes={upcomingPreDrawPrizes}
            />

            {/* Pricing Section - ANTES del Countdown */}
            {showPackages && (raffle.packages || []).length > 0 && (
              <PricingSection
                ticketPrice={Number(raffle.ticket_price)}
                packages={raffle.packages || []}
                currencyCode={currency}
                isLightTemplate={isLightTemplate}
                primaryColor={primaryColor}
                onPackageSelect={(qty) => {
                  scrollToTickets();
                }}
              />
            )}

            {/* Desktop Countdown */}
            {showCountdown && raffle.draw_date && (
              <div className={`py-12 border-y ${isLightTemplate ? 'bg-white border-gray-200' : 'bg-ultra-dark border-white/[0.06]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-6">
                    <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] ${isLightTemplate ? 'text-gray-600' : 'text-white/40'}`}>El sorteo se realizará en</p>
                  </div>
                  <CountdownTimer targetDate={new Date(raffle.draw_date)} variant="lottery" isLightTemplate={isLightTemplate} primaryColor={primaryColor} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Desktop without hero - simple header */}
        {!isMobile && !showHero && (
          <div className={cn(
            "py-16 px-4 border-b",
            isLightTemplate 
              ? "bg-white border-gray-200" 
              : "bg-ultra-dark border-white/[0.06]"
          )}>
            <div className="max-w-4xl mx-auto text-center">
              <h1 className={cn(
                "text-3xl lg:text-5xl font-bold tracking-tight",
                isLightTemplate ? "text-gray-900" : "text-white"
              )}>
                {raffle.title}
              </h1>
              <p className={cn(
                "mt-4 text-lg",
                isLightTemplate ? "text-gray-500" : "text-white/50"
              )}>
                {raffle.prize_name}
              </p>
            </div>
          </div>
        )}
        {/* Purchase Toast Notifications */}
        {showPurchaseToasts && <PurchaseToast raffleId={raffle.id} />}

        {/* How To Participate - Mobile only shows this compact version */}
        {isMobile && showHowItWorks && <HowToParticipate isLightTemplate={isLightTemplate} primaryColor={primaryColor} />}

        {/* Ticket Selection Section - /pricing style */}
        {showTicketGrid && (
          <div ref={ticketsRef} className="py-20 lg:py-28" id="tickets">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12 lg:mb-16"
              >
                <p className={cn(
                  "text-xs font-medium uppercase tracking-[0.2em] mb-4",
                  isLightTemplate ? "text-gray-500" : "text-gray-400"
                )}>
                  Selección de boletos
                </p>
                <h2 className="text-3xl lg:text-5xl font-bold mb-4">
                  <span 
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${primaryColor}dd, ${primaryColor})` }}
                  >
                    {isMobile ? "Elige tus Boletos" : "Selecciona tus Boletos"}
                  </span>
                </h2>
                <p className={cn(
                  "text-base lg:text-lg max-w-xl mx-auto",
                  isLightTemplate ? "text-gray-600" : "text-gray-400"
                )}>
                  {isMobile ? "¡La suerte te espera!" : "Elige los números que te llevarán a la victoria"}
                </p>
              </motion.div>

              <TicketSelector
                raffleId={raffle.id}
                totalTickets={raffle.total_tickets}
                ticketPrice={Number(raffle.ticket_price)}
                currencyCode={currency}
                maxPerPurchase={raffle.max_tickets_per_purchase ?? 0}
                minPerPurchase={raffle.min_tickets_per_purchase ?? 1}
                packages={showPackages ? (raffle.packages || []) : []}
                onContinue={handleContinue}
                showRandomPicker={showRandomPicker}
                showLuckyNumbers={showLuckyNumbers}
                showWinnersHistory={showWinnersHistory}
                showProbabilityStats={showStats && showProbabilityStats}
                ticketsSold={showStats ? raffle.ticketsSold : 0}
                ticketsAvailable={raffle.ticketsAvailable}
                isLightTemplate={isLightTemplate}
                primaryColor={primaryColor}
                numberStart={((raffle as any).numbering_config as any)?.start_number ?? 1}
                step={((raffle as any).numbering_config as any)?.step ?? 1}
              />

              {showSocialProof && (
                <div className="mt-16">
                  <SocialProof raffleId={raffle.id} className="max-w-2xl mx-auto" primaryColor={primaryColor} isLightTemplate={isLightTemplate} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Announced Winners Section */}
        {announcedDraws.length > 0 && (
          <AnnouncedWinners
            draws={announcedDraws}
            currencyCode={currency}
            primaryColor={primaryColor}
            isLightTemplate={isLightTemplate}
          />
        )}

        {/* Transparency Section - shows on both mobile and desktop */}
        <TransparencySection 
          drawMethod={(raffle as any).draw_method}
          livestreamUrl={(raffle as any).livestream_url}
          isLightTemplate={isLightTemplate}
          primaryColor={primaryColor}
        />

        {/* How It Works - Desktop only (mobile uses compact version above) */}
        {!isMobile && showHowItWorks && (
          <div className={cn(
            "border-y py-16 backdrop-blur-sm",
            isLightTemplate 
              ? "bg-gray-50/80 border-gray-200" 
              : "bg-white/[0.03] border-white/[0.06]"
          )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <p className={cn(
                  "text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mb-3",
                  isLightTemplate ? "text-gray-400" : "text-white/40"
                )}>Proceso</p>
                <h2 className={cn(
                  "text-3xl font-bold tracking-tight mb-3",
                  isLightTemplate ? "text-gray-900" : "text-white"
                )}>¿Cómo Participar?</h2>
                <p className={cn(
                  "text-lg",
                  isLightTemplate ? "text-gray-500" : "text-white/50"
                )}>Es muy fácil, solo sigue estos pasos</p>
              </div>
              <HowToParticipate isLightTemplate={isLightTemplate} primaryColor={primaryColor} />
            </div>
          </div>
        )}

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
              emails: org.emails || [],
              phones: org.phones || [],
              whatsapp_numbers: org.whatsapp_numbers || [],
              address: org.address,
              years_experience: org.years_experience,
              total_raffles_completed: org.total_raffles_completed,
            }}
            raffleTitle={raffle.title}
            brandColor={primaryColor}
            isLightTemplate={isLightTemplate}
          />
        )}

        {/* FAQ Section */}
        {showFAQ && (
          <FAQSection 
            raffle={{
              ticket_price: Number(raffle.ticket_price),
              currency_code: raffle.currency_code,
              draw_date: raffle.draw_date,
              total_tickets: raffle.total_tickets,
              max_tickets_per_person: raffle.max_tickets_per_person,
              prize_name: raffle.prize_name,
              prize_value: raffle.prize_value ? Number(raffle.prize_value) : undefined,
              draw_method: raffle.draw_method,
              lucky_numbers_enabled: raffle.lucky_numbers_enabled,
              packages: raffle.packages?.map(p => ({ 
                quantity: p.quantity, 
                price: Number(p.price),
                label: p.label 
              }))
            }}
            organization={org ? {
              name: org.name,
              whatsapp_number: org.whatsapp_number,
              email: org.email
            } : null}
            customization={customization}
            isLightTemplate={isLightTemplate}
            primaryColor={primaryColor}
          />
        )}

        {/* Terms Section */}
        {raffle.prize_terms && (
          <div className={cn(
            "border-y py-12 lg:py-16",
            isLightTemplate 
              ? "bg-gray-50/50 border-gray-200" 
              : "bg-white/[0.02] border-white/[0.06]"
          )}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className={cn(
                "text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mb-4",
                isLightTemplate ? "text-gray-400" : "text-white/40"
              )}>Legal</p>
              <h2 className={cn(
                "text-xl lg:text-2xl font-bold tracking-tight mb-6",
                isLightTemplate ? "text-gray-900" : "text-white"
              )}>Términos y Condiciones</h2>
              <div className={cn(
                "rounded-2xl p-6 border",
                isLightTemplate 
                  ? "bg-white border-gray-200" 
                  : "bg-white/[0.03] border-white/[0.06]"
              )}>
                <p className={cn(
                  "whitespace-pre-wrap text-sm leading-relaxed",
                  isLightTemplate ? "text-gray-600" : "text-white/70"
                )}>{raffle.prize_terms}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contact Section - replaces Share Section */}
        {org && (
          <ContactSection
            organization={{
              name: org.name,
              city: org.city,
              address: org.address,
              whatsapp_number: org.whatsapp_number,
              whatsapp_numbers: org.whatsapp_numbers || [],
              phones: org.phones || [],
              emails: org.emails || [],
              facebook_url: org.facebook_url,
              instagram_url: org.instagram_url,
              tiktok_url: org.tiktok_url,
              website_url: org.website_url,
            }}
            raffleTitle={raffle.title}
            isLightTemplate={isLightTemplate}
            primaryColor={primaryColor}
          />
        )}

        {/* Footer - show if Basic plan OR if Pro+ has it enabled */}
        {(!limits.canRemoveBranding || customization?.show_powered_by !== false) && (
          <footer className={cn(
            "border-t py-8",
            isLightTemplate 
              ? "bg-white border-gray-200" 
              : "bg-[#030712] border-white/[0.06]"
          )}>
            <div className={cn(
              "max-w-7xl mx-auto px-4 text-center text-sm",
              isLightTemplate ? "text-gray-400" : "text-white/30"
            )}>
              <p>Powered by <span className={cn(
                "font-medium",
                isLightTemplate ? "text-gray-600" : "text-white/50"
              )}>Sortavo</span></p>
            </div>
          </footer>
        )}

        {/* Mobile Sticky Footer - only shows when no tickets selected */}
        <MobileStickyFooter
          visible={isMobile && showStickyFooter}
          selectedCount={selectedTickets.length}
          onScrollToTickets={scrollToTickets}
        />

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
          selectedTicketIndices={selectedTicketIndices}
          ticketPrice={Number(raffle.ticket_price)}
          packages={raffle.packages?.map(p => ({ quantity: p.quantity, price: Number(p.price) }))}
          onReservationComplete={handleReservationComplete}
        />
        </div>
      </div>
    </>
  );
}
