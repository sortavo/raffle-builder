import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Clock, CheckCircle2, AlertTriangle, Sparkles, FileText, Users, Shield, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { useScopedDarkMode } from '@/hooks/useScopedDarkMode';
import { SEOHead, StructuredData, createFAQSchema, createBreadcrumbSchema } from '@/components/seo';

const faqs = [
  {
    question: '¿Necesito permiso de la SEGOB para hacer una rifa?',
    answer: 'Depende del monto y alcance. Rifas pequeñas (menos de $50,000 MXN) generalmente no requieren permiso federal, pero rifas mayores o con alcance nacional sí necesitan autorización de la Secretaría de Gobernación.'
  },
  {
    question: '¿Cuánto cuesta el permiso de la SEGOB?',
    answer: 'El costo varía según el monto total de la rifa. Los derechos van desde $1,500 MXN para rifas pequeñas hasta varios miles para sorteos de mayor valor. Consulta la Ley Federal de Juegos y Sorteos para tarifas actualizadas.'
  },
  {
    question: '¿Puedo hacer una rifa benéfica sin permiso?',
    answer: 'Las rifas con fines benéficos de organizaciones registradas tienen facilidades, pero aún requieren notificación a las autoridades. La Ley contempla exenciones parciales para causas sociales.'
  },
  {
    question: '¿Qué pasa si hago una rifa sin permiso?',
    answer: 'Las sanciones incluyen multas económicas significativas y, en casos graves, responsabilidad penal. Es fundamental cumplir con la regulación para evitar problemas legales.'
  },
  {
    question: '¿Cómo garantizo la transparencia del sorteo?',
    answer: 'Usa plataformas certificadas como Sortavo que ofrecen sorteos con prueba criptográfica, transmisión en vivo opcional y registro auditable de todo el proceso.'
  },
];

const tableOfContents = [
  { id: 'introduccion', title: 'Introducción' },
  { id: 'requisitos-legales', title: 'Requisitos Legales en México' },
  { id: 'tipos-de-rifas', title: 'Tipos de Rifas y Permisos' },
  { id: 'paso-a-paso', title: 'Guía Paso a Paso' },
  { id: 'mejores-practicas', title: 'Mejores Prácticas' },
  { id: 'errores-comunes', title: 'Errores a Evitar' },
  { id: 'faq', title: 'Preguntas Frecuentes' },
];

export default function ComoOrganizarRifaLegal() {
  useScopedDarkMode();

  const breadcrumbs = [
    { name: 'Inicio', url: 'https://sortavo.com/' },
    { name: 'Guías', url: 'https://sortavo.com/guias' },
    { name: 'Cómo Organizar una Rifa Legal', url: 'https://sortavo.com/guias/como-organizar-rifa-legal-mexico' },
  ];

  const articleSchema = {
    "@type": "Article",
    "headline": "Cómo Organizar una Rifa Legal en México: Guía Completa 2025",
    "description": "Aprende paso a paso cómo crear sorteos legales, seguros y exitosos en México. Requisitos, permisos SEGOB y mejores prácticas.",
    "image": "https://sortavo.com/og-guia-rifa-legal.png",
    "author": {
      "@type": "Organization",
      "name": "Sortavo"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Sortavo",
      "logo": {
        "@type": "ImageObject",
        "url": "https://sortavo.com/logo.png"
      }
    },
    "datePublished": "2025-01-01",
    "dateModified": "2026-01-09",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://sortavo.com/guias/como-organizar-rifa-legal-mexico"
    }
  };

  return (
    <>
      <SEOHead
        title="Cómo Organizar una Rifa Legal en México - Guía Completa 2025"
        description="Aprende paso a paso cómo crear sorteos legales en México. Requisitos SEGOB, permisos necesarios, mejores prácticas y errores a evitar. Guía actualizada."
        canonical="https://sortavo.com/guias/como-organizar-rifa-legal-mexico"
        keywords="cómo organizar una rifa legal, rifas legales méxico, permiso SEGOB rifa, sorteos legales, crear rifa legal"
        type="article"
      />
      <StructuredData data={[articleSchema, createFAQSchema(faqs), createBreadcrumbSchema(breadcrumbs)]} />

      <div className="min-h-screen bg-ultra-dark">
        <PremiumNavbar variant="solid" />

        {/* Hero */}
        <section className="pt-28 pb-16 lg:pt-36 lg:pb-20 bg-gradient-to-b from-emerald-900/20 to-transparent">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link to="/guias" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Guías
              </Link>

              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Legal
                </Badge>
                <div className="flex items-center text-gray-400 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  12 min lectura
                </div>
                <div className="text-gray-500 text-sm">
                  Actualizado: Enero 2026
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
                  Cómo Organizar una Rifa Legal
                </span>
                <br />
                <span className="text-white">en México</span>
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed">
                Guía completa y actualizada para crear sorteos que cumplan con la Ley Federal de Juegos y Sorteos. 
                Aprende los requisitos, evita multas y garantiza la confianza de tus participantes.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid lg:grid-cols-4 gap-12">
              {/* Table of Contents - Desktop */}
              <aside className="hidden lg:block">
                <div className="sticky top-28 bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h3 className="text-white font-bold mb-4">Contenido</h3>
                  <nav className="space-y-2">
                    {tableOfContents.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block text-gray-400 hover:text-emerald-400 text-sm transition-colors py-1"
                      >
                        {item.title}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Main Content */}
              <article className="lg:col-span-3 prose prose-invert prose-lg max-w-none">
                
                {/* Introducción */}
                <section id="introduccion" className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-emerald-400" />
                    Introducción
                  </h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Organizar una rifa puede ser una excelente forma de recaudar fondos, promocionar un negocio o simplemente 
                    crear emoción alrededor de un evento. Sin embargo, en México, las rifas están reguladas por la 
                    <strong className="text-white"> Ley Federal de Juegos y Sorteos</strong>, y desconocer esta regulación 
                    puede resultar en multas significativas o incluso problemas legales.
                  </p>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Esta guía te llevará paso a paso por todo lo que necesitas saber para organizar una rifa 
                    <strong className="text-emerald-400"> 100% legal</strong>, desde los requisitos básicos hasta las mejores 
                    prácticas que garantizarán el éxito de tu sorteo.
                  </p>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 my-8">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="text-white font-bold mb-2">¿Por qué es importante la legalidad?</h4>
                        <p className="text-gray-300 text-base">
                          Una rifa legal genera confianza en los participantes, protege al organizador de sanciones, 
                          y garantiza que los ganadores reciban sus premios sin contratiempos.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Requisitos Legales */}
                <section id="requisitos-legales" className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <Shield className="w-8 h-8 text-emerald-400" />
                    Requisitos Legales en México
                  </h2>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    La <strong className="text-white">Ley Federal de Juegos y Sorteos</strong> establece que cualquier 
                    sorteo, rifa o lotería que involucre la venta de boletos requiere autorización de la 
                    <strong className="text-white"> Secretaría de Gobernación (SEGOB)</strong>.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6 my-8">
                    <div className="bg-gray-900/80 rounded-2xl p-6 border border-white/10">
                      <FileText className="w-10 h-10 text-emerald-400 mb-4" />
                      <h4 className="text-white font-bold mb-2">Documentos Necesarios</h4>
                      <ul className="text-gray-300 space-y-2 text-base">
                        <li>• Solicitud formal a SEGOB</li>
                        <li>• Identificación oficial del organizador</li>
                        <li>• Comprobante de domicilio</li>
                        <li>• Bases del sorteo detalladas</li>
                        <li>• Pago de derechos correspondientes</li>
                      </ul>
                    </div>
                    <div className="bg-gray-900/80 rounded-2xl p-6 border border-white/10">
                      <Calendar className="w-10 h-10 text-amber-400 mb-4" />
                      <h4 className="text-white font-bold mb-2">Tiempos Estimados</h4>
                      <ul className="text-gray-300 space-y-2 text-base">
                        <li>• Trámite SEGOB: 15-30 días hábiles</li>
                        <li>• Publicación de bases: 5 días antes</li>
                        <li>• Entrega de premios: 30 días después</li>
                        <li>• Informe final: 15 días post-sorteo</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Tipos de Rifas */}
                <section id="tipos-de-rifas" className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <Users className="w-8 h-8 text-emerald-400" />
                    Tipos de Rifas y Permisos
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-900/80 rounded-2xl p-6 border border-emerald-500/30">
                      <h4 className="text-emerald-400 font-bold mb-2">Rifas Pequeñas (Hasta $50,000 MXN)</h4>
                      <p className="text-gray-300">
                        Generalmente no requieren permiso federal, pero es recomendable verificar regulaciones estatales 
                        y municipales. Ideal para eventos escolares, vecinales o pequeños negocios.
                      </p>
                    </div>
                    
                    <div className="bg-gray-900/80 rounded-2xl p-6 border border-amber-500/30">
                      <h4 className="text-amber-400 font-bold mb-2">Rifas Medianas ($50,000 - $500,000 MXN)</h4>
                      <p className="text-gray-300">
                        Requieren permiso de SEGOB. El proceso es más riguroso y necesitas demostrar capacidad 
                        para entregar el premio. Común en asociaciones y PYMES.
                      </p>
                    </div>
                    
                    <div className="bg-gray-900/80 rounded-2xl p-6 border border-purple-500/30">
                      <h4 className="text-purple-400 font-bold mb-2">Rifas Grandes (Más de $500,000 MXN)</h4>
                      <p className="text-gray-300">
                        Requieren permiso especial, fianzas, y supervisión durante el sorteo. 
                        Necesitas asesoría legal especializada y una plataforma certificada.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Paso a Paso */}
                <section id="paso-a-paso" className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-6">
                    Guía Paso a Paso
                  </h2>
                  
                  <div className="space-y-6">
                    {[
                      { num: 1, title: 'Define el objetivo y premio', desc: 'Determina el propósito de tu rifa (recaudación, promoción, etc.) y elige un premio atractivo cuyo valor puedas comprobar.' },
                      { num: 2, title: 'Calcula el monto total', desc: 'Multiplica el precio del boleto por la cantidad a vender. Esto determina qué tipo de permiso necesitas.' },
                      { num: 3, title: 'Redacta las bases del sorteo', desc: 'Incluye: fecha, mecánica, premio, método de selección, forma de entrega y datos del organizador.' },
                      { num: 4, title: 'Solicita el permiso (si aplica)', desc: 'Presenta tu solicitud ante SEGOB con todos los documentos requeridos y el pago de derechos.' },
                      { num: 5, title: 'Elige una plataforma confiable', desc: 'Usa Sortavo para gestionar ventas, pagos y el sorteo con transparencia certificada.' },
                      { num: 6, title: 'Promociona tu rifa', desc: 'Comparte en redes sociales, WhatsApp y con tu comunidad. La transparencia genera confianza.' },
                      { num: 7, title: 'Realiza el sorteo públicamente', desc: 'Haz el sorteo en vivo o usa un método certificado como Random.org con prueba auditable.' },
                      { num: 8, title: 'Entrega el premio y reporta', desc: 'Entrega el premio documentando el proceso. Si tienes permiso SEGOB, presenta tu informe final.' },
                    ].map((step) => (
                      <div key={step.num} className="flex gap-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl shadow-lg">
                          {step.num}
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-xl mb-2">{step.title}</h4>
                          <p className="text-gray-300">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Mejores Prácticas */}
                <section id="mejores-practicas" className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    Mejores Prácticas
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      'Publica las bases antes de vender',
                      'Usa una plataforma con prueba auditable',
                      'Transmite el sorteo en vivo',
                      'Responde dudas de participantes',
                      'Documenta la entrega del premio',
                      'Comparte testimonios de ganadores',
                      'Mantén comunicación transparente',
                      'Cumple fechas prometidas',
                    ].map((practice, index) => (
                      <div key={index} className="flex items-center gap-3 bg-gray-900/50 rounded-xl p-4 border border-white/10">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-gray-300">{practice}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Errores Comunes */}
                <section id="errores-comunes" className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                    Errores a Evitar
                  </h2>
                  
                  <div className="space-y-4">
                    {[
                      { error: 'No verificar los requisitos legales', consequence: 'Multas de hasta $500,000 MXN o cancelación del sorteo.' },
                      { error: 'Prometer premios que no puedes entregar', consequence: 'Demandas legales y daño reputacional permanente.' },
                      { error: 'No tener bases claras y públicas', consequence: 'Disputas con participantes y posibles denuncias.' },
                      { error: 'Usar métodos de sorteo manipulables', consequence: 'Pérdida de confianza y acusaciones de fraude.' },
                      { error: 'Ignorar las regulaciones fiscales', consequence: 'Problemas con el SAT y sanciones adicionales.' },
                    ].map((item, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
                        <h4 className="text-red-400 font-bold mb-1">❌ {item.error}</h4>
                        <p className="text-gray-300 text-base">{item.consequence}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-6">
                    Preguntas Frecuentes
                  </h2>
                  
                  <div className="space-y-4">
                    {faqs.map((faq, index) => (
                      <div key={index} className="bg-gray-900/80 rounded-2xl p-6 border border-white/10">
                        <h4 className="text-white font-bold mb-2">{faq.question}</h4>
                        <p className="text-gray-300">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* CTA */}
                <section className="bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20 rounded-3xl p-8 md:p-12 text-center border border-emerald-500/20">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    ¿Listo para crear tu rifa legal?
                  </h3>
                  <p className="text-gray-300 mb-6 max-w-xl mx-auto">
                    Sortavo te ayuda a cumplir con todos los requisitos mientras gestionas tu sorteo 
                    de forma profesional y transparente.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/auth">
                      <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25">
                        <Sparkles className="w-5 h-5 mr-2" />
                        Crear Sorteo Gratis
                      </Button>
                    </Link>
                    <Link to="/pricing">
                      <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Ver Planes Pro
                      </Button>
                    </Link>
                  </div>
                </section>

              </article>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
