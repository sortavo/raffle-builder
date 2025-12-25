import { useState } from 'react';
import { Search, Book, MessageCircle, FileText, ChevronRight, ExternalLink, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { successToast, errorToast } from '@/lib/toast-helpers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

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
      // In production, this would send to a support system
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Centro de Ayuda</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Encuentra respuestas a tus preguntas, guías detalladas y soporte personalizado
          </p>
          
          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar en preguntas frecuentes..."
              className="pl-12 h-12 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="container mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Book className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Documentación</h3>
                <p className="text-sm text-muted-foreground">Guías y tutoriales</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Soporte</h3>
                <p className="text-sm text-muted-foreground">Contactar al equipo</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Estado del Sistema</h3>
                <p className="text-sm text-muted-foreground">Todo operativo</p>
              </div>
              <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">
                Online
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="faq" className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="faq">Preguntas</TabsTrigger>
            <TabsTrigger value="guides">Guías</TabsTrigger>
            <TabsTrigger value="contact">Contacto</TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-8">
            {(searchQuery ? filteredFaqs : faqCategories).map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="w-5 h-5 text-primary" />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`${category.id}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
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
                <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin resultados</h3>
                <p className="text-muted-foreground">
                  No encontramos preguntas que coincidan con "{searchQuery}"
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
                  Limpiar búsqueda
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Guides Tab */}
          <TabsContent value="guides">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {guides.map((guide, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{guide.category}</Badge>
                      <span className="text-sm text-muted-foreground">{guide.readTime}</span>
                    </div>
                    <CardTitle className="text-lg">{guide.title}</CardTitle>
                    <CardDescription>{guide.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={guide.href}>
                        Leer guía
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Mensaje</CardTitle>
                    <CardDescription>
                      Describe tu problema o pregunta y te responderemos lo antes posible
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitContact)} className="space-y-6">
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
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prioridad</FormLabel>
                              <div className="flex gap-2">
                                {[
                                  { value: 'low', label: 'Baja' },
                                  { value: 'medium', label: 'Media' },
                                  { value: 'high', label: 'Alta' }
                                ].map((option) => (
                                  <Button
                                    key={option.value}
                                    type="button"
                                    variant={field.value === option.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => field.onChange(option.value)}
                                  >
                                    {option.label}
                                  </Button>
                                ))}
                              </div>
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
                                  placeholder="Describe tu problema con el mayor detalle posible..."
                                  className="min-h-[150px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <LoadingButton
                          type="submit"
                          isLoading={isSubmitting}
                          loadingText="Enviando..."
                          className="w-full"
                        >
                          Enviar Mensaje
                        </LoadingButton>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información de Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">soporte@rifas.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">WhatsApp</p>
                        <p className="font-medium">+57 300 123 4567</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Horario de Atención</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lunes - Viernes</span>
                      <span>8:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sábados</span>
                      <span>9:00 AM - 1:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Domingos</span>
                      <span className="text-muted-foreground">Cerrado</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-sm">
                      <strong>Tiempo de respuesta promedio:</strong>
                      <br />
                      <span className="text-2xl font-bold text-primary">2 horas</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer CTA */}
      <div className="bg-muted/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">¿No encontraste lo que buscabas?</h2>
          <p className="text-muted-foreground mb-6">
            Nuestro equipo está listo para ayudarte con cualquier pregunta
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link to="/dashboard">Ir al Dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://wa.me/573001234567" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
