import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  MapPin, 
  MessageCircle,
  ChevronRight,
  Phone,
  Mail
} from "lucide-react";
import { 
  FaFacebook, 
  FaInstagram, 
  FaTiktok, 
  FaGlobe,
  FaWhatsapp
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
  isLightTemplate?: boolean;
}

export function OrganizerSection({ organization, raffleTitle, brandColor, isLightTemplate = false }: OrganizerSectionProps) {
  // Theme-aware colors
  const colors = isLightTemplate ? {
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    textSubtle: 'text-gray-400',
    cardBg: 'bg-white',
    cardBgSubtle: 'bg-gray-50',
    border: 'border-gray-200',
    borderSubtle: 'border-gray-100',
    avatarBg: 'bg-gray-100',
    avatarText: 'text-gray-700',
  } : {
    text: 'text-white',
    textMuted: 'text-white/50',
    textSubtle: 'text-white/40',
    cardBg: 'bg-white/[0.03]',
    cardBgSubtle: 'bg-white/[0.02]',
    border: 'border-white/[0.06]',
    borderSubtle: 'border-white/[0.04]',
    avatarBg: 'bg-white/[0.05]',
    avatarText: 'text-white',
  };

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

  // Get all contact methods
  const allWhatsApps = [
    ...(organization.whatsapp_numbers || []),
    ...(organization.whatsapp_number && !organization.whatsapp_numbers?.includes(organization.whatsapp_number) 
      ? [organization.whatsapp_number] 
      : [])
  ].filter(Boolean);

  const allPhones = (organization.phones || []).filter(Boolean);
  const allEmails = (organization.emails || []).filter(Boolean);
  
  const whatsappMessage = `¡Hola! Vi su sorteo "${raffleTitle}" y tengo una pregunta.`;
  
  const formatWhatsAppLink = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  };

  const formatPhoneLink = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    return `tel:+${cleanNumber}`;
  };

  const hasContactInfo = allWhatsApps.length > 0 || allPhones.length > 0 || allEmails.length > 0;
  const hasLocation = organization.city || organization.address;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn("py-16 border-y", colors.border)}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className={cn("text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mb-3", colors.textSubtle)}>
            Organizador
          </p>
          <h2 className={cn("text-2xl sm:text-3xl font-bold tracking-tight", colors.text)}>
            Sobre el Organizador
          </h2>
        </div>

        <div className={cn("rounded-2xl border backdrop-blur-sm overflow-hidden", colors.cardBg, colors.border)}>
          <div className="p-6 sm:p-8">
            {/* Avatar and info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-emerald-500/30">
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                <AvatarFallback className={cn("text-xl sm:text-2xl font-bold", colors.avatarBg, colors.avatarText)}>
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <h3 className={cn("text-xl sm:text-2xl font-bold", colors.text)}>
                    {organization.name}
                  </h3>
                  {organization.verified && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
                  )}
                </div>
                {organization.description && (
                  <p className={cn("mt-3 text-sm", colors.textMuted)}>
                    {organization.description}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-6">
              {organization.years_experience && organization.years_experience > 0 && (
                <div className={cn("text-center px-4 py-2 rounded-lg border", colors.cardBgSubtle, colors.borderSubtle)}>
                  <p className={cn("text-xs", colors.textSubtle)}>Experiencia</p>
                  <p className={cn("font-semibold text-sm", colors.text)}>
                    {organization.years_experience} {organization.years_experience === 1 ? "año" : "años"}
                  </p>
                </div>
              )}
              {organization.total_raffles_completed && organization.total_raffles_completed > 0 && (
                <div className={cn("text-center px-4 py-2 rounded-lg border", colors.cardBgSubtle, colors.borderSubtle)}>
                  <p className={cn("text-xs", colors.textSubtle)}>Rifas realizadas</p>
                  <p className={cn("font-semibold text-sm", colors.text)}>{organization.total_raffles_completed}</p>
                </div>
              )}
              {timeOnPlatform && (
                <div className={cn("text-center px-4 py-2 rounded-lg border", colors.cardBgSubtle, colors.borderSubtle)}>
                  <p className={cn("text-xs", colors.textSubtle)}>En plataforma</p>
                  <p className={cn("font-semibold text-sm", colors.text)}>{timeOnPlatform}</p>
                </div>
              )}
            </div>

            {/* Location Section */}
            {hasLocation && (
              <div className={cn("flex items-start gap-3 p-4 rounded-xl border mb-6", colors.cardBgSubtle, colors.borderSubtle)}>
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className={cn("text-xs uppercase tracking-wider mb-1", colors.textSubtle)}>Ubicación</p>
                  {organization.city && (
                    <p className={cn("text-sm font-medium", colors.text)}>{organization.city}</p>
                  )}
                  {organization.address && (
                    <p className={cn("text-xs mt-0.5", colors.textMuted)}>{organization.address}</p>
                  )}
                </div>
              </div>
            )}

            {/* Contact Methods Section */}
            {hasContactInfo && (
              <div className="space-y-4 mb-6">
                {/* WhatsApp Numbers */}
                {allWhatsApps.length > 0 && (
                  <div className={cn("p-4 rounded-xl border", colors.cardBgSubtle, colors.borderSubtle)}>
                    <p className={cn("text-xs uppercase tracking-wider mb-3 flex items-center gap-2", colors.textSubtle)}>
                      <FaWhatsapp className="w-3.5 h-3.5 text-emerald-500" />
                      WhatsApp
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allWhatsApps.map((number, idx) => (
                        <a
                          key={idx}
                          href={formatWhatsAppLink(number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 rounded-lg px-3 py-2 transition-all group"
                        >
                          <FaWhatsapp className="w-4 h-4 text-emerald-500" />
                          <span className={cn("text-sm group-hover:text-emerald-500", isLightTemplate ? "text-gray-700" : "text-white/80")}>
                            {number}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phone Numbers */}
                {allPhones.length > 0 && (
                  <div className={cn("p-4 rounded-xl border", colors.cardBgSubtle, colors.borderSubtle)}>
                    <p className={cn("text-xs uppercase tracking-wider mb-3 flex items-center gap-2", colors.textSubtle)}>
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      Teléfonos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allPhones.map((number, idx) => (
                        <a
                          key={idx}
                          href={formatPhoneLink(number)}
                          className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-lg px-3 py-2 transition-all group"
                        >
                          <Phone className="w-4 h-4 text-blue-500" />
                          <span className={cn("text-sm group-hover:text-blue-500", isLightTemplate ? "text-gray-700" : "text-white/80")}>
                            {number}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Addresses */}
                {allEmails.length > 0 && (
                  <div className={cn("p-4 rounded-xl border", colors.cardBgSubtle, colors.borderSubtle)}>
                    <p className={cn("text-xs uppercase tracking-wider mb-3 flex items-center gap-2", colors.textSubtle)}>
                      <Mail className="w-3.5 h-3.5 text-purple-500" />
                      Correos electrónicos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allEmails.map((email, idx) => (
                        <a
                          key={idx}
                          href={`mailto:${email}?subject=Consulta sobre sorteo: ${raffleTitle}`}
                          className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/30 rounded-lg px-3 py-2 transition-all group"
                        >
                          <Mail className="w-4 h-4 text-purple-500" />
                          <span className={cn("text-sm truncate max-w-[220px] group-hover:text-purple-500", isLightTemplate ? "text-gray-700" : "text-white/80")}>
                            {email}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="mb-6">
                <p className={cn("text-xs uppercase tracking-wider mb-3", colors.textSubtle)}>Redes Sociales</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  {socialLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                        isLightTemplate 
                          ? "bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                          : "bg-white/[0.05] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08]"
                      )}
                      title={link.label}
                    >
                      <link.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* View all raffles button */}
            {organization.slug && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className={cn(
                  "w-full",
                  isLightTemplate 
                    ? "border-gray-200 text-gray-900 hover:bg-gray-50"
                    : "border-white/[0.08] text-white hover:bg-white/[0.05]"
                )}
              >
                <Link to={`/${organization.slug}`}>
                  Ver todos los sorteos de {organization.name}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}