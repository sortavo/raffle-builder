import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Ticket, Rocket, Zap, Crown, Check, X, ArrowRight, 
  Shield, MessageCircle, Mail, Phone, HelpCircle
} from 'lucide-react';
import { STRIPE_PLANS } from '@/lib/stripe-config';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      key: 'basic' as const,
      icon: Rocket,
      badge: 'Para Empezar',
      badgeVariant: 'secondary' as const,
      popular: false,
      features: [
        { text: '2 sorteos activos simultáneos', included: true },
        { text: 'Hasta 2,000 boletos por sorteo', included: true },
        { text: '1 plantilla personalizable', included: true },
        { text: 'Panel de control básico', included: true },
        { text: 'Soporte por email (48h)', included: true },
        { text: 'Métodos de pago configurables', included: true },
        { text: 'Grid de boletos interactivo', included: true },
        { text: 'Sistema de reservación automática', included: true },
        { text: 'Aprobación manual de pagos', included: true },
        { text: 'Marca "Powered by Sortavo" visible', included: 'partial' },
      ],
      cta: 'Prueba 7 días gratis',
      ctaLink: '/auth?tab=signup&plan=basic',
    },
    {
      key: 'pro' as const,
      icon: Zap,
      badge: 'Más Popular',
      badgeVariant: 'default' as const,
      popular: true,
      features: [
        { text: '15 sorteos activos simultáneos', included: true },
        { text: 'Hasta 30,000 boletos por sorteo', included: true },
        { text: '6 plantillas profesionales', included: true },
        { text: 'Panel con analytics avanzado', included: true },
        { text: 'Sin marca Sortavo', included: true },
        { text: 'Notificaciones automáticas por email', included: true },
        { text: 'Integración con WhatsApp', included: true },
        { text: 'Exportación de datos (CSV/Excel)', included: true },
        { text: 'Soporte prioritario por WhatsApp (12h)', included: true },
        { text: 'API de sorteo de Lotería Nacional', included: true },
        { text: 'Múltiples métodos de pago', included: true },
      ],
      cta: 'Empezar ahora',
      ctaLink: '/auth?tab=signup&plan=pro',
    },
    {
      key: 'premium' as const,
      icon: Crown,
      badge: 'Empresas',
      badgeVariant: 'outline' as const,
      popular: false,
      features: [
        { text: 'Sorteos ilimitados', included: true },
        { text: 'Hasta 100,000 boletos por sorteo', included: true },
        { text: '6 plantillas + CSS personalizado', included: true },
        { text: 'Dashboard personalizado', included: true },
        { text: 'Account Manager dedicado', included: true },
        { text: 'Setup asistido incluido', included: true },
        { text: 'Soporte telefónico 24/7', included: true },
        { text: 'Entrenamiento del equipo', included: true },
        { text: 'Integraciones personalizadas', included: true },
        { text: 'Subdominios personalizados', included: true },
        { text: 'White-label completo', included: true },
      ],
      cta: 'Empezar ahora',
      ctaLink: '/auth?tab=signup&plan=premium',
    },
  ];

  const faqs = [
    {
      question: '¿Hay período de prueba?',
      answer: 'El plan Básico incluye 7 días de prueba gratuita sin compromiso. Los planes Pro y Premium no incluyen período de prueba, pero puedes cancelar en cualquier momento.',
    },
    {
      question: '¿Puedo cambiar de plan después?',
      answer: 'Absolutamente. Puedes subir o bajar de plan en cualquier momento. Los cambios se aplican inmediatamente y prorrateamos la diferencia.',
    },
    {
      question: '¿Qué pasa si supero el límite de sorteos?',
      answer: 'Te notificaremos cuando estés cerca del límite. Podrás actualizar tu plan o esperar a que algún sorteo termine para crear nuevos.',
    },
    {
      question: '¿Cobran comisión por boletos vendidos?',
      answer: 'No cobramos ninguna comisión por venta. Tú recibes el 100% del dinero de tus boletos directamente. Solo pagas la suscripción mensual o anual.',
    },
    {
      question: '¿Cómo funciona la facturación?',
      answer: 'Facturamos mensual o anualmente según tu preferencia. Aceptamos tarjetas de crédito/débito y procesamos todos los pagos de forma segura con Stripe.',
    },
    {
      question: '¿Puedo cancelar en cualquier momento?',
      answer: 'Sí, puedes cancelar cuando quieras sin penalizaciones. Tu acceso continuará hasta el final del período pagado.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="text-xl font-extrabold text-foreground">SORTAVO</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button>Crear Cuenta</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Precios Simples y Transparentes
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Elige el plan perfecto para tu negocio de sorteos
        </p>

        {/* Billing Toggle */}
        <div className="mb-12 flex items-center justify-center gap-4">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Mensual
          </span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Anual
          </span>
          {isAnnual && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              Ahorra 16%
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const planData = STRIPE_PLANS[plan.key];
            const price = isAnnual ? planData.annualPrice : planData.monthlyPrice;
            const Icon = plan.icon;

            return (
              <Card 
                key={plan.key} 
                className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg sm:scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  {!plan.popular && (
                    <Badge variant={plan.badgeVariant} className="mx-auto mb-2 w-fit">
                      {plan.badge}
                    </Badge>
                  )}
                  <CardTitle className="text-2xl">{planData.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold text-foreground">
                      ${price.toLocaleString()} <span className="text-lg font-medium text-muted-foreground">USD</span>
                    </span>
                    <span className="text-muted-foreground">
                      /{isAnnual ? 'año' : 'mes'}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground">
                      ${Math.round(price / 12).toLocaleString()} USD/mes facturado anualmente
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        {feature.included === true ? (
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        ) : feature.included === 'partial' ? (
                          <X className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${feature.included === 'partial' ? 'text-muted-foreground' : ''}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    <Link to={plan.ctaLink}>
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="border-t bg-card py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            Comparación de Planes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b">
                  <th className="py-4 text-left font-medium text-muted-foreground">Característica</th>
                  <th className="py-4 text-center font-medium">Básico</th>
                  <th className="py-4 text-center font-medium">Pro</th>
                  <th className="py-4 text-center font-medium">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 text-muted-foreground">Sorteos activos</td>
                  <td className="py-3 text-center">2</td>
                  <td className="py-3 text-center">15</td>
                  <td className="py-3 text-center">Ilimitados</td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">Boletos por sorteo</td>
                  <td className="py-3 text-center">2,000</td>
                  <td className="py-3 text-center">30,000</td>
                  <td className="py-3 text-center">100,000</td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">Plantillas</td>
                  <td className="py-3 text-center">1</td>
                  <td className="py-3 text-center">6</td>
                  <td className="py-3 text-center">6 + CSS</td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">Sin marca Sortavo</td>
                  <td className="py-3 text-center"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">Analytics avanzado</td>
                  <td className="py-3 text-center"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">Lotería Nacional</td>
                  <td className="py-3 text-center"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">Soporte WhatsApp</td>
                  <td className="py-3 text-center"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground">Account Manager</td>
                  <td className="py-3 text-center"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                  <td className="py-3 text-center"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 mx-auto text-green-500" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
          Preguntas Frecuentes
        </h2>
        <Accordion type="single" collapsible className="max-w-2xl mx-auto">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger className="text-left">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Trust Indicators */}
      <section className="border-t bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <p className="font-medium text-foreground">100% Seguro</p>
              <p className="text-sm text-muted-foreground">Pagos con Stripe</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <p className="font-medium text-foreground">Soporte en Español</p>
              <p className="text-sm text-muted-foreground">Atención personalizada</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Check className="h-8 w-8 text-primary" />
              <p className="font-medium text-foreground">Sin Comisiones</p>
              <p className="text-sm text-muted-foreground">Recibe el 100%</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <X className="h-8 w-8 text-primary" />
              <p className="font-medium text-foreground">Cancela Cuando Quieras</p>
              <p className="text-sm text-muted-foreground">Sin penalizaciones</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground">
          ¿Tienes dudas? Contáctanos
        </h2>
        <p className="mb-8 text-muted-foreground">
          Estamos aquí para ayudarte a elegir el plan perfecto
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="mailto:hola@sortavo.com">
              <Mail className="mr-2 h-4 w-4" />
              hola@sortavo.com
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://wa.me/5215512345678" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="tel:+5215512345678">
              <Phone className="mr-2 h-4 w-4" />
              Llamar
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <span className="font-bold text-foreground">SORTAVO</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Sortavo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
