import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Book, MessageCircle, FileText, ChevronRight, ExternalLink, Mail, Phone } from 'lucide-react';
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
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { PremiumHero } from '@/components/layout/PremiumBackground';
import { SEOHead, StructuredData, createFAQSchema } from '@/components/seo';

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

  // Collect all FAQs for schema
  const allFaqs = faqCategories.flatMap(cat => 
    cat.questions.map(q => ({ question: q.q, answer: q.a }))
  );

  return (
    <>
      <SEOHead
        title="Centro de Ayuda"
        description="Encuentra respuestas a tus preguntas sobre Sortavo. Guías, tutoriales y soporte para crear sorteos exitosos."
        canonical="https://sortavo.com/help"
        keywords="ayuda sortavo, preguntas frecuentes sorteos, soporte rifas, tutorial sorteos online"
      />
      <StructuredData data={createFAQSchema(allFaqs)} />
      
      <div className="min-h-screen bg-ultra-dark">
        {/* Premium Navigation */}
        <PremiumNavbar variant="solid" />

      {/* Hero Header */}
      <PremiumHero className="pt-28 pb-16 lg:pt-36 lg:pb-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
            Estamos para ayudarte
          </Badge>
          <h1 className="text-4xl font-bold mb-4 md:text-5xl">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
              Centro de Ayuda
            </span>
          </h1>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Encuentra respuestas a tus preguntas, guías detalladas y soporte personalizado
          </p>
          
          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/60" />
            <Input
              placeholder="Buscar en preguntas frecuentes..."
              className="pl-12 h-14 text-lg bg-gray-900/80 backdrop-blur-sm border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 shadow-xl shadow-emerald-600/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </PremiumHero>

      {/* Quick Links */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Book, title: 'Documentación', desc: 'Guías y tutoriales', gradient: 'from-emerald-600 to-teal-500' },
            { icon: MessageCircle, title: 'Soporte', desc: 'Contactar al equipo', gradient: 'from-amber-500 to-orange-500' },
            { icon: FileText, title: 'Estado del Sistema', desc: 'Todo operativo', gradient: 'from-emerald-500 to-green-500', status: true },
          ].map((item, idx) => (
            <Card key={idx} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gray-900/80 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
                {item.status ? (
                  <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Online
                  </Badge>
                ) : (
                  <ChevronRight className="w-5 h-5 ml-auto text-gray-500" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="faq" className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-gray-900/60 backdrop-blur-sm p-1 rounded-xl shadow-lg border border-white/10">
            <TabsTrigger value="faq" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg text-gray-400">
              Preguntas
            </TabsTrigger>
            <TabsTrigger value="guides" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg text-gray-400">
              Guías
            </TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg text-gray-400">
              Contacto
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-8">
            {(searchQuery ? filteredFaqs : faqCategories).map((category) => (
              <Card key={category.id} className="bg-gray-900/80 backdrop-blur-sm border-white/10 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
                      <category.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                      {category.title}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((item, idx) => (
                      <AccordionItem 
                        key={idx} 
                        value={`${category.id}-${idx}`}
                        className="border border-white/10 rounded-xl px-4 bg-gray-800/30"
                      >
                        <AccordionTrigger className="text-left hover:no-underline text-gray-200 hover:text-emerald-400">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-400">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Guides Tab */}
          <TabsContent value="guides">
            <div className="grid md:grid-cols-2 gap-6">
              {guides.map((guide, idx) => (
                <Card key={idx} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gray-900/80 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        {guide.category}
                      </Badge>
                      <span className="text-sm text-gray-500">{guide.readTime}</span>
                    </div>
                    <CardTitle className="text-white hover:text-emerald-400 transition-colors">
                      <a href={guide.href} className="flex items-center gap-2">
                        {guide.title}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </CardTitle>
                    <CardDescription className="text-gray-400">{guide.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Info */}
              <Card className="bg-gray-900/80 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Información de Contacto
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Estamos aquí para ayudarte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Email</p>
                      <a href="mailto:soporte@sortavo.com" className="text-emerald-400 hover:text-emerald-300">
                        soporte@sortavo.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">WhatsApp</p>
                      <a href="https://wa.me/525512345678" className="text-emerald-400 hover:text-emerald-300">
                        +52 55 1234 5678
                      </a>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400">
                      <strong className="text-white">Horario de atención:</strong><br />
                      Lunes a Viernes: 9:00 AM - 6:00 PM (CDMX)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Form */}
              <Card className="bg-gray-900/80 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Envíanos un mensaje
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Responderemos en menos de 24 horas
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
                            <FormLabel className="text-gray-300">Asunto</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="¿En qué podemos ayudarte?" 
                                {...field} 
                                className="bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Mensaje</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe tu consulta..." 
                                rows={4}
                                {...field} 
                                className="bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 resize-none"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <LoadingButton 
                        type="submit" 
                        isLoading={isSubmitting}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white"
                      >
                        Enviar Mensaje
                      </LoadingButton>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
      </div>
    </>
  );
}
