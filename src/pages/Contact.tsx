import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
import { toast } from 'sonner';
import { 
  Trophy, 
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
    gradient: "from-accent to-accent/80"
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Chat en vivo de 9am a 6pm",
    value: "+52 55 1234 5678",
    action: "https://wa.me/5255123456789",
    gradient: "from-success to-success/80"
  },
  {
    icon: Phone,
    title: "Teléfono",
    description: "Lunes a Viernes, 9am - 6pm",
    value: "+52 55 1234 5678",
    action: "tel:+525512345678",
    gradient: "from-primary to-primary/80"
  },
  {
    icon: MapPin,
    title: "Oficina",
    description: "Visítanos previa cita",
    value: "Ciudad de México, CDMX",
    action: "https://maps.google.com",
    gradient: "from-warning to-warning/80"
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

  return (
    <>
      <Helmet>
        <title>Contacto | Sortavo</title>
        <meta name="description" content="Contáctanos para cualquier consulta sobre Sortavo. Estamos aquí para ayudarte con tus sorteos." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
        {/* Navigation */}
        <nav className="bg-background/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SORTAVO
              </span>
            </Link>
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Volver al inicio</span>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.3),rgba(255,255,255,0))]"></div>
          <div className="relative max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ¿Cómo podemos
              </span>
              <br />
              <span className="text-foreground">ayudarte?</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Nuestro equipo está listo para responder todas tus preguntas y ayudarte a crear sorteos increíbles.
            </p>
          </div>
        </section>

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
                  className="group bg-card rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-border"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${channel.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <channel.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{channel.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{channel.description}</p>
                  <p className="text-primary font-medium flex items-center gap-1">
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
              <div className="bg-card rounded-3xl shadow-xl p-8 md:p-10 border border-border">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Send className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Envíanos un mensaje</h2>
                    <p className="text-muted-foreground">Te responderemos en menos de 24 horas</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input
                        id="name"
                        placeholder="Juan Pérez"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="juan@ejemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecciona un departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Asunto</Label>
                    <Input
                      id="subject"
                      placeholder="¿En qué podemos ayudarte?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe tu consulta con el mayor detalle posible..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={5}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent mr-2" />
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
                <div className="bg-card rounded-3xl shadow-xl p-8 border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-6">Enlaces Rápidos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Link
                      to="/help"
                      className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <HelpCircle className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">Centro de Ayuda</span>
                    </Link>
                    <Link
                      to="/pricing"
                      className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 hover:bg-accent/20 transition-colors"
                    >
                      <CreditCard className="w-5 h-5 text-accent" />
                      <span className="font-medium text-foreground">Planes y Precios</span>
                    </Link>
                    <Link
                      to="/auth"
                      className="flex items-center gap-3 p-4 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition-colors"
                    >
                      <Users className="w-5 h-5 text-secondary" />
                      <span className="font-medium text-foreground">Crear Cuenta</span>
                    </Link>
                    <Link
                      to="/status"
                      className="flex items-center gap-3 p-4 rounded-xl bg-success/10 hover:bg-success/20 transition-colors"
                    >
                      <Settings className="w-5 h-5 text-success" />
                      <span className="font-medium text-foreground">Estado del Sistema</span>
                    </Link>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="bg-card rounded-3xl shadow-xl p-8 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-bold text-foreground">Horario de Atención</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-muted-foreground">Lunes - Viernes</span>
                      <span className="font-semibold text-foreground">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-muted-foreground">Sábado</span>
                      <span className="font-semibold text-foreground">10:00 AM - 2:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-muted-foreground">Domingo</span>
                      <span className="font-semibold text-muted-foreground">Cerrado</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    * Horario de Ciudad de México (UTC-6)
                  </p>
                </div>

                {/* FAQ Section */}
                <div className="bg-card rounded-3xl shadow-xl p-8 border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-6">Preguntas Frecuentes</h3>
                  <div className="space-y-4">
                    {faqs.map((faq, index) => (
                      <div
                        key={index}
                        className="border border-border rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-foreground pr-4">{faq.question}</span>
                          {expandedFaq === index ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>
                        {expandedFaq === index && (
                          <div className="px-4 pb-4 text-muted-foreground animate-fade-in">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/help"
                    className="inline-flex items-center gap-2 mt-6 text-primary hover:text-primary/80 font-medium"
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
