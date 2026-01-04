import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  MapPin, 
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

interface ContactSectionProps {
  organization: {
    name: string;
    city: string | null;
    address: string | null;
    whatsapp_number: string | null;
    whatsapp_numbers: string[];
    phones: string[];
    emails: string[];
    facebook_url: string | null;
    instagram_url: string | null;
    tiktok_url: string | null;
    website_url: string | null;
  };
  raffleTitle: string;
  isLightTemplate?: boolean;
  primaryColor?: string;
}

export function ContactSection({ organization, raffleTitle, isLightTemplate = false, primaryColor = '#10b981' }: ContactSectionProps) {
  // Theme-aware colors
  const colors = isLightTemplate ? {
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    textSubtle: 'text-gray-400',
    cardBg: 'bg-white',
    cardBgSubtle: 'bg-gray-50',
    border: 'border-gray-200',
    borderSubtle: 'border-gray-100',
  } : {
    text: 'text-white',
    textMuted: 'text-white/50',
    textSubtle: 'text-white/40',
    cardBg: 'bg-white/[0.03]',
    cardBgSubtle: 'bg-white/[0.02]',
    border: 'border-white/[0.06]',
    borderSubtle: 'border-white/[0.04]',
  };

  // Combine all WhatsApp numbers
  const allWhatsApps = [
    ...organization.whatsapp_numbers,
    ...(organization.whatsapp_number && !organization.whatsapp_numbers.includes(organization.whatsapp_number) 
      ? [organization.whatsapp_number] 
      : [])
  ].filter(Boolean);

  const allPhones = organization.phones.filter(Boolean);
  const allEmails = organization.emails.filter(Boolean);

  const socialLinks = [
    { url: organization.facebook_url, icon: FaFacebook, label: "Facebook" },
    { url: organization.instagram_url, icon: FaInstagram, label: "Instagram" },
    { url: organization.tiktok_url, icon: FaTiktok, label: "TikTok" },
    { url: organization.website_url, icon: FaGlobe, label: "Sitio Web" },
  ].filter(link => link.url);

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
  const hasSocials = socialLinks.length > 0;

  // Don't render if no contact info at all
  if (!hasContactInfo && !hasLocation && !hasSocials) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20"
    >
      <div className="text-center mb-10">
        <p className={cn("text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mb-3", colors.textSubtle)}>
          Contacto
        </p>
        <h2 className={cn("text-xl lg:text-2xl font-bold tracking-tight", colors.text)}>
          ¿Tienes preguntas?
        </h2>
        <p className={cn("mt-2", colors.textMuted)}>Contacta a {organization.name}</p>
      </div>

      <div className={cn("rounded-2xl border backdrop-blur-sm p-6 sm:p-8 space-y-6", colors.cardBg, colors.border)}>
        {/* Location */}
        {hasLocation && (
          <div className={cn("flex items-start gap-4 p-4 rounded-xl border", colors.cardBgSubtle, colors.borderSubtle)}>
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

        {/* WhatsApp Numbers */}
        {allWhatsApps.length > 0 && (
          <div>
            <p className={cn("text-xs uppercase tracking-wider mb-3 flex items-center gap-2", colors.textSubtle)}>
              <FaWhatsapp className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              WhatsApp
            </p>
            <div className="flex flex-wrap gap-2">
              {allWhatsApps.map((number, idx) => (
                <a
                  key={idx}
                  href={formatWhatsAppLink(number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-all group border"
                  style={{ 
                    backgroundColor: `${primaryColor}10`,
                    borderColor: `${primaryColor}20`,
                  }}
                >
                  <FaWhatsapp className="w-4 h-4" style={{ color: primaryColor }} />
                  <span className={cn("text-sm", isLightTemplate ? "text-gray-700" : "text-white/80")} style={{ '--hover-color': primaryColor } as React.CSSProperties}>
                    {number}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Phone Numbers */}
        {allPhones.length > 0 && (
          <div>
            <p className={cn("text-xs uppercase tracking-wider mb-3 flex items-center gap-2", colors.textSubtle)}>
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              Teléfonos
            </p>
            <div className="flex flex-wrap gap-2">
              {allPhones.map((number, idx) => (
                <a
                  key={idx}
                  href={formatPhoneLink(number)}
                  className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-lg px-4 py-2.5 transition-all group"
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
          <div>
            <p className={cn("text-xs uppercase tracking-wider mb-3 flex items-center gap-2", colors.textSubtle)}>
              <Mail className="w-3.5 h-3.5 text-purple-500" />
              Correos electrónicos
            </p>
            <div className="flex flex-wrap gap-2">
              {allEmails.map((email, idx) => (
                <a
                  key={idx}
                  href={`mailto:${email}?subject=Consulta sobre sorteo: ${raffleTitle}`}
                  className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/30 rounded-lg px-4 py-2.5 transition-all group"
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

        {/* Social Links */}
        {hasSocials && (
          <div>
            <p className={cn("text-xs uppercase tracking-wider mb-3", colors.textSubtle)}>Redes Sociales</p>
            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center border transition-all",
                    isLightTemplate 
                      ? "bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                      : "bg-white/[0.05] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1]"
                  )}
                  title={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}