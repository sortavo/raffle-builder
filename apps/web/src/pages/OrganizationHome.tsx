import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useOrganizationBySlug } from "@/hooks/useOrganizationBySlug";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
import { useScopedDarkMode } from "@/hooks/useScopedDarkMode";
import { PremiumNavbar } from "@/components/layout/PremiumNavbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { StructuredData, createOrganizationSchema, createBreadcrumbSchema } from "@/components/seo/StructuredData";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface OrganizationHomeProps {
  orgSlugOverride?: string;
}

export default function OrganizationHome({ orgSlugOverride }: OrganizationHomeProps = {}) {
  const { orgSlug: paramSlug } = useParams<{ orgSlug: string }>();
  const orgSlug = orgSlugOverride || paramSlug;
  const { data: organization, isLoading, error } = useOrganizationBySlug(orgSlug);
  
  // Enable dark mode for this page
  useScopedDarkMode();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ultra-dark">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ultra-dark gap-4 relative overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[10%] -right-[10%] w-[400px] h-[400px] bg-teal-500/15 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        
        <div className="relative z-10 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 flex items-center justify-center">
            <Building2 className="h-10 w-10 text-emerald-400/60" />
          </div>
          <h1 className="text-2xl font-bold text-white">Organización no encontrada</h1>
          <p className="text-white/50">La organización que buscas no existe o no está disponible.</p>
          <Button asChild variant="gradient">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const brandColor = organization.brand_color || "#10b981";
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

  // Create structured data
  const canonicalUrl = `https://sortavo.com/${orgSlug}`;
  const orgSchema = createOrganizationSchema({
    name: organization.name,
    slug: orgSlug,
    description: organization.description || undefined,
    logoUrl: organization.logo_url || undefined,
    email: organization.email || undefined,
    phone: organization.phone || undefined,
    city: organization.city || undefined,
    facebookUrl: organization.facebook_url || undefined,
    instagramUrl: organization.instagram_url || undefined,
    tiktokUrl: organization.tiktok_url || undefined,
    websiteUrl: organization.website_url || undefined,
  });
  
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Inicio', url: 'https://sortavo.com' },
    { name: organization.name },
  ]);

  return (
    <>
      <Helmet>
        <title>{organization.name} - Sorteos | Sortavo</title>
        <meta name="description" content={organization.description || `Participa en los sorteos de ${organization.name}. Compra tus boletos y gana increíbles premios.`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="Sortavo" />
        <meta property="og:title" content={`${organization.name} - Sorteos`} />
        <meta property="og:description" content={organization.description || `Sorteos de ${organization.name}`} />
        {organization.logo_url && <meta property="og:image" content={organization.logo_url} />}
        <meta property="og:url" content={canonicalUrl} />
      </Helmet>
      
      {/* Schema.org Structured Data */}
      <StructuredData data={[orgSchema, breadcrumbSchema]} />

      <div className="min-h-screen bg-ultra-dark overflow-x-hidden">
        {/* Premium Navbar */}
        <PremiumNavbar variant="transparent" showCTA={false} />

        {/* Hero Section with Cover Carousel */}
        <header className="relative pt-16">
          {/* Animated orbs */}
          <div className="absolute top-[5%] -left-[10%] w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[120px] animate-blob pointer-events-none" />
          <div className="absolute top-[20%] -right-[15%] w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000 pointer-events-none" />
          
          {/* Cover Media Carousel */}
          <CoverCarousel 
            media={coverMedia} 
            brandColor={brandColor}
            autoPlayInterval={5000}
          />
          
          {/* Profile Section */}
          <div className="max-w-6xl mx-auto px-4 relative z-10">
            <motion.div 
              className="relative -mt-16 sm:-mt-20 pb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-ultra-dark shadow-xl ring-4 ring-emerald-500/30">
                  <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                  <AvatarFallback 
                    className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-emerald-600 to-teal-500 text-white"
                  >
                    {organization.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center sm:text-left pb-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">{organization.name}</h1>
                    {organization.verified && (
                      <BadgeCheck className="h-6 w-6 flex-shrink-0 text-emerald-400" />
                    )}
                  </div>
                  
                  {organization.description && (
                    <p className="text-white/60 mt-1 max-w-xl">
                      {organization.description}
                    </p>
                  )}
                  
                  {organization.city && (
                    <div className="flex items-center justify-center sm:justify-start gap-1 mt-2 text-sm text-white/50">
                      <MapPin className="h-4 w-4" />
                      <span>{organization.city}</span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {hasSocialLinks && (
                  <div className="flex gap-2 pb-2">
                    {organization.facebook_url && (
                      <Button size="icon" variant="ghost" className="bg-white/[0.05] hover:bg-white/10 border border-white/10" asChild>
                        <a href={organization.facebook_url} target="_blank" rel="noopener noreferrer">
                          <Facebook className="h-4 w-4 text-white/70" />
                        </a>
                      </Button>
                    )}
                    {organization.instagram_url && (
                      <Button size="icon" variant="ghost" className="bg-white/[0.05] hover:bg-white/10 border border-white/10" asChild>
                        <a href={organization.instagram_url} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4 text-white/70" />
                        </a>
                      </Button>
                    )}
                    {organization.tiktok_url && (
                      <Button size="icon" variant="ghost" className="bg-white/[0.05] hover:bg-white/10 border border-white/10" asChild>
                        <a href={organization.tiktok_url} target="_blank" rel="noopener noreferrer">
                          <TikTokIcon className="h-4 w-4 text-white/70" />
                        </a>
                      </Button>
                    )}
                    {organization.website_url && (
                      <Button size="icon" variant="ghost" className="bg-white/[0.05] hover:bg-white/10 border border-white/10" asChild>
                        <a href={organization.website_url} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 text-white/70" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </header>

        {/* Stats Section - Glassmorphism */}
        <motion.section 
          className="border-y border-white/10 bg-white/[0.02] backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-white/50 mb-1">
                  <Ticket className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm">Sorteos</span>
                </div>
                <p className="text-2xl font-bold text-white">{organization.stats.totalRaffles}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-white/50 mb-1">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm">Boletos Vendidos</span>
                </div>
                <p className="text-2xl font-bold text-white">{organization.stats.totalTicketsSold.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-white/50 mb-1">
                  <Trophy className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm">Ganadores</span>
                </div>
                <p className="text-2xl font-bold text-white">{organization.stats.totalWinners}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-white/50 mb-1">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm">En la plataforma</span>
                </div>
                <p className="text-2xl font-bold text-white">{memberSince || "-"}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <main className="max-w-6xl mx-auto px-4 py-12 space-y-16 relative">
          {/* More animated orbs for depth */}
          <div className="absolute top-[30%] -left-[20%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[20%] -right-[15%] w-[350px] h-[350px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Active Raffles Section */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 
              variants={itemVariants}
              className="text-2xl sm:text-3xl font-bold text-white mb-8 flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-white" />
              </div>
              Sorteos Activos
            </motion.h2>
            
            {organization.raffles.length === 0 ? (
              <motion.div variants={itemVariants}>
                <Card className="p-8 text-center bg-white/[0.03] backdrop-blur-xl border-white/10">
                  <Ticket className="h-12 w-12 mx-auto text-white/30 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No hay sorteos activos
                  </h3>
                  <p className="text-white/50">
                    Esta organización no tiene sorteos disponibles en este momento.
                  </p>
                </Card>
              </motion.div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {organization.raffles.map((raffle, index) => {
                  const progressPercent = raffle.total_tickets > 0 
                    ? (raffle.tickets_sold / raffle.total_tickets) * 100 
                    : 0;
                  const prizeImage = raffle.prize_images?.[0];

                  return (
                    <motion.div
                      key={raffle.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden bg-white/[0.03] backdrop-blur-xl border-white/10 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 group">
                        <div className="aspect-video relative overflow-hidden bg-white/[0.02]">
                          {prizeImage ? (
                            <img 
                              src={prizeImage} 
                              alt={raffle.prize_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Ticket className="h-12 w-12 text-white/20" />
                            </div>
                          )}
                          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-0">
                            {formatCurrency(raffle.ticket_price, raffle.currency_code || "MXN")}
                          </Badge>
                        </div>

                        <CardContent className="p-4 space-y-4">
                          <div>
                            <h3 className="font-semibold text-white line-clamp-1">
                              {raffle.title}
                            </h3>
                            <p className="text-sm text-white/50 line-clamp-1">
                              {raffle.prize_name}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-white/50">
                              <span>{raffle.tickets_sold} vendidos</span>
                              <span>{raffle.tickets_available} disponibles</span>
                            </div>
                            <Progress value={progressPercent} className="h-2 bg-white/10" />
                          </div>

                          {raffle.draw_date && (
                            <div className="flex items-center gap-2 text-sm text-white/50">
                              <Calendar className="h-4 w-4 text-emerald-400" />
                              <span>
                                Sorteo: {format(new Date(raffle.draw_date), "d 'de' MMMM, yyyy", { locale: es })}
                              </span>
                            </div>
                          )}

                          <Button 
                            asChild 
                            variant="gradient"
                            className="w-full group/btn"
                          >
                            <Link to={`/${orgSlug}/${raffle.slug}`}>
                              Participar
                              <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>

          {/* Raffle History Section */}
          {organization.completedRaffles.length > 0 && (
            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.h2 
                variants={itemVariants}
                className="text-2xl sm:text-3xl font-bold text-white mb-8 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                Historial de Sorteos
              </motion.h2>
              
              <Accordion type="single" collapsible className="space-y-3">
                {organization.completedRaffles.map((raffle, index) => {
                  const prizeImage = raffle.prize_images?.[0];
                  const winnerName = raffle.winner_data?.buyer_name;
                  const winnerTicket = raffle.winner_data?.ticket_number;

                  return (
                    <motion.div
                      key={raffle.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AccordionItem 
                        value={raffle.id}
                        className="border border-white/10 rounded-xl px-4 bg-white/[0.02] backdrop-blur-sm data-[state=open]:border-emerald-500/30"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-4 text-left">
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0">
                              {prizeImage ? (
                                <img src={prizeImage} alt={raffle.prize_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Ticket className="h-6 w-6 text-white/30" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white truncate">{raffle.title}</p>
                              <p className="text-sm text-white/50 truncate">{raffle.prize_name}</p>
                            </div>
                            {raffle.winner_announced && (
                              <Badge className="hidden sm:flex items-center gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
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
                                <span className="text-white/50">Premio:</span>{" "}
                                <span className="font-medium text-white">{raffle.prize_name}</span>
                              </p>
                              <p className="text-sm">
                                <span className="text-white/50">Boletos vendidos:</span>{" "}
                                <span className="font-medium text-white">{raffle.tickets_sold.toLocaleString()}</span>
                              </p>
                              {raffle.draw_date && (
                                <p className="text-sm">
                                  <span className="text-white/50">Fecha del sorteo:</span>{" "}
                                  <span className="font-medium text-white">
                                    {format(new Date(raffle.draw_date), "d 'de' MMMM, yyyy", { locale: es })}
                                  </span>
                                </p>
                              )}
                            </div>
                            {raffle.winner_announced && winnerName && (
                              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="h-5 w-5 text-amber-400" />
                                    <span className="font-semibold text-white">Ganador</span>
                                  </div>
                                  <p className="text-white font-medium">{winnerName}</p>
                                  {winnerTicket && (
                                    <p className="text-sm text-white/50">Boleto #{winnerTicket}</p>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  );
                })}
              </Accordion>
            </motion.section>
          )}

          {/* Contact Section */}
          {hasContactInfo && (
            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.h2 
                variants={itemVariants}
                className="text-2xl sm:text-3xl font-bold text-white mb-8 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                Contacto
              </motion.h2>
              
              <motion.div variants={itemVariants}>
                <Card className="bg-white/[0.03] backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {organization.email && (
                        <a 
                          href={`mailto:${organization.email}`}
                          className="flex items-center gap-3 text-white hover:text-emerald-400 transition-colors group"
                        >
                          <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                            <Mail className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white/50">Email</p>
                            <p className="font-medium">{organization.email}</p>
                          </div>
                        </a>
                      )}
                      
                      {organization.phone && (
                        <a 
                          href={`tel:${organization.phone}`}
                          className="flex items-center gap-3 text-white hover:text-emerald-400 transition-colors group"
                        >
                          <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                            <Phone className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white/50">Teléfono</p>
                            <p className="font-medium">{organization.phone}</p>
                          </div>
                        </a>
                      )}
                      
                      {organization.whatsapp_number && (
                        <a 
                          href={`https://wa.me/${organization.whatsapp_number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-white hover:text-green-400 transition-colors group"
                        >
                          <div className="h-10 w-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                            <MessageCircle className="h-5 w-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white/50">WhatsApp</p>
                            <p className="font-medium">{organization.whatsapp_number}</p>
                          </div>
                        </a>
                      )}
                      
                      {organization.city && (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white/50">Ubicación</p>
                            <p className="font-medium text-white">{organization.city}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.section>
          )}
        </main>

        {/* WhatsApp Floating Button */}
        {organization.whatsapp_number && (
          <a
            href={`https://wa.me/${organization.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg shadow-green-500/30 transition-all hover:scale-110 hover:shadow-xl hover:shadow-green-500/40"
            aria-label="Contactar por WhatsApp"
          >
            <MessageCircle className="h-6 w-6" />
          </a>
        )}

        {/* Organization Footer */}
        <footer className="border-t border-white/10 bg-white/[0.02] py-8 px-4 mt-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-emerald-500/30">
                  <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-500 text-white">
                    {organization.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">{organization.name}</p>
                  <p className="text-xs text-white/50">
                    © {new Date().getFullYear()} Todos los derechos reservados
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span>Powered by</span>
                <a 
                  href="https://sortavo.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
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
