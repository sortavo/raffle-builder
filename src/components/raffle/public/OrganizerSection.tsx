import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  MapPin, 
  ExternalLink, 
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
  };
  raffleTitle: string;
  brandColor: string;
}

export function OrganizerSection({ organization, raffleTitle, brandColor }: OrganizerSectionProps) {
  const socialLinks = [
    { url: organization.facebook_url, icon: FaFacebook, label: "Facebook", color: "#1877F2" },
    { url: organization.instagram_url, icon: FaInstagram, label: "Instagram", color: "#E4405F" },
    { url: organization.tiktok_url, icon: FaTiktok, label: "TikTok", color: "#000000" },
    { url: organization.website_url, icon: FaGlobe, label: "Sitio Web", color: "#6B7280" },
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

  // WhatsApp link with pre-filled message
  const whatsappMessage = `¡Hola! Vi su sorteo "${raffleTitle}" y tengo una pregunta.`;
  const whatsappLink = organization.whatsapp_number 
    ? `https://wa.me/${organization.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="py-16 bg-gradient-to-br from-gray-50 to-white"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Sobre el Organizador</h2>
          <p className="text-gray-600">Conoce a quien está detrás de este sorteo</p>
        </div>

        <Card className="overflow-hidden border-0 shadow-xl">
          <CardContent className="p-0">
            {/* Header with brand color */}
            <div 
              className="h-24 sm:h-32 relative"
              style={{ 
                background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` 
              }}
            >
              {/* Pattern overlay */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '20px 20px'
                }}
              />
            </div>

            {/* Content */}
            <div className="px-6 pb-6 -mt-12 sm:-mt-16 relative">
              {/* Avatar */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-6">
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-lg">
                  <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                  <AvatarFallback 
                    className="text-2xl sm:text-3xl font-bold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {organization.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center sm:text-left flex-1 sm:pb-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {organization.name}
                    </h3>
                    {organization.verified && (
                      <Badge className="bg-blue-500 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verificado
                      </Badge>
                    )}
                  </div>
                  {organization.city && (
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{organization.city}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                {timeOnPlatform && (
                  <div className="hidden sm:block text-center px-4 py-2 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-500">En la plataforma</p>
                    <p className="font-semibold text-gray-900">{timeOnPlatform}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {organization.description && (
                <p className="text-gray-600 mb-6 text-center sm:text-left">
                  {organization.description}
                </p>
              )}

              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-6">
                  {socialLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                      title={link.label}
                    >
                      <link.icon className="w-5 h-5" style={{ color: link.color }} />
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
                    className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg"
                  >
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Contactar por WhatsApp
                    </a>
                  </Button>
                )}
                
                {organization.slug && (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="flex-1 border-2"
                    style={{ borderColor: brandColor, color: brandColor }}
                  >
                    <Link to={`/${organization.slug}`}>
                      Ver todos los sorteos
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.section>
  );
}