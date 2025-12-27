import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Trophy, Rocket, Zap, Crown, Check, X, ArrowRight, 
  Shield, MessageCircle, Mail, Phone, HelpCircle, Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { STRIPE_PLANS } from '@/lib/stripe-config';
import { Footer } from '@/components/layout/Footer';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const plans = [
    {
      key: 'basic' as const,
      icon: Rocket,
      badge: 'Para Empezar',
      badgeVariant: 'secondary' as const,
      popular: false,
      gradient: 'from-primary to-primary/80',
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
      gradient: 'from-primary to-accent',
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
      gradient: 'from-secondary to-warning',
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

            {/* Desktop Nav */}
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

            {/* Mobile Menu */}
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

      {/* Hero Section */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-40 -right-20 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            Sin comisiones por venta
          </Badge>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              Precios Simples
            </span>
            <br />
            <span className="text-foreground">y Transparentes</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
            Elige el plan perfecto para tu negocio de sorteos. Sin sorpresas, sin costos ocultos.
          </p>

          {/* Billing Toggle */}
          <div className="mb-12 flex items-center justify-center gap-4 bg-card/60 backdrop-blur-sm rounded-full px-6 py-3 w-fit mx-auto shadow-lg shadow-primary/10 border border-border">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
              Mensual
            </span>
            <Switch 
              checked={isAnnual} 
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
              Anual
            </span>
            {isAnnual && (
              <Badge className="bg-gradient-to-r from-success to-success/80 text-success-foreground border-0">
                Ahorra 16%
              </Badge>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const planData = STRIPE_PLANS[plan.key];
              const price = isAnnual ? planData.annualPrice : planData.monthlyPrice;
              const Icon = plan.icon;

              return (
                <Card 
                  key={plan.key} 
                  className={`relative flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                    plan.popular 
                      ? 'border-2 border-primary shadow-xl shadow-primary/20 scale-105 z-10' 
                      : 'border-border hover:border-primary/30 hover:shadow-primary/10'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1 shadow-lg">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.gradient} shadow-lg`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    {!plan.popular && (
                      <Badge variant={plan.badgeVariant} className="mx-auto mb-2 w-fit">
                        {plan.badge}
                      </Badge>
                    )}
                    <CardTitle className="text-2xl">{planData.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-5xl font-extrabold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        ${price.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        USD/{isAnnual ? 'año' : 'mes'}
                      </span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${Math.round(price / 12).toLocaleString()} USD/mes
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          {feature.included === true ? (
                            <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${feature.included === 'partial' ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      asChild 
                      className={`w-full transition-all duration-300 ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25' 
                          : 'bg-foreground hover:bg-foreground/90'
                      }`}
                    >
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
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-3xl font-bold">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Comparación de Planes
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto bg-card rounded-2xl shadow-xl shadow-primary/5 overflow-hidden">
              <thead className="bg-gradient-to-r from-primary/10 to-accent/10">
                <tr>
                  <th className="py-4 px-6 text-left font-medium text-muted-foreground">Característica</th>
                  <th className="py-4 px-6 text-center font-medium text-foreground">Básico</th>
                  <th className="py-4 px-6 text-center font-medium text-primary bg-primary/10">Pro</th>
                  <th className="py-4 px-6 text-center font-medium text-foreground">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Sorteos activos', '2', '15', 'Ilimitados'],
                  ['Boletos por sorteo', '2,000', '30,000', '100,000'],
                  ['Plantillas', '1', '6', '6 + CSS'],
                  ['Sin marca Sortavo', false, true, true],
                  ['Analytics avanzado', false, true, true],
                  ['Lotería Nacional', false, true, true],
                  ['Soporte WhatsApp', false, true, true],
                  ['Account Manager', false, false, true],
                ].map(([feature, basic, pro, premium], idx) => (
                  <tr key={idx} className="hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-6 text-muted-foreground">{feature}</td>
                    <td className="py-4 px-6 text-center">
                      {typeof basic === 'boolean' ? (
                        basic ? <Check className="h-5 w-5 mx-auto text-success" /> : <X className="h-5 w-5 mx-auto text-muted-foreground/50" />
                      ) : basic}
                    </td>
                    <td className="py-4 px-6 text-center bg-primary/5">
                      {typeof pro === 'boolean' ? (
                        pro ? <Check className="h-5 w-5 mx-auto text-success" /> : <X className="h-5 w-5 mx-auto text-muted-foreground/50" />
                      ) : <span className="font-medium text-primary">{pro}</span>}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {typeof premium === 'boolean' ? (
                        premium ? <Check className="h-5 w-5 mx-auto text-success" /> : <X className="h-5 w-5 mx-auto text-muted-foreground/50" />
                      ) : premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Shield, title: 'Pago Seguro', desc: 'Transacciones encriptadas con Stripe' },
              { icon: MessageCircle, title: 'Soporte Humano', desc: 'Equipo real que responde en menos de 24h' },
              { icon: HelpCircle, title: 'Sin Letra Pequeña', desc: 'Precios claros, sin costos ocultos' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <item.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Preguntas Frecuentes
            </span>
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`}
                className="bg-card border border-border rounded-xl px-6 hover:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.3),rgba(255,255,255,0))]"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-primary-foreground/90 text-lg mb-8 max-w-2xl mx-auto">
            Únete a miles de organizadores que ya confían en Sortavo para sus sorteos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?tab=signup">
              <Button 
                size="lg"
                className="bg-background text-primary hover:bg-background/90 shadow-xl"
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button 
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Mail className="mr-2 h-5 w-5" />
                Contactar ventas
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
