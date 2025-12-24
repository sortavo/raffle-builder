import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Users, Trophy, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import { usePublicRaffle } from "@/hooks/usePublicRaffle";
import { TicketSelector } from "@/components/raffle/public/TicketSelector";
import { CheckoutModal } from "@/components/raffle/public/CheckoutModal";
import { CountdownTimer } from "@/components/raffle/public/CountdownTimer";
import { ShareButtons } from "@/components/raffle/public/ShareButtons";
import { PrizeGallery } from "@/components/raffle/public/PrizeGallery";
import { HowItWorks } from "@/components/raffle/public/HowItWorks";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PublicRaffle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Sorteo no encontrado</h1>
        <p className="text-muted-foreground">Este sorteo no existe o ya no está activo.</p>
        <Button onClick={() => navigate("/")}>Volver al inicio</Button>
      </div>
    );
  }

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const progress = (raffle.ticketsSold / raffle.total_tickets) * 100;

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

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-primary/10 to-background">
          <div className="container mx-auto px-4 py-8 md:py-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1 space-y-6">
                {raffle.organization?.logo_url && (
                  <img src={raffle.organization.logo_url} alt={raffle.organization.name} className="h-12 object-contain" />
                )}
                <h1 className="text-3xl md:text-5xl font-bold">{raffle.title}</h1>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="text-xl font-semibold">{raffle.prize_name}</span>
                  {raffle.prize_value && (
                    <Badge variant="secondary">
                      Valor: {formatCurrency(Number(raffle.prize_value), raffle.currency_code || 'MXN')}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{raffle.description}</p>
                <ShareButtons url={url} title={raffle.title} description={raffle.description || undefined} />
              </div>
              <div className="order-1 md:order-2">
                <PrizeGallery images={raffle.prize_images || []} title={raffle.prize_name} />
              </div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        {raffle.draw_date && (
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardContent className="py-6">
                <h2 className="text-center text-lg font-semibold mb-4">El sorteo se realizará en:</h2>
                <CountdownTimer targetDate={new Date(raffle.draw_date)} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats */}
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{raffle.ticketsSold}</p>
                <p className="text-sm text-muted-foreground">Boletos vendidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{raffle.ticketsAvailable}</p>
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <Progress value={progress} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{formatCurrency(Number(raffle.ticket_price), raffle.currency_code || 'MXN')}</p>
                <p className="text-sm text-muted-foreground">Por boleto</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold">
                  {raffle.draw_date ? format(new Date(raffle.draw_date), "dd MMM yyyy", { locale: es }) : 'Por definir'}
                </p>
                <p className="text-sm text-muted-foreground">Fecha del sorteo</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ticket Selection */}
        <div className="container mx-auto px-4 py-8" id="tickets">
          <h2 className="text-2xl font-bold mb-6">Elige tus Números de la Suerte</h2>
          <TicketSelector
            raffleId={raffle.id}
            totalTickets={raffle.total_tickets}
            ticketPrice={Number(raffle.ticket_price)}
            currencyCode={raffle.currency_code || 'MXN'}
            maxPerPurchase={raffle.max_tickets_per_purchase || 100}
            packages={raffle.packages || []}
            onContinue={handleContinue}
          />
        </div>

        <Separator className="my-8" />

        {/* How It Works */}
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">¿Cómo Participar?</h2>
          <HowItWorks />
        </div>

        {/* FAQ */}
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">Preguntas Frecuentes</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="how">
              <AccordionTrigger>¿Cómo participo?</AccordionTrigger>
              <AccordionContent>
                Selecciona tus boletos, completa tus datos, realiza el pago y sube tu comprobante.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="winner">
              <AccordionTrigger>¿Cómo sé si gané?</AccordionTrigger>
              <AccordionContent>
                Te contactaremos por email y teléfono si resultas ganador.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="when">
              <AccordionTrigger>¿Cuándo es el sorteo?</AccordionTrigger>
              <AccordionContent>
                {raffle.draw_date ? format(new Date(raffle.draw_date), "EEEE dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es }) : 'Fecha por confirmar'}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Terms */}
        {raffle.prize_terms && (
          <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-4">Términos y Condiciones</h2>
            <Card>
              <CardContent className="pt-6 prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{raffle.prize_terms}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t py-8 mt-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>Powered by Sortavo</p>
          </div>
        </footer>

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
