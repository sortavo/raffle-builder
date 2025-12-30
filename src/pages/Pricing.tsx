import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { scrollToSection } from '@/lib/scroll-utils';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Trophy, Rocket, Zap, Crown, Check, X, ArrowRight, 
  Mail, Menu, Building2, Sparkles
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { STRIPE_PLANS } from '@/lib/stripe-config';
import { Footer } from '@/components/layout/Footer';
import { PricingCard, PricingToggle, SocialProofSection, TrustBadges } from '@/components/pricing';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const plans = [
    {
      key: 'basic' as const,
      icon: Rocket,
      badge: 'Para Empezar',
      idealFor: 'Ideal para organizadores casuales',
      features: [
        { text: '2 sorteos activos simultáneos', included: true },
        { text: 'Hasta 2,000 boletos por sorteo', included: true },
        { text: '1 plantilla personalizable', included: true },
        { text: 'Panel de control básico', included: true },
        { text: 'Soporte por email (48h)', included: true },
        { text: 'Grid de boletos interactivo', included: true },
        { text: 'Sistema de reservación automática', included: true },
      ],
      cta: 'Prueba 7 días gratis',
      ctaLink: '/auth?tab=signup&plan=basic',
    },
    {
      key: 'pro' as const,
      icon: Zap,
      badge: 'Más Popular',
      idealFor: 'Para organizadores profesionales',
      popular: true,
      features: [
        { text: '7 sorteos activos simultáneos', included: true, highlight: true },
        { text: 'Hasta 30,000 boletos por sorteo', included: true, highlight: true },
        { text: '6 plantillas profesionales', included: true },
        { text: 'Analytics avanzado', included: true },
        { text: 'Sin marca Sortavo', included: true },
        { text: 'Integración WhatsApp', included: true },
        { text: 'API Lotería Nacional', included: true },
      ],
      cta: 'Empezar ahora',
      ctaLink: '/auth?tab=signup&plan=pro',
    },
    {
      key: 'premium' as const,
      icon: Crown,
      badge: 'Empresas',
      idealFor: 'Para equipos y empresas',
      features: [
        { text: '15 sorteos activos simultáneos', included: true, highlight: true },
        { text: 'Hasta 100,000 boletos', included: true, highlight: true },
        { text: '6 plantillas + CSS personalizado', included: true },
        { text: 'Account Manager dedicado', included: true },
        { text: 'Bot de Telegram bidireccional', included: true },
        { text: 'Setup asistido incluido', included: true },
        { text: 'White-label completo', included: true },
      ],
      cta: 'Empezar ahora',
      ctaLink: '/auth?tab=signup&plan=premium',
    },
    {
      key: 'enterprise' as const,
      icon: Building2,
      badge: 'Corporativo',
      idealFor: 'Loterías y grandes organizaciones',
      features: [
        { text: 'Sorteos ilimitados', included: true, highlight: true },
        { text: 'Hasta 10,000,000 boletos', included: true, highlight: true },
        { text: 'API Access completo', included: true },
        { text: 'SLA 99.9% garantizado', included: true },
        { text: 'Soporte telefónico 24/7', included: true },
        { text: 'Integraciones personalizadas', included: true },
        { text: 'Facturación empresarial', included: true },
      ],
      cta: 'Contactar Ventas',
      ctaLink: '/contact',
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Premium Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                SORTAVO
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                link.href.startsWith('/#') ? (
                  <a 
                    key={link.label}
                    href={link.href.replace('/', '')}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(link.href.replace('/#', ''));
                    }}
                    className="text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link 
                    key={link.label}
                    to={link.href} 
                    className="text-muted-foreground hover:text-primary font-medium transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="text-foreground hover:text-primary hover:bg-primary/10">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button className="bg-gradient-to-r from-primary to-emerald-400 hover:from-primary/90 hover:to-emerald-400/90 shadow-lg shadow-primary/25">
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
                    link.href.startsWith('/#') ? (
                      <a 
                        key={link.label}
                        href={link.href.replace('/', '')}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToSection(link.href.replace('/#', ''), () => setMobileMenuOpen(false));
                        }}
                        className="text-lg font-medium text-foreground hover:text-primary cursor-pointer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link 
                        key={link.label}
                        to={link.href} 
                        className="text-lg font-medium text-foreground hover:text-primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    )
                  ))}
                  <hr className="border-border" />
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Iniciar Sesión</Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-primary to-emerald-400">
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
      <section className="pt-28 pb-12 lg:pt-36 lg:pb-20 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 radial-gradient-top" />
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" />
        <div className="absolute top-40 -right-32 w-96 h-96 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-primary/5 to-transparent rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-6 px-4 py-1.5 bg-gradient-to-r from-primary/20 to-emerald-400/20 text-primary border-primary/30 hover:bg-primary/20 text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Sin comisiones por venta
            </Badge>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight"
          >
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
              Precios Simples
            </span>
            <br />
            <span className="text-foreground">y Transparentes</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Elige el plan perfecto para tu negocio de sorteos. Sin sorpresas, sin costos ocultos.
            <span className="block mt-2 text-primary font-medium">
              Más de 500+ organizadores confían en Sortavo
            </span>
          </motion.p>

          {/* Billing Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-16"
          >
            <PricingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid gap-6 lg:gap-8 md:grid-cols-2 xl:grid-cols-4 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const planData = STRIPE_PLANS[plan.key];
              const price = isAnnual ? planData.annualPrice : planData.monthlyPrice;

              return (
                <PricingCard
                  key={plan.key}
                  name={planData.name}
                  price={price}
                  isAnnual={isAnnual}
                  icon={plan.icon}
                  badge={plan.badge}
                  popular={plan.popular}
                  tier={plan.key}
                  idealFor={plan.idealFor}
                  features={plan.features}
                  cta={plan.cta}
                  ctaLink={plan.ctaLink}
                  index={index}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Social Proof */}
      <SocialProofSection />

      {/* Feature Comparison Table */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Comparación de Planes
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Encuentra el plan que mejor se adapte a tus necesidades
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="overflow-x-auto"
          >
            <table className="w-full max-w-5xl mx-auto bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
              <thead>
                <tr className="bg-gradient-to-r from-primary/10 via-emerald-400/10 to-primary/10">
                  <th className="py-5 px-6 text-left font-semibold text-muted-foreground">Característica</th>
                  <th className="py-5 px-4 text-center font-semibold text-foreground">Básico</th>
                  <th className="py-5 px-4 text-center font-semibold text-primary bg-primary/10 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs">Popular</Badge>
                    </div>
                    Pro
                  </th>
                  <th className="py-5 px-4 text-center font-semibold text-amber-600">Premium</th>
                  <th className="py-5 px-4 text-center font-semibold text-purple-600">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Sorteos activos', '2', '7', '15', 'Ilimitados'],
                  ['Boletos por sorteo', '2,000', '30,000', '100,000', '10,000,000'],
                  ['Plantillas', '1', '6', '6 + CSS', '6 + CSS'],
                  ['Sin marca Sortavo', false, true, true, true],
                  ['Analytics avanzado', false, true, true, true],
                  ['Lotería Nacional', false, true, true, true],
                  ['Soporte WhatsApp', false, true, true, true],
                  ['Bot de Telegram', false, false, true, true],
                  ['Account Manager', false, false, true, true],
                  ['API Access', false, false, false, true],
                  ['SLA 99.9%', false, false, false, true],
                  ['Soporte 24/7', false, false, false, true],
                ].map(([feature, basic, pro, premium, enterprise], idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 text-foreground font-medium">{feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof basic === 'boolean' ? (
                        basic ? <Check className="h-5 w-5 mx-auto text-success" /> : <X className="h-5 w-5 mx-auto text-muted-foreground/30" />
                      ) : <span className="text-muted-foreground">{basic}</span>}
                    </td>
                    <td className="py-4 px-4 text-center bg-primary/5">
                      {typeof pro === 'boolean' ? (
                        pro ? <Check className="h-5 w-5 mx-auto text-success" /> : <X className="h-5 w-5 mx-auto text-muted-foreground/30" />
                      ) : <span className="font-semibold text-primary">{pro}</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof premium === 'boolean' ? (
                        premium ? <Check className="h-5 w-5 mx-auto text-success" /> : <X className="h-5 w-5 mx-auto text-muted-foreground/30" />
                      ) : <span className="text-amber-600 font-medium">{premium}</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof enterprise === 'boolean' ? (
                        enterprise ? <Check className="h-5 w-5 mx-auto text-success" /> : <X className="h-5 w-5 mx-auto text-muted-foreground/30" />
                      ) : <span className="font-semibold text-purple-600">{enterprise}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Preguntas Frecuentes
              </span>
            </h2>
            <p className="text-muted-foreground">
              Todo lo que necesitas saber sobre nuestros planes
            </p>
          </motion.div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <AccordionItem 
                  value={`faq-${index}`}
                  className="bg-card border border-border rounded-xl px-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 data-[state=open]:border-primary/50 data-[state=open]:shadow-lg data-[state=open]:shadow-primary/5"
                >
                  <AccordionTrigger className="text-left text-foreground hover:no-underline py-5 font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-emerald-600 to-teal-500" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.3),transparent)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
              ¿Listo para empezar?
            </h2>
            <p className="text-primary-foreground/90 text-lg lg:text-xl mb-10 max-w-2xl mx-auto">
              Únete a miles de organizadores que ya confían en Sortavo para sus sorteos.
              <span className="block mt-2 text-primary-foreground/80 text-base">
                Garantía de devolución de 7 días • Sin compromiso
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?tab=signup">
                <Button 
                  size="lg"
                  className="bg-background text-primary hover:bg-background/90 shadow-xl px-8 py-6 text-lg font-semibold group"
                >
                  Crear cuenta gratis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50 px-8 py-6 text-lg"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Contactar ventas
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
