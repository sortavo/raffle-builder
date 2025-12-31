import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  MapPin, 
  MessageCircle,
  ChevronRight
} from "lucide-react";
import { 
  FaFacebook, 
  FaInstagram, 
  FaTiktok, 
  FaGlobe 
} from "react-icons/fa";

interface OrganizerSectionProps {
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
    slug: string | null;
    description: string | null;
    whatsapp_number: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    tiktok_url: string | null;
    website_url: string | null;
    city: string | null;
    verified: boolean | null;
    brand_color: string | null;
    created_at: string | null;
    emails?: string[] | null;
    phones?: string[] | null;
    whatsapp_numbers?: string[] | null;
    years_experience?: number | null;
    total_raffles_completed?: number | null;
    address?: string | null;
  };
  raffleTitle: string;
  brandColor: string;
}

export function OrganizerSection({ organization, raffleTitle, brandColor }: OrganizerSectionProps) {
  const socialLinks = [
    { url: organization.facebook_url, icon: FaFacebook, label: "Facebook" },
    { url: organization.instagram_url, icon: FaInstagram, label: "Instagram" },
    { url: organization.tiktok_url, icon: FaTiktok, label: "TikTok" },
    { url: organization.website_url, icon: FaGlobe, label: "Sitio Web" },
  ].filter(link => link.url);

  // Calculate time on platform
  const getTimeOnPlatform = () => {
    if (!organization.created_at) return null;
    const created = new Date(organization.created_at);
    const now = new Date();
    const months = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return "Nuevo";
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    return years === 1 ? "1 año" : `${years} años`;
  };

  const timeOnPlatform = getTimeOnPlatform();

  // Get all whatsapp numbers
  const whatsappList = organization.whatsapp_numbers?.filter(w => w) || 
    (organization.whatsapp_number ? [organization.whatsapp_number] : []);
  
  // Primary WhatsApp link
  const whatsappMessage = `¡Hola! Vi su sorteo "${raffleTitle}" y tengo una pregunta.`;
  const primaryWhatsapp = whatsappList[0];
  const whatsappLink = primaryWhatsapp 
    ? `https://wa.me/${primaryWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="py-16 border-y border-border/50"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Organizador
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Sobre el Organizador
          </h2>
        </div>

        <div className="bg-card/50 rounded-2xl border border-border/50 overflow-hidden">
          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Avatar and info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-border">
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                <AvatarFallback className="text-xl sm:text-2xl font-bold bg-muted text-foreground">
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    {organization.name}
                  </h3>
                  {organization.verified && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
                  )}
                </div>
                {organization.city && (
                  <div className="flex items-center justify-center sm:justify-start gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{organization.city}</span>
                  </div>
                )}
                {organization.description && (
                  <p className="text-muted-foreground mt-3 text-sm">
                    {organization.description}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-6">
              {organization.years_experience && organization.years_experience > 0 && (
                <div className="text-center px-4 py-2 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">Experiencia</p>
                  <p className="font-semibold text-foreground text-sm">
                    {organization.years_experience} {organization.years_experience === 1 ? "año" : "años"}
                  </p>
                </div>
              )}
              {organization.total_raffles_completed && organization.total_raffles_completed > 0 && (
                <div className="text-center px-4 py-2 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">Rifas realizadas</p>
                  <p className="font-semibold text-foreground text-sm">{organization.total_raffles_completed}</p>
                </div>
              )}
              {timeOnPlatform && (
                <div className="text-center px-4 py-2 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">En plataforma</p>
                  <p className="font-semibold text-foreground text-sm">{timeOnPlatform}</p>
                </div>
              )}
            </div>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-6">
                {socialLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={link.label}
                  >
                    <link.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {whatsappLink && (
                <Button
                  asChild
                  size="lg"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Contactar por WhatsApp
                    {whatsappList.length > 1 && (
                      <span className="ml-1 text-xs opacity-75">
                        (+{whatsappList.length - 1})
                      </span>
                    )}
                  </a>
                </Button>
              )}
              
              {organization.slug && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="flex-1 border-border/50 text-foreground hover:bg-muted"
                >
                  <Link to={`/${organization.slug}`}>
                    Ver todos los sorteos
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
