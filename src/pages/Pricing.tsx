import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Trophy, Rocket, Zap, Crown, Check, X, ArrowRight, 
  Mail, Building2, Sparkles
} from 'lucide-react';
import { STRIPE_PLANS } from '@/lib/stripe-config';
import { Footer } from '@/components/layout/Footer';
import { PricingCard, PricingToggle, SocialProofSection, TrustBadges } from '@/components/pricing';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { PremiumHero } from '@/components/layout/PremiumBackground';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

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
      cta: 'Empezar ahora',
      ctaLink: '/auth?tab=signup&plan=enterprise',
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
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">
      {/* Premium Navigation */}
      <PremiumNavbar variant="solid" />

      {/* Hero Section */}
      <PremiumHero>
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-6 px-4 py-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-sm font-semibold">
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
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
              Precios Simples
            </span>
            <br />
            <span className="text-white">y Transparentes</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10 text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto"
          >
            Elige el plan perfecto para tu negocio de sorteos. Sin sorpresas, sin costos ocultos.
            <span className="block mt-2 text-emerald-400 font-medium">
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

          {/* Link to detailed comparison */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center mt-10"
          >
            <Button variant="link" asChild className="text-gray-400 hover:text-emerald-400">
              <Link to="/pricing/compare">
                Ver comparación detallada de todas las características →
              </Link>
            </Button>
          </motion.div>
        </div>
      </PremiumHero>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Social Proof */}
      <SocialProofSection />

      {/* Feature Comparison Table */}
      <section className="py-20 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Comparación de Planes
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
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
            <table className="w-full max-w-5xl mx-auto bg-gray-900/80 rounded-2xl shadow-xl border border-white/10 overflow-hidden">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20">
                  <th className="py-5 px-6 text-left font-semibold text-gray-400">Característica</th>
                  <th className="py-5 px-4 text-center font-semibold text-gray-200">Básico</th>
                  <th className="py-5 px-4 text-center font-semibold text-emerald-400 bg-emerald-500/10 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white text-xs">Popular</Badge>
                    </div>
                    Pro
                  </th>
                  <th className="py-5 px-4 text-center font-semibold text-amber-400">Premium</th>
                  <th className="py-5 px-4 text-center font-semibold text-purple-400">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
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
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-200 font-medium">{feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof basic === 'boolean' ? (
                        basic ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className="text-gray-400">{basic}</span>}
                    </td>
                    <td className="py-4 px-4 text-center bg-emerald-500/5">
                      {typeof pro === 'boolean' ? (
                        pro ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className="text-gray-200">{pro}</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof premium === 'boolean' ? (
                        premium ? <Check className="h-5 w-5 mx-auto text-amber-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className="text-gray-200">{premium}</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof enterprise === 'boolean' ? (
                        enterprise ? <Check className="h-5 w-5 mx-auto text-purple-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className="text-gray-200">{enterprise}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-950">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Preguntas Frecuentes
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Todo lo que necesitas saber sobre nuestros planes y precios
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-3xl mx-auto"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, idx) => (
                <AccordionItem 
                  key={idx} 
                  value={`item-${idx}`}
                  className="bg-gray-900/80 border border-white/10 rounded-xl px-6 overflow-hidden"
                >
                  <AccordionTrigger className="text-left text-gray-200 hover:text-emerald-400 hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">
              ¿Listo para empezar?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Únete a más de 500 organizadores que ya confían en Sortavo para sus sorteos profesionales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-600/25"
                asChild
              >
                <Link to="/auth?tab=signup">
                  Comenzar Gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 border-2 border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 bg-white/5 text-white"
                asChild
              >
                <Link to="/contact">
                  <Mail className="mr-2 w-5 h-5" />
                  Contactar Ventas
                </Link>
              </Button>
            </div>
            
            <p className="mt-8 text-gray-400">
              ¿Tienes preguntas? Escríbenos a{' '}
              <a href="mailto:ventas@sortavo.com" className="text-emerald-400 hover:text-emerald-300 underline">
                ventas@sortavo.com
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
