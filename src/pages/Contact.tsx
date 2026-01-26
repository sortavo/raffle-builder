import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { PremiumHero } from '@/components/layout/PremiumBackground';
import { toast } from 'sonner';
import { useSortavoTracking } from '@/hooks/useSortavoTracking';
import { SEOHead, StructuredData } from '@/components/seo';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  MessageCircle,
  Send,
  HelpCircle,
  CreditCard,
  Users,
  Settings,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

const contactChannels = [
  {
    icon: Mail,
    title: "Email",
    description: "Respuesta en menos de 24 horas",
    value: "soporte@sortavo.com",
    action: "mailto:soporte@sortavo.com",
    gradient: "from-emerald-600 to-teal-500"
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Chat en vivo de 9am a 6pm",
    value: "+52 55 1234 5678",
    action: "https://wa.me/5255123456789",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: Phone,
    title: "Teléfono",
    description: "Lunes a Viernes, 9am - 6pm",
    value: "+52 55 1234 5678",
    action: "tel:+525512345678",
    gradient: "from-amber-500 to-orange-500"
  },
  {
    icon: MapPin,
    title: "Oficina",
    description: "Visítanos previa cita",
    value: "Ciudad de México, CDMX",
    action: "https://maps.google.com",
    gradient: "from-purple-500 to-pink-500"
  }
];

const departments = [
  { value: "general", label: "Consulta General" },
  { value: "sales", label: "Ventas y Precios" },
  { value: "support", label: "Soporte Técnico" },
  { value: "billing", label: "Facturación" },
  { value: "partnerships", label: "Alianzas y Colaboraciones" },
];

const faqs = [
  {
    question: "¿Cómo puedo crear mi primer sorteo?",
    answer: "Es muy fácil. Regístrate gratis, completa el proceso de onboarding y en menos de 5 minutos tendrás tu primer sorteo listo para compartir."
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer: "Aceptamos tarjetas de crédito/débito (Visa, Mastercard, American Express), transferencias bancarias y PayPal para las suscripciones."
  },
  {
    question: "¿Cuánto tiempo tarda en procesarse un reembolso?",
    answer: "Los reembolsos se procesan en 5-10 días hábiles y se acreditan al método de pago original utilizado."
  },
  {
    question: "¿Puedo exportar los datos de mis participantes?",
    answer: "Sí, puedes exportar todos los datos de participantes, boletos vendidos y resultados en formato Excel o CSV desde tu dashboard."
  }
];

export default function Contact() {
  const { trackLead } = useSortavoTracking();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Track lead event
    trackLead('contact_form');
    
    toast.success('¡Mensaje enviado!', {
      description: 'Te responderemos lo antes posible.'
    });
    
    setFormData({
      name: '',
      email: '',
      department: '',
      subject: '',
      message: ''
    });
    setIsSubmitting(false);
  };

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contacto - Sortavo",
    "description": "Página de contacto de Sortavo. Contáctanos para cualquier consulta sobre sorteos profesionales.",
    "url": "https://sortavo.com/contact",
    "mainEntity": {
      "@type": "Organization",
      "name": "Sortavo",
      "email": "soporte@sortavo.com",
      "telephone": "+52 55 1234 5678",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Ciudad de México",
        "addressCountry": "MX"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+52 55 1234 5678",
        "contactType": "customer service",
        "availableLanguage": "Spanish",
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "18:00"
        }
      }
    }
  };

  return (
    <>
      <SEOHead
        title="Contacto"
        description="Contáctanos para cualquier consulta sobre Sortavo. Estamos aquí para ayudarte con tus sorteos profesionales."
        canonical="https://sortavo.com/contact"
      />
      <StructuredData data={contactSchema} />

      <div className="min-h-screen bg-ultra-dark">
        {/* Navigation */}
        <PremiumNavbar variant="solid" />

        {/* Hero Section */}
        <PremiumHero className="pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                ¿Cómo podemos
              </span>
              <br />
              <span className="text-white">ayudarte?</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Nuestro equipo está listo para responder todas tus preguntas y ayudarte a crear sorteos increíbles.
            </p>
          </div>
        </PremiumHero>

        {/* Contact Channels */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactChannels.map((channel, index) => (
                <a
                  key={index}
                  href={channel.action}
                  target={channel.action.startsWith('http') ? '_blank' : undefined}
                  rel={channel.action.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group bg-gray-900/80 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-white/10"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${channel.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <channel.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{channel.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">{channel.description}</p>
                  <p className="text-emerald-400 font-medium flex items-center gap-1">
                    {channel.value}
                    {channel.action.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-gray-900/80 rounded-3xl shadow-xl p-8 md:p-10 border border-white/10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Envíanos un mensaje</h2>
                    <p className="text-gray-400">Te responderemos en menos de 24 horas</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-300">Nombre completo</Label>
                      <Input
                        id="name"
                        placeholder="Juan Pérez"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="h-12 bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="juan@ejemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="h-12 bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-gray-300">Departamento</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger className="h-12 bg-gray-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Selecciona un departamento" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/10">
                        {departments.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value} className="text-white hover:bg-gray-800">
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-gray-300">Asunto</Label>
                    <Input
                      id="subject"
                      placeholder="¿En qué podemos ayudarte?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="h-12 bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-300">Mensaje</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe tu consulta con el mayor detalle posible..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={5}
                      className="resize-none bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Mensaje
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* FAQ & Info Side */}
              <div className="space-y-8">
                {/* Quick Links */}
                <div className="bg-gray-900/80 rounded-3xl shadow-xl p-8 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-6">Enlaces Rápidos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Link
                      to="/help"
                      className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                    >
                      <HelpCircle className="w-5 h-5 text-emerald-400" />
                      <span className="font-medium text-white">Centro de Ayuda</span>
                    </Link>
                    <Link
                      to="/pricing"
                      className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                    >
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <span className="font-medium text-white">Planes y Precios</span>
                    </Link>
                    <Link
                      to="/auth"
                      className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                    >
                      <Users className="w-5 h-5 text-purple-400" />
                      <span className="font-medium text-white">Crear Cuenta</span>
                    </Link>
                    <Link
                      to="/status"
                      className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 transition-colors border border-green-500/20"
                    >
                      <Settings className="w-5 h-5 text-green-400" />
                      <span className="font-medium text-white">Estado del Sistema</span>
                    </Link>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="bg-gray-900/80 rounded-3xl shadow-xl p-8 border border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-xl font-bold text-white">Horario de Atención</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-gray-400">Lunes - Viernes</span>
                      <span className="font-semibold text-white">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-gray-400">Sábado</span>
                      <span className="font-semibold text-white">10:00 AM - 2:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-400">Domingo</span>
                      <span className="font-semibold text-gray-500">Cerrado</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    * Horario de Ciudad de México (UTC-6)
                  </p>
                </div>

                {/* FAQ Section */}
                <div className="bg-gray-900/80 rounded-3xl shadow-xl p-8 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-6">Preguntas Frecuentes</h3>
                  <div className="space-y-4">
                    {faqs.map((faq, index) => (
                      <div
                        key={index}
                        className="border border-white/10 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
                        >
                          <span className="font-medium text-white pr-4">{faq.question}</span>
                          {expandedFaq === index ? (
                            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                        {expandedFaq === index && (
                          <div className="px-4 pb-4 text-gray-400 animate-fade-in">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/help"
                    className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Ver todas las preguntas frecuentes
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
