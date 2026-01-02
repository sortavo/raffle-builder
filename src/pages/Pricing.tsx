import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useScopedDarkMode } from '@/hooks/useScopedDarkMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Trophy, Rocket, Zap, Crown, Check, X, ArrowRight, 
  Mail, Building2, Sparkles, Ticket, Users, Settings, 
  Palette, Dices, Headphones, HelpCircle
} from 'lucide-react';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { STRIPE_PLANS } from '@/lib/stripe-config';
import { Footer } from '@/components/layout/Footer';
import { PricingCard, PricingToggle, SocialProofSection, TrustBadges } from '@/components/pricing';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { PremiumHero } from '@/components/layout/PremiumBackground';
import { cn } from '@/lib/utils';

export default function Pricing() {
  // Activate dark mode for this page
  useScopedDarkMode();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      key: 'basic' as const,
      icon: Rocket,
      badge: 'Para Empezar',
      idealFor: 'Ideal para organizadores casuales',
      hasTrial: true,
      trialDays: 7,
      features: [
        { text: '2 sorteos activos simultáneos', included: true },
        { text: 'Hasta 2,000 boletos por sorteo', included: true },
        { text: '1 plantilla personalizable', included: true },
        { text: 'Panel de control básico', included: true },
        { text: 'Soporte por email (48h)', included: true },
        { text: 'Grid de boletos interactivo', included: true },
        { text: 'Sistema de reservación automática', included: true },
      ],
      cta: 'Empezar gratis',
      ctaLink: '/auth?tab=signup&plan=basic',
    },
    {
      key: 'pro' as const,
      icon: Zap,
      badge: 'Más Popular',
      idealFor: 'Para organizadores profesionales',
      popular: true,
      hasTrial: false,
      features: [
        { text: '7 sorteos activos simultáneos', included: true, highlight: true },
        { text: 'Hasta 30,000 boletos por sorteo', included: true, highlight: true },
        { text: '6 plantillas profesionales', included: true },
        { text: 'Analytics avanzado', included: true },
        { text: 'Sin marca Sortavo', included: true },
        { text: 'Integración WhatsApp', included: true },
        { text: 'API Lotería Nacional', included: true },
      ],
      cta: 'Suscribirse',
      ctaLink: '/auth?tab=signup&plan=pro',
    },
    {
      key: 'premium' as const,
      icon: Crown,
      badge: 'Empresas',
      idealFor: 'Para equipos y empresas',
      hasTrial: false,
      features: [
        { text: '15 sorteos activos simultáneos', included: true, highlight: true },
        { text: 'Hasta 100,000 boletos', included: true, highlight: true },
        { text: '6 plantillas + CSS personalizado', included: true },
        { text: 'Account Manager dedicado', included: true },
        { text: 'Bot de Telegram bidireccional', included: true },
        { text: 'Setup asistido incluido', included: true },
        { text: 'White-label completo', included: true },
      ],
      cta: 'Suscribirse',
      ctaLink: '/auth?tab=signup&plan=premium',
    },
    {
      key: 'enterprise' as const,
      icon: Building2,
      badge: 'Corporativo',
      idealFor: 'Loterías y grandes organizaciones',
      hasTrial: false,
      features: [
        { text: 'Sorteos ilimitados', included: true, highlight: true },
        { text: 'Hasta 10,000,000 boletos', included: true, highlight: true },
        { text: 'API Access completo', included: true },
        { text: 'SLA 99.9% garantizado', included: true },
        { text: 'Soporte telefónico 24/7', included: true },
        { text: 'Integraciones personalizadas', included: true },
        { text: 'Facturación empresarial', included: true },
      ],
      cta: 'Suscribirse',
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
    <div className="min-h-screen bg-ultra-dark overflow-x-hidden">
      {/* Premium Navigation */}
      <PremiumNavbar variant="solid" />

      {/* Hero Section - TIER S */}
      <PremiumHero>
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-8 px-5 py-2.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-sm font-semibold shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-4 h-4 mr-2" />
              Sin comisiones por venta
            </Badge>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-[-0.04em] leading-[0.9]"
          >
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
              Precios Simples
            </span>
            <br />
            <span className="text-white">y Transparentes</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12 text-xl lg:text-2xl text-white/50 max-w-2xl mx-auto"
          >
            Elige el plan perfecto para tu negocio de sorteos. Sin sorpresas, sin costos ocultos.
            <span className="block mt-3 text-emerald-400 font-semibold">
              Más de 500+ organizadores confían en Sortavo
            </span>
          </motion.p>

          {/* Billing Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-20"
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
                  hasTrial={plan.hasTrial}
                  trialDays={plan.trialDays}
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

      {/* Feature Comparison Table - TIER S with increased spacing */}
      <section className="py-32 lg:py-40 xl:py-48 relative overflow-hidden">
        {/* Contrasting background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-teal-950/30" />
        
        {/* TIER S: 4 animated orbs with blur-120px */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/12 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-0 w-[350px] h-[350px] bg-emerald-400/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-teal-400/6 rounded-full blur-[100px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        {/* Top and bottom border glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        
        {/* Noise texture */}
        <div className="absolute inset-0 noise-texture" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-20 lg:mb-24"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-8 tracking-[-0.03em]">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Comparación de Planes
              </span>
            </h2>
            <p className="text-xl lg:text-2xl text-white/50 max-w-xl mx-auto">
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
            <table className="w-full max-w-5xl mx-auto bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20">
                  <th className="py-6 px-6 text-left font-semibold text-gray-400 rounded-tl-2xl">Característica</th>
                  <th className="py-6 px-4 text-center font-semibold text-gray-200">Básico</th>
                  <th className="py-6 px-4 pt-10 text-center font-semibold text-emerald-400 bg-emerald-500/10 relative">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white text-xs shadow-lg shadow-emerald-500/30">Popular</Badge>
                    </div>
                    Pro
                  </th>
                  <th className="py-6 px-4 text-center font-semibold text-amber-400">Premium</th>
                  <th className="py-6 px-4 text-center font-semibold text-purple-400 rounded-tr-2xl">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {/* Categoría: Capacidad */}
                <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
                  <td colSpan={5} className="py-3 px-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                      <Ticket className="h-4 w-4" />
                      Capacidad
                    </div>
                  </td>
                </tr>
                {[
                  ['Período de prueba', '7 días gratis', false, false, false],
                  ['Sorteos activos', '2', '7', '15', 'Ilimitados'],
                  ['Boletos por sorteo', '2,000', '30,000', '100,000', '10M'],
                  ['Dominios personalizados', false, '3', '10', '100'],
                ].map(([feature, basic, pro, premium, enterprise], idx) => (
                  <tr key={`cap-${idx}`} className={cn("hover:bg-white/5 transition-colors", idx === 0 && "bg-emerald-500/5")}>
                    <td className={cn("py-4 px-6 text-gray-200 font-medium", idx === 0 && "text-emerald-400")}>{feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof basic === 'boolean' ? (
                        basic ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className={cn("text-gray-400", idx === 0 && "text-emerald-400 font-medium")}>{basic}</span>}
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

                {/* Categoría: Experiencia del Comprador */}
                <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
                  <td colSpan={5} className="py-3 px-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                      <Users className="h-4 w-4" />
                      Experiencia del Comprador
                    </div>
                  </td>
                </tr>
                {[
                  { feature: 'Selector visual de números', tooltip: 'Grid interactivo para elegir boletos disponibles en tiempo real', values: [true, true, true, true] },
                  { feature: 'Números de la suerte', tooltip: 'Genera números basados en cumpleaños o fechas especiales', values: [true, true, true, true] },
                  { feature: 'Paquetes con bonificación', tooltip: 'Ofrece promociones como compra 2 lleva 3', values: [true, true, true, true] },
                  { feature: 'Verificador QR 24/7', tooltip: 'Los compradores verifican sus boletos escaneando el código QR', values: [true, true, true, true] },
                  { feature: 'Historial de ganadores', tooltip: null, values: [false, true, true, true] },
                ].map((item, idx) => (
                  <tr key={`buyer-${idx}`} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-200 font-medium">
                      <div className="flex items-center gap-2">
                        {item.feature}
                        {item.tooltip && <HelpTooltip content={item.tooltip} />}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[0] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center bg-emerald-500/5">
                      {item.values[1] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[2] ? <Check className="h-5 w-5 mx-auto text-amber-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[3] ? <Check className="h-5 w-5 mx-auto text-purple-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                  </tr>
                ))}

                {/* Categoría: Gestión y Ventas */}
                <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
                  <td colSpan={5} className="py-3 px-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                      <Settings className="h-4 w-4" />
                      Gestión y Ventas
                    </div>
                  </td>
                </tr>
                {[
                  { feature: 'Métodos de pago ilimitados', tooltip: 'Agrega transferencias, efectivo, PayPal y más', values: [true, true, true, true] },
                  { feature: 'Flujo de aprobación de pagos', tooltip: 'Revisa y aprueba comprobantes de pago antes de confirmar', values: [true, true, true, true] },
                  { feature: 'Recordatorios automáticos', tooltip: 'Envía recordatorios a compradores con pagos pendientes', values: [false, true, true, true] },
                  { feature: 'Exportación Excel/CSV', tooltip: null, values: [true, true, true, true] },
                  { feature: 'Reporte financiero PDF', tooltip: 'Genera reportes detallados de ingresos y ventas', values: [false, true, true, true] },
                  { feature: 'Numeración personalizada', tooltip: 'Configura prefijos, rangos y formatos de boletos', values: [false, true, true, true] },
                ].map((item, idx) => (
                  <tr key={`mgmt-${idx}`} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-200 font-medium">
                      <div className="flex items-center gap-2">
                        {item.feature}
                        {item.tooltip && <HelpTooltip content={item.tooltip} />}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[0] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center bg-emerald-500/5">
                      {item.values[1] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[2] ? <Check className="h-5 w-5 mx-auto text-amber-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[3] ? <Check className="h-5 w-5 mx-auto text-purple-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                  </tr>
                ))}

                {/* Categoría: Diseño y Marca */}
                <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
                  <td colSpan={5} className="py-3 px-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                      <Palette className="h-4 w-4" />
                      Diseño y Marca
                    </div>
                  </td>
                </tr>
                {[
                  { feature: 'Plantillas premium', tooltip: null, values: ['1', '6', '6 + CSS', '6 + CSS'] },
                  { feature: 'Galería de premios', tooltip: 'Sube fotos y videos de los premios del sorteo', values: [true, true, true, true] },
                  { feature: 'Link de transmisión en vivo', tooltip: 'Comparte el link del sorteo en vivo', values: [false, true, true, true] },
                  { feature: 'Sin marca Sortavo', tooltip: null, values: [false, true, true, true] },
                ].map((item, idx) => (
                  <tr key={`design-${idx}`} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-200 font-medium">
                      <div className="flex items-center gap-2">
                        {item.feature}
                        {item.tooltip && <HelpTooltip content={item.tooltip} />}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof item.values[0] === 'boolean' ? (
                        item.values[0] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className="text-gray-400">{item.values[0]}</span>}
                    </td>
                    <td className="py-4 px-4 text-center bg-emerald-500/5">
                      {typeof item.values[1] === 'boolean' ? (
                        item.values[1] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className="text-gray-200">{item.values[1]}</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof item.values[2] === 'boolean' ? (
                        item.values[2] ? <Check className="h-5 w-5 mx-auto text-amber-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className="text-gray-200">{item.values[2]}</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof item.values[3] === 'boolean' ? (
                        item.values[3] ? <Check className="h-5 w-5 mx-auto text-purple-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />
                      ) : <span className="text-gray-200">{item.values[3]}</span>}
                    </td>
                  </tr>
                ))}

                {/* Categoría: Métodos de Sorteo */}
                <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
                  <td colSpan={5} className="py-3 px-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                      <Dices className="h-4 w-4" />
                      Métodos de Sorteo
                    </div>
                  </td>
                </tr>
                {[
                  { feature: 'Sorteo manual', tooltip: null, values: [true, true, true, true] },
                  { feature: 'Método Lotería Nacional', tooltip: 'Usa los últimos dígitos del premio mayor como número ganador', values: [true, true, true, true] },
                  { feature: 'Sorteo aleatorio seguro', tooltip: 'Utiliza criptografía avanzada para máxima transparencia', values: [true, true, true, true] },
                  { feature: 'Sorteo automático programado', tooltip: 'Programa el sorteo para que se ejecute automáticamente', values: [false, false, true, true] },
                ].map((item, idx) => (
                  <tr key={`draw-${idx}`} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-200 font-medium">
                      <div className="flex items-center gap-2">
                        {item.feature}
                        {item.tooltip && <HelpTooltip content={item.tooltip} />}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[0] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center bg-emerald-500/5">
                      {item.values[1] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[2] ? <Check className="h-5 w-5 mx-auto text-amber-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[3] ? <Check className="h-5 w-5 mx-auto text-purple-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                  </tr>
                ))}

                {/* Categoría: Integraciones */}
                <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
                  <td colSpan={5} className="py-3 px-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                      <Zap className="h-4 w-4" />
                      Integraciones
                    </div>
                  </td>
                </tr>
                {[
                  { feature: 'Bot Telegram bidireccional', tooltip: 'Compradores y organizadores reciben notificaciones vía Telegram', values: [false, false, true, true] },
                  { feature: 'Notificaciones en tiempo real', tooltip: null, values: [true, true, true, true] },
                ].map((item, idx) => (
                  <tr key={`integ-${idx}`} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-200 font-medium">
                      <div className="flex items-center gap-2">
                        {item.feature}
                        {item.tooltip && <HelpTooltip content={item.tooltip} />}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[0] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center bg-emerald-500/5">
                      {item.values[1] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[2] ? <Check className="h-5 w-5 mx-auto text-amber-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[3] ? <Check className="h-5 w-5 mx-auto text-purple-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                  </tr>
                ))}

                {/* Categoría: Soporte y Equipo */}
                <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
                  <td colSpan={5} className="py-3 px-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                      <Headphones className="h-4 w-4" />
                      Soporte y Equipo
                    </div>
                  </td>
                </tr>
                {[
                  { feature: 'Soporte por email', tooltip: null, values: [true, true, true, true] },
                  { feature: 'Soporte WhatsApp', tooltip: null, values: [false, true, true, true] },
                  { feature: 'Account Manager dedicado', tooltip: null, values: [false, false, true, true] },
                  { feature: 'SLA 99.9%', tooltip: null, values: [false, false, false, true] },
                ].map((item, idx) => (
                  <tr key={`support-${idx}`} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-200 font-medium">
                      <div className="flex items-center gap-2">
                        {item.feature}
                        {item.tooltip && <HelpTooltip content={item.tooltip} />}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[0] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center bg-emerald-500/5">
                      {item.values[1] ? <Check className="h-5 w-5 mx-auto text-emerald-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[2] ? <Check className="h-5 w-5 mx-auto text-amber-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.values[3] ? <Check className="h-5 w-5 mx-auto text-purple-400" /> : <X className="h-5 w-5 mx-auto text-gray-600" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section - TIER S: WHITE CONTRAST SECTION */}
      <section className="py-32 lg:py-40 xl:py-48 relative overflow-hidden">
        {/* Dramatic white/emerald gradient - CONTRAST with dark sections */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-emerald-50/50 to-white" />
        
        {/* Subtle emerald orbs for depth */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-teal-400/8 rounded-full blur-[100px]" />
        
        {/* Grid pattern - subtle on light bg */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-20 lg:mb-24"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-8 tracking-[-0.03em]">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Preguntas Frecuentes
              </span>
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-xl mx-auto">
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
            <Accordion type="single" collapsible className="space-y-5">
              {faqs.map((faq, idx) => (
                <AccordionItem 
                  key={idx} 
                  value={`item-${idx}`}
                  className="bg-white border border-gray-200/80 rounded-xl px-8 overflow-hidden shadow-lg shadow-emerald-500/5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300"
                >
                  <AccordionTrigger className="text-left text-gray-800 hover:text-emerald-600 hover:no-underline py-6 text-lg font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-6 text-base leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section - TIER S Premium */}
      <section className="py-28 lg:py-36 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,rgba(255,255,255,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(212,160,22,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-8 text-white tracking-[-0.03em]">
              ¿Listo para empezar?
            </h2>
            <p className="text-xl lg:text-2xl text-white/80 mb-12 max-w-2xl mx-auto">
              Únete a más de 500 organizadores que ya confían en Sortavo para sus sorteos profesionales.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-10 py-7 bg-white text-emerald-700 hover:bg-white/90 shadow-xl shadow-black/20 group font-bold"
                asChild
              >
                <Link to="/auth?tab=signup">
                  Comenzar Gratis
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-10 py-7 border-2 border-white/30 hover:border-white/50 hover:bg-white/10 bg-transparent text-white font-medium"
                asChild
              >
                <Link to="/contact">
                  <Mail className="mr-2 w-5 h-5" />
                  Contactar Ventas
                </Link>
              </Button>
            </div>
            
            <p className="mt-10 text-white/70 text-lg">
              ¿Tienes preguntas? Escríbenos a{' '}
              <a href="mailto:ventas@sortavo.com" className="text-white hover:text-white/80 underline font-medium">
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
