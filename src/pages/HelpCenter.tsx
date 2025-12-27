import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Book, MessageCircle, FileText, ChevronRight, ExternalLink, Mail, Phone, Trophy, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { successToast, errorToast } from '@/lib/toast-helpers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Footer } from '@/components/layout/Footer';

const faqCategories = [
  {
    id: 'getting-started',
    title: 'Primeros Pasos',
    icon: Book,
    questions: [
      {
        q: '¿Cómo creo mi primer sorteo?',
        a: 'Para crear tu primer sorteo, ve al Dashboard y haz clic en "Crear Sorteo". Sigue el asistente paso a paso donde podrás configurar el premio, cantidad de boletos, precio y fecha del sorteo.'
      },
      {
        q: '¿Cuánto tiempo toma configurar un sorteo?',
        a: 'Configurar un sorteo completo toma aproximadamente 5-10 minutos. Nuestro asistente te guía en cada paso para asegurar que no olvides ningún detalle importante.'
      },
      {
        q: '¿Necesito verificar mi cuenta?',
        a: 'Sí, para proteger a tus compradores, requerimos verificación de identidad antes de publicar sorteos. Este proceso es rápido y solo se hace una vez.'
      },
      {
        q: '¿Puedo tener múltiples sorteos activos?',
        a: 'Sí, dependiendo de tu plan de suscripción. El plan Básico permite 2 sorteos activos, Pro permite 10, y Premium ofrece sorteos ilimitados.'
      }
    ]
  },
  {
    id: 'payments',
    title: 'Pagos y Facturación',
    icon: FileText,
    questions: [
      {
        q: '¿Qué métodos de pago aceptan?',
        a: 'Aceptamos transferencias bancarias, Nequi, Daviplata, y pagos con tarjeta a través de Stripe. Los compradores pueden elegir el método más conveniente.'
      },
      {
        q: '¿Cómo recibo el dinero de mis ventas?',
        a: 'Las ventas se acumulan en tu cuenta y puedes solicitar retiros cuando alcances el mínimo. Los retiros se procesan en 1-3 días hábiles.'
      },
      {
        q: '¿Hay comisiones por transacción?',
        a: 'Cobramos una pequeña comisión por cada boleto vendido que varía según tu plan. Plan Básico: 5%, Pro: 3%, Premium: 1%.'
      },
      {
        q: '¿Puedo ofrecer descuentos a mis compradores?',
        a: 'Sí, puedes crear cupones de descuento desde la sección Marketing. Puedes configurar porcentajes, montos fijos, fechas de validez y límites de uso.'
      }
    ]
  },
  {
    id: 'draws',
    title: 'Sorteos y Ganadores',
    icon: MessageCircle,
    questions: [
      {
        q: '¿Cómo se selecciona al ganador?',
        a: 'Ofrecemos tres métodos: sorteo aleatorio certificado con Random.org, vinculación a Lotería Nacional, o selección manual con registro de video.'
      },
      {
        q: '¿El sorteo es transparente?',
        a: 'Absolutamente. Todos los sorteos quedan registrados con prueba criptográfica. Los participantes pueden verificar que el proceso fue justo.'
      },
      {
        q: '¿Qué pasa si el ganador no reclama el premio?',
        a: 'Tienes la opción de establecer un tiempo límite para reclamar. Si no se reclama, puedes hacer un nuevo sorteo entre los demás participantes.'
      },
      {
        q: '¿Puedo programar el sorteo para una fecha específica?',
        a: 'Sí, al crear el sorteo defines la fecha y hora exacta. El sistema puede realizar el sorteo automáticamente o puedes hacerlo manualmente en vivo.'
      }
    ]
  },
  {
    id: 'technical',
    title: 'Soporte Técnico',
    icon: FileText,
    questions: [
      {
        q: '¿Por qué no puedo ver mi sorteo público?',
        a: 'Asegúrate de que el sorteo esté en estado "Activo" y no "Borrador". También verifica que la fecha de inicio haya pasado.'
      },
      {
        q: '¿Cómo comparto mi sorteo en redes sociales?',
        a: 'Cada sorteo tiene un enlace único que puedes compartir. También ofrecemos botones de compartir directamente a WhatsApp, Facebook, Twitter e Instagram.'
      },
      {
        q: '¿Puedo personalizar el diseño de mi página de sorteo?',
        a: 'Sí, en el paso de diseño del asistente puedes elegir colores, subir imágenes del premio, y personalizar el texto de tu página.'
      },
      {
        q: '¿La plataforma funciona en dispositivos móviles?',
        a: 'Sí, tanto el panel de administración como las páginas de compra están optimizadas para móviles. Tus compradores pueden participar desde cualquier dispositivo.'
      }
    ]
  }
];

const guides = [
  {
    title: 'Guía Completa para Crear Sorteos Exitosos',
    description: 'Aprende paso a paso cómo configurar, promocionar y ejecutar sorteos que generen ventas.',
    category: 'Guía',
    readTime: '15 min',
    href: '#'
  },
  {
    title: 'Mejores Prácticas de Marketing para Sorteos',
    description: 'Estrategias probadas para maximizar la visibilidad y ventas de tus sorteos.',
    category: 'Marketing',
    readTime: '10 min',
    href: '#'
  },
  {
    title: 'Cómo Usar Cupones de Descuento',
    description: 'Tutorial completo sobre creación y gestión de códigos promocionales.',
    category: 'Tutorial',
    readTime: '5 min',
    href: '#'
  },
  {
    title: 'Configuración del Programa de Referidos',
    description: 'Aprende a activar y gestionar tu programa de referidos para crecer orgánicamente.',
    category: 'Tutorial',
    readTime: '8 min',
    href: '#'
  }
];

const contactSchema = z.object({
  subject: z.string().min(5, 'El asunto debe tener al menos 5 caracteres'),
  message: z.string().min(20, 'El mensaje debe tener al menos 20 caracteres'),
  priority: z.enum(['low', 'medium', 'high'])
});

type ContactForm = z.infer<typeof contactSchema>;

export default function HelpCenter() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: '',
      message: '',
      priority: 'medium'
    }
  });

  const filteredFaqs = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const onSubmitContact = async (data: ContactForm) => {
    setIsSubmitting(true);
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: 'soporte@tudominio.com',
          template: 'support_request',
          data: {
            user_email: user?.email,
            subject: data.subject,
            message: data.message,
            priority: data.priority
          }
        }
      });
      
      successToast('Mensaje enviado. Te responderemos pronto.');
      form.reset();
    } catch (error) {
      errorToast('Error al enviar mensaje');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navLinks = [
    { label: 'Características', href: '/#features' },
    { label: 'Precios', href: '/pricing' },
    { label: 'Ayuda', href: '/help' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Premium Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SORTAVO
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.label}
                  to={link.href} 
                  className="text-muted-foreground hover:text-primary font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="text-foreground hover:text-primary hover:bg-primary/10">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25">
                  Crear Cuenta
                </Button>
              </Link>
            </div>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex flex-col gap-6 mt-8">
                  {navLinks.map((link) => (
                    <Link 
                      key={link.label}
                      to={link.href} 
                      className="text-lg font-medium text-foreground hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <hr className="border-border" />
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Iniciar Sesión</Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-primary to-accent">
                      Crear Cuenta
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-40 -right-20 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            Estamos para ayudarte
          </Badge>
          <h1 className="text-4xl font-bold mb-4 md:text-5xl">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              Centro de Ayuda
            </span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Encuentra respuestas a tus preguntas, guías detalladas y soporte personalizado
          </p>
          
          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
            <Input
              placeholder="Buscar en preguntas frecuentes..."
              className="pl-12 h-14 text-lg bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-primary shadow-xl shadow-primary/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Book, title: 'Documentación', desc: 'Guías y tutoriales', gradient: 'from-primary to-accent' },
            { icon: MessageCircle, title: 'Soporte', desc: 'Contactar al equipo', gradient: 'from-secondary to-secondary/80' },
            { icon: FileText, title: 'Estado del Sistema', desc: 'Todo operativo', gradient: 'from-success to-success/80', status: true },
          ].map((item, idx) => (
            <Card key={idx} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-card/80 backdrop-blur-sm border-border shadow-lg">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                {item.status ? (
                  <Badge className="ml-auto bg-success/10 text-success border-success/20">
                    Online
                  </Badge>
                ) : (
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="faq" className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-card/60 backdrop-blur-sm p-1 rounded-xl shadow-lg">
            <TabsTrigger value="faq" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground rounded-lg">
              Preguntas
            </TabsTrigger>
            <TabsTrigger value="guides" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground rounded-lg">
              Guías
            </TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground rounded-lg">
              Contacto
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-8">
            {(searchQuery ? filteredFaqs : faqCategories).map((category) => (
              <Card key={category.id} className="bg-card/80 backdrop-blur-sm border-border shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <category.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {category.title}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full space-y-2">
                    {category.questions.map((faq, index) => (
                      <AccordionItem 
                        key={index} 
                        value={`${category.id}-${index}`}
                        className="border border-border rounded-xl px-4 hover:border-primary/20 transition-colors"
                      >
                        <AccordionTrigger className="text-left hover:no-underline py-4 text-foreground">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-4">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}

            {searchQuery && filteredFaqs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Sin resultados</h3>
                <p className="text-muted-foreground">
                  No encontramos preguntas que coincidan con "{searchQuery}"
                </p>
              </div>
            )}
          </TabsContent>

          {/* Guides Tab */}
          <TabsContent value="guides">
            <div className="grid md:grid-cols-2 gap-6">
              {guides.map((guide, index) => (
                <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm border-border">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{guide.category}</Badge>
                      <span className="text-sm text-muted-foreground">{guide.readTime}</span>
                    </div>
                    <CardTitle className="text-lg text-foreground">{guide.title}</CardTitle>
                    <CardDescription>{guide.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full group hover:border-primary hover:text-primary">
                      Leer guía
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Form */}
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-xl">
                <CardHeader>
                  <CardTitle className="text-foreground">Envíanos un mensaje</CardTitle>
                  <CardDescription>
                    Nuestro equipo te responderá en menos de 24 horas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitContact)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asunto</FormLabel>
                            <FormControl>
                              <Input placeholder="¿En qué podemos ayudarte?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mensaje</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe tu consulta con detalle..."
                                rows={5}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridad</FormLabel>
                            <div className="flex gap-2">
                              {['low', 'medium', 'high'].map((priority) => (
                                <Button
                                  key={priority}
                                  type="button"
                                  variant={field.value === priority ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => field.onChange(priority)}
                                  className={field.value === priority ? 'bg-primary' : ''}
                                >
                                  {priority === 'low' ? 'Baja' : priority === 'medium' ? 'Media' : 'Alta'}
                                </Button>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <LoadingButton 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                        isLoading={isSubmitting}
                      >
                        Enviar mensaje
                      </LoadingButton>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <div className="space-y-6">
                <Card className="bg-card/80 backdrop-blur-sm border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Mail className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Email</h3>
                        <p className="text-muted-foreground">soporte@sortavo.com</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success to-success/80 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-success-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">WhatsApp</h3>
                        <p className="text-muted-foreground">+52 55 1234 5678</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
                        <Phone className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Teléfono</h3>
                        <p className="text-muted-foreground">Lunes a Viernes, 9am - 6pm</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
