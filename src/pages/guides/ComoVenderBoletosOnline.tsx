import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowLeft, Clock, TrendingUp, Sparkles, Share2, CreditCard, MessageCircle, BarChart3, Target, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { useScopedDarkMode } from '@/hooks/useScopedDarkMode';
import { SEOHead, StructuredData, createFAQSchema, createBreadcrumbSchema } from '@/components/seo';

const faqs = [
  {
    question: '¿Cómo acepto pagos de boletos online?',
    answer: 'Con Sortavo puedes aceptar transferencias bancarias, tarjetas de crédito/débito, y pagos móviles. Los compradores suben su comprobante y tú apruebas desde el dashboard.'
  },
  {
    question: '¿Cuál es la mejor red social para vender boletos?',
    answer: 'WhatsApp y Facebook son los canales más efectivos en LATAM. WhatsApp por su inmediatez y confianza, Facebook por su alcance. Instagram funciona mejor para premios visuales.'
  },
  {
    question: '¿Cómo genero confianza para que compren?',
    answer: 'Muestra: 1) Tu identidad como organizador, 2) Fotos reales del premio, 3) Testimonios de ganadores anteriores, 4) Plataforma certificada, 5) Bases claras del sorteo.'
  },
  {
    question: '¿Cuánto tiempo antes debo empezar a vender?',
    answer: 'Idealmente 2-4 semanas antes del sorteo. La primera semana es para generar awareness, las siguientes para conversión, y los últimos días para urgencia.'
  },
];

const estrategias = [
  {
    titulo: 'WhatsApp Marketing',
    icon: MessageCircle,
    gradient: 'from-green-500 to-emerald-500',
    efectividad: 95,
    descripcion: 'El canal #1 en LATAM. Estados, grupos y mensajes directos.',
    tips: ['Publica estados diarios', 'Crea grupo exclusivo de sorteo', 'Responde en menos de 5 min', 'Usa stickers personalizados'],
  },
  {
    titulo: 'Facebook Ads + Orgánico',
    icon: Share2,
    gradient: 'from-blue-500 to-indigo-500',
    efectividad: 88,
    descripcion: 'Alcance masivo con segmentación precisa por ubicación e intereses.',
    tips: ['Publica en grupos locales', 'Usa Marketplace gratis', 'Invierte $500-1000 en ads', 'Haz Lives mostrando el premio'],
  },
  {
    titulo: 'Urgencia y Escasez',
    icon: Zap,
    gradient: 'from-amber-500 to-orange-500',
    efectividad: 82,
    descripcion: 'Activa el FOMO (miedo a perdérselo) con contadores y límites.',
    tips: ['Contador regresivo visible', '"Solo quedan X boletos"', 'Descuentos por tiempo limitado', 'Cierre de venta antes del sorteo'],
  },
  {
    titulo: 'Social Proof',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-pink-500',
    efectividad: 78,
    descripcion: 'Muestra que otros ya compraron para generar confianza.',
    tips: ['Notificaciones de compra en vivo', 'Testimonios de ganadores', 'Contador de participantes', 'Reviews y calificaciones'],
  },
];

const pasos = [
  { num: 1, titulo: 'Configura tu página de sorteo', desc: 'Sube fotos del premio, define precio, cantidad de boletos y fecha. Con Sortavo toma 5 minutos.' },
  { num: 2, titulo: 'Conecta tus métodos de pago', desc: 'Agrega cuentas bancarias, PayPal, o links de pago. Entre más opciones, más ventas.' },
  { num: 3, titulo: 'Crea tu estrategia de lanzamiento', desc: 'Define canales (WhatsApp, FB, IG), calendario de publicaciones y presupuesto de ads.' },
  { num: 4, titulo: 'Lanza con impacto', desc: 'Anuncia en todos tus canales el mismo día. El momentum inicial es clave.' },
  { num: 5, titulo: 'Mantén el engagement', desc: 'Publica actualizaciones diarias: boletos vendidos, tiempo restante, historias de compradores.' },
  { num: 6, titulo: 'Activa la urgencia final', desc: 'Los últimos 3 días generan hasta 40% de las ventas. Intensifica la comunicación.' },
];

export default function ComoVenderBoletosOnline() {
  useScopedDarkMode();

  const breadcrumbs = [
    { name: 'Inicio', url: 'https://sortavo.com/' },
    { name: 'Guías', url: 'https://sortavo.com/guias' },
    { name: 'Cómo Vender Boletos Online', url: 'https://sortavo.com/guias/como-vender-boletos-online' },
  ];

  const articleSchema = {
    "@type": "Article",
    "headline": "Cómo Vender Boletos de Rifa Online: Guía de Marketing 2025",
    "description": "Aprende las mejores estrategias para vender boletos digitales, promocionar tu sorteo y maximizar conversiones.",
    "image": "https://sortavo.com/og-guia-vender.png",
    "author": { "@type": "Organization", "name": "Sortavo" },
    "publisher": { "@type": "Organization", "name": "Sortavo", "logo": { "@type": "ImageObject", "url": "https://sortavo.com/logo.png" } },
    "datePublished": "2025-01-01",
    "dateModified": "2026-01-09"
  };

  return (
    <>
      <SEOHead
        title="Cómo Vender Boletos de Rifa Online - Guía de Marketing 2025"
        description="Aprende las mejores estrategias para vender boletos digitales. WhatsApp marketing, Facebook Ads, urgencia y social proof para maximizar ventas."
        canonical="https://sortavo.com/guias/como-vender-boletos-online"
        keywords="vender boletos de rifa online, cómo vender boletos por internet, marketing para rifas, promocionar sorteo"
        type="article"
      />
      <StructuredData data={[articleSchema, createFAQSchema(faqs), createBreadcrumbSchema(breadcrumbs)]} />

      <div className="min-h-screen bg-ultra-dark">
        <PremiumNavbar variant="solid" />

        {/* Hero */}
        <section className="pt-28 pb-16 lg:pt-36 lg:pb-20 bg-gradient-to-b from-purple-900/20 to-transparent">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Link to="/guias" className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Guías
              </Link>

              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Marketing</Badge>
                <div className="flex items-center text-gray-400 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  15 min lectura
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                  Cómo Vender Boletos
                </span>
                <br />
                <span className="text-white">de Rifa Online</span>
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed">
                Domina el marketing digital para sorteos. Aprende estrategias probadas de WhatsApp, 
                Facebook, urgencia y social proof que multiplican tus ventas.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="max-w-5xl mx-auto px-4">
            
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-16">
              {[
                { value: '85%', label: 'Ventas vía WhatsApp', color: 'text-green-400' },
                { value: '40%', label: 'Ventas últimos 3 días', color: 'text-amber-400' },
                { value: '3x', label: 'Más con social proof', color: 'text-purple-400' },
                { value: '5 min', label: 'Tiempo respuesta ideal', color: 'text-blue-400' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-900/80 rounded-xl p-5 border border-white/10 text-center"
                >
                  <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-gray-400 text-xs">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Paso a Paso */}
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-400" />
              Proceso de Venta en 6 Pasos
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {pasos.map((paso) => (
                <motion.div
                  key={paso.num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="flex gap-4 bg-gray-900/80 rounded-xl p-6 border border-white/10"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                    {paso.num}
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{paso.titulo}</h4>
                    <p className="text-gray-400 text-sm">{paso.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Estrategias */}
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              Estrategias de Alto Impacto
            </h2>
            
            <div className="space-y-8 mb-16">
              {estrategias.map((est, index) => (
                <motion.div
                  key={est.titulo}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-900/80 rounded-2xl p-8 border border-white/10"
                >
                  <div className="flex items-start gap-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${est.gradient} flex items-center justify-center flex-shrink-0`}>
                      <est.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white">{est.titulo}</h3>
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          {est.efectividad}% efectivo
                        </Badge>
                      </div>
                      <p className="text-gray-300 mb-4">{est.descripcion}</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {est.tips.map((tip, i) => (
                          <div key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            {tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Sortavo Features */}
            <div className="bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-purple-600/20 rounded-3xl p-8 border border-purple-500/20 mb-16">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                ¿Por qué Sortavo para vender boletos?
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: ShoppingCart, title: 'Página de venta lista', desc: 'Tu sorteo online en 5 minutos, sin código.' },
                  { icon: CreditCard, title: 'Múltiples pagos', desc: 'Transferencia, tarjeta, PayPal y más.' },
                  { icon: BarChart3, title: 'Analytics en tiempo real', desc: 'Ve quién compra, cuándo y de dónde.' },
                ].map((feat, i) => (
                  <div key={i} className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                      <feat.icon className="w-7 h-7 text-purple-400" />
                    </div>
                    <h4 className="text-white font-bold mb-1">{feat.title}</h4>
                    <p className="text-gray-400 text-sm">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <h2 className="text-3xl font-bold text-white mb-8">Preguntas Frecuentes</h2>
            <div className="space-y-4 mb-16">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-900/80 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-white font-bold mb-2">{faq.question}</h4>
                  <p className="text-gray-300">{faq.answer}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">¿Listo para vender tu primer boleto?</h3>
              <p className="text-gray-300 mb-6">Crea tu sorteo y empieza a vender hoy mismo.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Crear Sorteo Gratis
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10">
                    Ver Planes Pro
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
