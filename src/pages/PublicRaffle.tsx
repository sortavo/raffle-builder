import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Loader2, 
  Calendar, 
  Trophy, 
  Ticket, 
  Share2, 
  Shield, 
  CheckCircle2, 
  ChevronRight,
  Zap,
  Clock,
  Users
} from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";
import { usePublicRaffle } from "@/hooks/usePublicRaffle";
import { TicketSelector } from "@/components/raffle/public/TicketSelector";
import { CheckoutModal } from "@/components/raffle/public/CheckoutModal";
import { CountdownTimer } from "@/components/raffle/public/CountdownTimer";
import { ShareButtons } from "@/components/raffle/public/ShareButtons";
import { HowItWorks } from "@/components/raffle/public/HowItWorks";
import { UrgencyBadge } from "@/components/marketing/UrgencyBadge";
import { SocialProof } from "@/components/marketing/SocialProof";
import { PurchaseToast } from "@/components/marketing/PurchaseToast";
import { ViewersCount } from "@/components/marketing/ViewersCount";
import { StickyUrgencyBanner } from "@/components/marketing/StickyUrgencyBanner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function PublicRaffle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ticketsRef = useRef<HTMLDivElement>(null);
  const { data: raffle, isLoading, error } = usePublicRaffle(slug);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
    navigate(`/r/${slug}/payment`, {
      state: { tickets, reservedUntil, raffleId: raffle?.id, buyerName: buyerData.name, buyerEmail: buyerData.email },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-violet-600 mx-auto" />
          <p className="text-gray-600">Cargando sorteo...</p>
        </div>
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Sorteo no encontrado</h1>
        <p className="text-gray-600 text-center">Este sorteo no existe o ya no está activo.</p>
        <Button 
          onClick={() => navigate("/")}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
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
  const showLuckyNumbers = (raffle as any).lucky_numbers_enabled || false;
  const showWinnersHistory = customization.show_winners_history !== false;
  const showProbabilityStats = customization.show_probability_stats !== false;
  const showViewersCount = customization.show_viewers_count !== false;
  const showPurchaseToasts = customization.show_purchase_toasts !== false;
  const showUrgencyBadge = customization.show_urgency_badge !== false;
  const showStickyBanner = customization.show_sticky_banner !== false;
  const showSocialProof = customization.show_social_proof !== false;

  return (
    <>
      <Helmet>
        <title>{raffle.title} - Sortavo</title>
        <meta name="description" content={raffle.description || `Participa en ${raffle.title}`} />
        <meta property="og:title" content={raffle.title} />
        <meta property="og:description" content={raffle.description || ''} />
        {raffle.prize_images?.[0] && <meta property="og:image" content={raffle.prize_images[0]} />}
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-white">
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
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-50" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(139 92 246 / 0.1) 1px, transparent 0)`,
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
                    <div className="absolute bottom-4 left-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-xl">
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
              </div>

              {/* Right: Info */}
              <div className="space-y-6 order-1 lg:order-2">
                {/* Organization logo */}
                {raffle.organization?.logo_url && (
                  <img 
                    src={raffle.organization.logo_url} 
                    alt={raffle.organization.name} 
                    className="h-10 object-contain" 
                  />
                )}

                {/* Status badge */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium">
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

                {/* Title */}
                <div className="space-y-3">
                  <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
                    {raffle.prize_name}
                  </h1>
                  <p className="text-lg lg:text-xl text-gray-600">
                    {raffle.title}
                  </p>
                  {raffle.description && (
                    <p className="text-gray-500">{raffle.description}</p>
                  )}
                </div>

                {/* Key info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Precio</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(Number(raffle.ticket_price), currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Sorteo</p>
                        <p className="text-lg font-bold text-gray-900">
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
                    <span className="font-medium text-gray-900">
                      {raffle.ticketsSold} de {raffle.total_tickets} vendidos
                    </span>
                    <span className="text-violet-600 font-semibold">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  
                  <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    {raffle.ticketsAvailable} boletos disponibles
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-lg py-6 shadow-xl shadow-violet-500/30 group"
                    onClick={scrollToTickets}
                  >
                    <Ticket className="w-5 h-5 mr-2" />
                    Comprar Boletos
                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-gray-300 hover:border-violet-600 hover:text-violet-600 py-6"
                    onClick={shareRaffle}
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Compartir
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-4 lg:gap-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span>Pago 100% Seguro</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Sorteo Verificable</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-5 h-5 text-green-600" />
                    <span>{raffle.ticketsSold}+ participantes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Countdown Section */}
        {raffle.draw_date && (
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 py-8">
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