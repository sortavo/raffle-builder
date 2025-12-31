import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  Trophy, 
} from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";
import { getTemplateById } from "@/lib/raffle-utils";
import { usePublicRaffle } from "@/hooks/usePublicRaffle";
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

export default function PublicRaffle() {
  const { slug, orgSlug } = useParams<{ slug: string; orgSlug?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ticketsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { data: raffle, isLoading, error } = usePublicRaffle(slug);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showStickyFooter, setShowStickyFooter] = useState(false);

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
    buyerData: { name: string; email: string },
    totalAmount: number,
    referenceCode: string
  ) => {
    setCheckoutOpen(false);
    // Navigate to payment page, preserving organization context
    const paymentPath = isFromOrganization 
      ? `/${orgSlug}/${slug}/payment`
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
  const sections = customization.sections || {};
  
  // Section visibility toggles (default to true if not explicitly set to false)
  const showHero = sections.hero !== false;
  const showCountdown = sections.countdown !== false;
  const showTicketGrid = sections.ticket_grid !== false;
  const showPackages = sections.packages !== false;
  const showGallery = sections.gallery !== false;
  const showVideo = sections.video !== false;
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
        {/* Mobile Hero - Full lottery experience */}
        {isMobile && showHero ? (
          <>
            <MobileHero
              raffle={{
                title: raffle.title,
                prize_name: raffle.prize_name,
                prize_images: showGallery ? raffle.prize_images : [],
                prize_video_url: showVideo ? raffle.prize_video_url : null,
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
                initialIndex={lightboxIndex}
                open={lightboxOpen}
                onOpenChange={setLightboxOpen}
              />
            )}
          </>
        ) : isMobile ? (
          /* Mobile without hero - simple header */
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 py-8 px-4">
            <h1 className="text-2xl font-bold text-foreground text-center">{raffle.title}</h1>
            <p className="text-muted-foreground text-center mt-2">{raffle.prize_name}</p>
          </div>
        ) : null}
        
        {!isMobile && showHero && (
          <>
            <TemplateHeroLayout
              raffle={{
                title: raffle.title,
                description: raffle.description,
                prize_name: raffle.prize_name,
                prize_images: showGallery ? raffle.prize_images : [],
                prize_video_url: showVideo ? raffle.prize_video_url : null,
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
              showVideo={showVideo}
              showStats={showStats}
              onScrollToTickets={scrollToTickets}
              onShare={shareRaffle}
            />

            {/* Desktop Countdown */}
            {showCountdown && raffle.draw_date && (
              <div className="py-8" style={{ background: gradient }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-4">
                    <p className="text-white/80 text-sm font-medium uppercase tracking-wider">El sorteo se realizará en</p>
                  </div>
                  <CountdownTimer targetDate={new Date(raffle.draw_date)} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Desktop without hero - simple header */}
        {!isMobile && !showHero && (
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 py-12 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">{raffle.title}</h1>
              <p className="text-muted-foreground mt-3 text-lg">{raffle.prize_name}</p>
            </div>
          </div>
        )}
        {/* Purchase Toast Notifications */}
        {showPurchaseToasts && <PurchaseToast raffleId={raffle.id} />}

        {/* How To Participate - Mobile only shows this compact version */}
        {isMobile && showHowItWorks && <HowToParticipate />}

        {/* Ticket Selection Section */}
        {showTicketGrid && (
          <div ref={ticketsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16" id="tickets">
            <div className="text-center mb-8 lg:mb-12">
              <h2 className="text-2xl lg:text-4xl font-bold text-foreground mb-2 lg:mb-3">
                {isMobile ? "Elige tus Boletos" : "Selecciona tus Boletos de la Suerte"}
              </h2>
              <p className="text-base lg:text-lg text-muted-foreground">
                {isMobile ? "¡La suerte te espera!" : "Elige los números que te llevarán a la victoria"}
              </p>
            </div>

            <TicketSelector
              raffleId={raffle.id}
              totalTickets={raffle.total_tickets}
              ticketPrice={Number(raffle.ticket_price)}
              currencyCode={currency}
              maxPerPurchase={raffle.max_tickets_per_purchase || 100}
              packages={showPackages ? (raffle.packages || []) : []}
              onContinue={handleContinue}
              showRandomPicker={showRandomPicker}
              showLuckyNumbers={showLuckyNumbers}
              showWinnersHistory={showWinnersHistory}
              showProbabilityStats={showStats && showProbabilityStats}
              ticketsSold={showStats ? raffle.ticketsSold : 0}
              ticketsAvailable={raffle.ticketsAvailable}
            />

            {showSocialProof && (
              <div className="mt-12">
                <SocialProof raffleId={raffle.id} className="max-w-2xl mx-auto" />
              </div>
            )}
          </div>
        )}

        {/* Transparency Section - shows on both mobile and desktop */}
        <TransparencySection 
          drawMethod={(raffle as any).draw_method}
          livestreamUrl={(raffle as any).livestream_url}
        />

        {/* How It Works - Desktop only (mobile uses compact version above) */}
        {!isMobile && showHowItWorks && (
          <div className="bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">¿Cómo Participar?</h2>
                <p className="text-lg text-gray-600">Es muy fácil, solo sigue estos pasos</p>
              </div>
              <HowToParticipate />
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
            }}
            raffleTitle={raffle.title}
            brandColor={primaryColor}
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
          />
        )}

        {/* Terms Section */}
        {raffle.prize_terms && (
          <div className="bg-muted/50 py-12 lg:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6">Términos y Condiciones</h2>
              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 prose prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap">{raffle.prize_terms}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Share Section */}
        {showShareButtons && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 text-center">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">¡Comparte y gana!</h2>
            <p className="text-muted-foreground mb-6">Comparte este sorteo con tus amigos</p>
            <ShareButtons url={url} title={raffle.title} description={raffle.description || undefined} />
          </div>
        )}

        {/* Footer */}
        {!limits.canRemoveBranding && (
          <footer className="border-t border-border py-8 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>Powered by <span className="font-semibold text-primary">Sortavo</span></p>
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
          ticketPrice={Number(raffle.ticket_price)}
          packages={raffle.packages?.map(p => ({ quantity: p.quantity, price: Number(p.price) }))}
          onReservationComplete={handleReservationComplete}
        />
      </div>
    </>
  );
}
