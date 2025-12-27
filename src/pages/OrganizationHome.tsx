import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useOrganizationBySlug } from "@/hooks/useOrganizationBySlug";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Loader2, Calendar, Ticket, Building2, ArrowRight, Trophy, Users, 
  Clock, Mail, Phone, MapPin, Globe, BadgeCheck, MessageCircle,
  Facebook, Instagram, ExternalLink
} from "lucide-react";
import { CoverCarousel, CoverMediaItem } from "@/components/organization/CoverCarousel";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/currency-utils";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export default function OrganizationHome() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: organization, isLoading, error } = useOrganizationBySlug(orgSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 gap-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>
        
        <div className="relative z-10 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <Building2 className="h-10 w-10 text-primary/60" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Organización no encontrada</h1>
          <p className="text-muted-foreground">La organización que buscas no existe o no está disponible.</p>
          <Button asChild className="bg-gradient-to-r from-primary via-primary/80 to-accent hover:from-primary/90 hover:via-primary/70 hover:to-accent/90 shadow-lg shadow-primary/25">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const brandColor = organization.brand_color || "#2563EB";
  const hasSocialLinks = organization.facebook_url || organization.instagram_url || organization.tiktok_url || organization.website_url;
  const hasContactInfo = organization.email || organization.phone || organization.whatsapp_number || organization.city;
  const memberSince = organization.created_at 
    ? formatDistanceToNow(new Date(organization.created_at), { addSuffix: false, locale: es })
    : null;

  // Build cover media array with fallback to legacy cover_image_url
  const coverMedia: CoverMediaItem[] = (() => {
    const org = organization as any;
    if (org.cover_media && Array.isArray(org.cover_media) && org.cover_media.length > 0) {
      return org.cover_media;
    }
    if (organization.cover_image_url) {
      return [{ type: "image" as const, url: organization.cover_image_url, order: 0 }];
    }
    return [];
  })();

  return (
    <>
      <Helmet>
        <title>{organization.name} - Sorteos</title>
        <meta name="description" content={organization.description || `Participa en los sorteos de ${organization.name}. Compra tus boletos y gana increíbles premios.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section with Cover Carousel */}
        <header className="relative">
          {/* Cover Media Carousel */}
          <CoverCarousel 
            media={coverMedia} 
            brandColor={brandColor}
            autoPlayInterval={5000}
          />
          
          {/* Profile Section */}
          <div className="max-w-6xl mx-auto px-4">
            <div className="relative -mt-16 sm:-mt-20 pb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-background shadow-xl ring-4 ring-background">
                  <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                  <AvatarFallback 
                    className="text-3xl sm:text-4xl font-bold"
                    style={{ backgroundColor: brandColor, color: "white" }}
                  >
                    {organization.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center sm:text-left pb-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{organization.name}</h1>
                    {organization.verified && (
                      <BadgeCheck 
                        className="h-6 w-6 flex-shrink-0" 
                        style={{ color: brandColor }}
                      />
                    )}
                  </div>
                  
                  {organization.description && (
                    <p className="text-muted-foreground mt-1 max-w-xl">
                      {organization.description}
                    </p>
                  )}
                  
                  {organization.city && (
                    <div className="flex items-center justify-center sm:justify-start gap-1 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{organization.city}</span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {hasSocialLinks && (
                  <div className="flex gap-2 pb-2">
                    {organization.facebook_url && (
                      <Button size="icon" variant="outline" asChild>
                        <a href={organization.facebook_url} target="_blank" rel="noopener noreferrer">
                          <Facebook className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {organization.instagram_url && (
                      <Button size="icon" variant="outline" asChild>
                        <a href={organization.instagram_url} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {organization.tiktok_url && (
                      <Button size="icon" variant="outline" asChild>
                        <a href={organization.tiktok_url} target="_blank" rel="noopener noreferrer">
                          <TikTokIcon className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {organization.website_url && (
                      <Button size="icon" variant="outline" asChild>
                        <a href={organization.website_url} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Stats Section */}
        <section className="border-y border-border bg-gradient-to-r from-muted/50 via-background to-primary/5">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Ticket className="h-4 w-4" />
                  <span className="text-sm">Sorteos</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{organization.stats.totalRaffles}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Boletos Vendidos</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{organization.stats.totalTicketsSold.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm">Ganadores</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{organization.stats.totalWinners}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">En la plataforma</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{memberSince || "-"}</p>
              </div>
            </div>
          </div>
        </section>

        <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
          {/* Active Raffles Section */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Ticket className="h-6 w-6" style={{ color: brandColor }} />
              Sorteos Activos
            </h2>
            
            {organization.raffles.length === 0 ? (
              <Card className="p-8 text-center">
                <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No hay sorteos activos
                </h3>
                <p className="text-muted-foreground">
                  Esta organización no tiene sorteos disponibles en este momento.
                </p>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {organization.raffles.map((raffle) => {
                  const progressPercent = raffle.total_tickets > 0 
                    ? (raffle.tickets_sold / raffle.total_tickets) * 100 
                    : 0;
                  const prizeImage = raffle.prize_images?.[0];

                  return (
                    <Card 
                      key={raffle.id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      <div className="aspect-video relative overflow-hidden bg-muted">
                        {prizeImage ? (
                          <img 
                            src={prizeImage} 
                            alt={raffle.prize_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Ticket className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge 
                          className="absolute top-3 right-3"
                          style={{ backgroundColor: brandColor }}
                        >
                          {formatCurrency(raffle.ticket_price, raffle.currency_code || "MXN")}
                        </Badge>
                      </div>

                      <CardContent className="p-4 space-y-4">
                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {raffle.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {raffle.prize_name}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{raffle.tickets_sold} vendidos</span>
                            <span>{raffle.tickets_available} disponibles</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>

                        {raffle.draw_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Sorteo: {format(new Date(raffle.draw_date), "d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                          </div>
                        )}

                        <Button 
                          asChild 
                          className="w-full group/btn"
                          style={{ backgroundColor: brandColor }}
                        >
                          <Link to={`/${orgSlug}/${raffle.slug}`}>
                            Participar
                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Raffle History Section */}
          {organization.completedRaffles.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Trophy className="h-6 w-6" style={{ color: brandColor }} />
                Historial de Sorteos
              </h2>
              
              <Accordion type="single" collapsible className="space-y-2">
                {organization.completedRaffles.map((raffle) => {
                  const prizeImage = raffle.prize_images?.[0];
                  const winnerName = raffle.winner_data?.buyer_name;
                  const winnerTicket = raffle.winner_data?.ticket_number;

                  return (
                    <AccordionItem 
                      key={raffle.id} 
                      value={raffle.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {prizeImage ? (
                              <img src={prizeImage} alt={raffle.prize_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Ticket className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{raffle.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{raffle.prize_name}</p>
                          </div>
                          {raffle.winner_announced && (
                            <Badge variant="secondary" className="hidden sm:flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              Sorteado
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid sm:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Premio:</span>{" "}
                              <span className="font-medium">{raffle.prize_name}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Boletos vendidos:</span>{" "}
                              <span className="font-medium">{raffle.tickets_sold.toLocaleString()}</span>
                            </p>
                            {raffle.draw_date && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Fecha del sorteo:</span>{" "}
                                <span className="font-medium">
                                  {format(new Date(raffle.draw_date), "d 'de' MMMM, yyyy", { locale: es })}
                                </span>
                              </p>
                            )}
                          </div>
                          {raffle.winner_announced && winnerName && (
                            <Card className="bg-muted/50 border-0">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Trophy className="h-5 w-5" style={{ color: brandColor }} />
                                  <span className="font-semibold text-foreground">Ganador</span>
                                </div>
                                <p className="text-foreground font-medium">{winnerName}</p>
                                {winnerTicket && (
                                  <p className="text-sm text-muted-foreground">Boleto #{winnerTicket}</p>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </section>
          )}

          {/* Contact Section */}
          {hasContactInfo && (
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Mail className="h-6 w-6" style={{ color: brandColor }} />
                Contacto
              </h2>
              
              <Card>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organization.email && (
                      <a 
                        href={`mailto:${organization.email}`}
                        className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                      >
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${brandColor}20` }}
                        >
                          <Mail className="h-5 w-5" style={{ color: brandColor }} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{organization.email}</p>
                        </div>
                      </a>
                    )}
                    
                    {organization.phone && (
                      <a 
                        href={`tel:${organization.phone}`}
                        className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                      >
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${brandColor}20` }}
                        >
                          <Phone className="h-5 w-5" style={{ color: brandColor }} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Teléfono</p>
                          <p className="font-medium">{organization.phone}</p>
                        </div>
                      </a>
                    )}
                    
                    {organization.whatsapp_number && (
                      <a 
                        href={`https://wa.me/${organization.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                      >
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${brandColor}20` }}
                        >
                          <MessageCircle className="h-5 w-5" style={{ color: brandColor }} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">WhatsApp</p>
                          <p className="font-medium">{organization.whatsapp_number}</p>
                        </div>
                      </a>
                    )}
                    
                    {organization.city && (
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${brandColor}20` }}
                        >
                          <MapPin className="h-5 w-5" style={{ color: brandColor }} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ubicación</p>
                          <p className="font-medium text-foreground">{organization.city}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </main>

        {/* WhatsApp Floating Button */}
        {organization.whatsapp_number && (
          <a
            href={`https://wa.me/${organization.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110"
            aria-label="Contactar por WhatsApp"
          >
            <MessageCircle className="h-6 w-6" />
          </a>
        )}

        {/* Footer */}
        <footer className="border-t bg-muted/30 py-8 px-4 mt-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                  <AvatarFallback style={{ backgroundColor: brandColor, color: "white" }}>
                    {organization.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{organization.name}</p>
                  <p className="text-xs text-muted-foreground">
                    © {new Date().getFullYear()} Todos los derechos reservados
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Powered by</span>
                <a 
                  href="https://sortavo.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-foreground hover:text-primary flex items-center gap-1"
                >
                  Sortavo
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
