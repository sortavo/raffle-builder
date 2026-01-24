import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, ArrowLeft, Clock, TrendingUp, Sparkles, DollarSign, Users, Star, Smartphone, Car, Home, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { useScopedDarkMode } from '@/hooks/useScopedDarkMode';
import { SEOHead, StructuredData, createFAQSchema, createBreadcrumbSchema } from '@/components/seo';

const faqs = [
  {
    question: '¿Cuál es el mejor premio para una rifa pequeña?',
    answer: 'Para rifas de bajo costo ($20-100 por boleto), los premios más efectivos son electrónicos como smartphones, tablets, consolas de videojuegos o gift cards. Son aspiracionales pero accesibles.'
  },
  {
    question: '¿Los premios en efectivo venden más?',
    answer: 'Sí y no. El efectivo tiene alta demanda, pero premios específicos como un iPhone o un viaje generan más emoción y compartidos en redes sociales, lo que aumenta la viralidad.'
  },
  {
    question: '¿Debo mostrar fotos reales del premio?',
    answer: 'Absolutamente. Fotos reales del premio (con tu logo o marca visible) generan 3x más confianza que imágenes genéricas de internet.'
  },
  {
    question: '¿Cuánto debería valer el premio vs lo recaudado?',
    answer: 'Una buena regla es que el premio represente 40-60% del total recaudado. Por ejemplo, si vendes 1000 boletos a $100, el premio podría valer $40,000-60,000 MXN.'
  },
];

const premiosPorCategoria = [
  {
    categoria: 'Tecnología',
    icon: Smartphone,
    gradient: 'from-blue-500 to-cyan-500',
    premios: [
      { nombre: 'iPhone 15 Pro Max', precio: '$25,000 - $35,000', efectividad: 95 },
      { nombre: 'MacBook Air M3', precio: '$28,000 - $38,000', efectividad: 88 },
      { nombre: 'PlayStation 5 + Juegos', precio: '$12,000 - $18,000', efectividad: 85 },
      { nombre: 'Samsung Galaxy S24 Ultra', precio: '$22,000 - $30,000', efectividad: 82 },
      { nombre: 'iPad Pro 12.9"', precio: '$20,000 - $28,000', efectividad: 80 },
    ]
  },
  {
    categoria: 'Vehículos',
    icon: Car,
    gradient: 'from-red-500 to-orange-500',
    premios: [
      { nombre: 'Auto Compacto Nuevo', precio: '$250,000 - $350,000', efectividad: 98 },
      { nombre: 'Motocicleta de Trabajo', precio: '$35,000 - $80,000', efectividad: 90 },
      { nombre: 'Cuatrimoto/ATV', precio: '$80,000 - $150,000', efectividad: 75 },
      { nombre: 'Bicicleta Eléctrica Premium', precio: '$25,000 - $50,000', efectividad: 70 },
    ]
  },
  {
    categoria: 'Experiencias',
    icon: Plane,
    gradient: 'from-purple-500 to-pink-500',
    premios: [
      { nombre: 'Viaje Todo Incluido Cancún', precio: '$30,000 - $60,000', efectividad: 92 },
      { nombre: 'Crucero Caribe 7 días', precio: '$40,000 - $80,000', efectividad: 88 },
      { nombre: 'Experiencia Gourmet + Hotel', precio: '$15,000 - $30,000', efectividad: 75 },
      { nombre: 'Concierto VIP + Viaje', precio: '$20,000 - $50,000', efectividad: 85 },
    ]
  },
  {
    categoria: 'Hogar',
    icon: Home,
    gradient: 'from-emerald-500 to-teal-500',
    premios: [
      { nombre: 'Smart TV 65" 4K', precio: '$15,000 - $25,000', efectividad: 88 },
      { nombre: 'Refrigerador Inverter', precio: '$18,000 - $30,000', efectividad: 72 },
      { nombre: 'Conjunto de Sala', precio: '$20,000 - $40,000', efectividad: 68 },
      { nombre: 'Electrodomésticos Completos', precio: '$30,000 - $50,000', efectividad: 80 },
    ]
  },
];

export default function MejoresPremiosRifas() {
  useScopedDarkMode();

  const breadcrumbs = [
    { name: 'Inicio', url: 'https://sortavo.com/' },
    { name: 'Guías', url: 'https://sortavo.com/guias' },
    { name: 'Mejores Premios para Rifas', url: 'https://sortavo.com/guias/mejores-premios-para-rifas' },
  ];

  const articleSchema = {
    "@type": "Article",
    "headline": "Los Mejores Premios para Rifas que Generan Ventas en 2025",
    "description": "Descubre qué premios atraen más compradores y maximizan tus ventas. Análisis de tendencias, precios y estrategias probadas.",
    "image": "https://sortavo.com/og-guia-premios.png",
    "author": { "@type": "Organization", "name": "Sortavo" },
    "publisher": { "@type": "Organization", "name": "Sortavo", "logo": { "@type": "ImageObject", "url": "https://sortavo.com/logo.png" } },
    "datePublished": "2025-01-01",
    "dateModified": "2026-01-09"
  };

  return (
    <>
      <SEOHead
        title="Los Mejores Premios para Rifas que Generan Ventas 2025"
        description="Descubre qué premios atraen más compradores y maximizan tus ventas. Top premios por categoría con precios y efectividad comprobada."
        canonical="https://sortavo.com/guias/mejores-premios-para-rifas"
        keywords="mejores premios para rifas, qué premio dar en una rifa, premios que venden, ideas premios sorteos"
        type="article"
      />
      <StructuredData data={[articleSchema, createFAQSchema(faqs), createBreadcrumbSchema(breadcrumbs)]} />

      <div className="min-h-screen bg-ultra-dark">
        <PremiumNavbar variant="solid" />

        {/* Hero */}
        <section className="pt-28 pb-16 lg:pt-36 lg:pb-20 bg-gradient-to-b from-amber-900/20 to-transparent">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Link to="/guias" className="inline-flex items-center text-amber-400 hover:text-amber-300 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Guías
              </Link>

              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Estrategia</Badge>
                <div className="flex items-center text-gray-400 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  10 min lectura
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                  Los Mejores Premios
                </span>
                <br />
                <span className="text-white">para Rifas Exitosas</span>
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed">
                El premio correcto puede triplicar tus ventas. Descubre qué premios generan más interés, 
                cuánto invertir y cómo presentarlos para maximizar conversiones.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="max-w-5xl mx-auto px-4">
            
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {[
                { icon: TrendingUp, value: '3.5x', label: 'Más ventas con el premio correcto', color: 'text-emerald-400' },
                { icon: Users, value: '78%', label: 'Prefieren premios específicos vs efectivo', color: 'text-blue-400' },
                { icon: Star, value: '#1', label: 'iPhones: premio más vendedor', color: 'text-amber-400' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-900/80 rounded-2xl p-6 border border-white/10 text-center"
                >
                  <stat.icon className={`w-10 h-10 ${stat.color} mx-auto mb-3`} />
                  <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Premios por Categoría */}
            <h2 className="text-3xl font-bold text-white mb-8">Top Premios por Categoría</h2>
            
            <div className="space-y-12">
              {premiosPorCategoria.map((cat, catIndex) => (
                <motion.div
                  key={cat.categoria}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: catIndex * 0.1 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center`}>
                      <cat.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{cat.categoria}</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cat.premios.map((premio, index) => (
                      <div key={index} className="bg-gray-900/80 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-white font-semibold">{premio.nombre}</h4>
                          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-xs">
                            {premio.efectividad}%
                          </Badge>
                        </div>
                        <div className="flex items-center text-gray-400 text-sm">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {premio.precio} MXN
                        </div>
                        <div className="mt-3 bg-gray-800/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${cat.gradient}`}
                            style={{ width: `${premio.efectividad}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Consejos */}
            <div className="mt-16 bg-gradient-to-r from-amber-600/20 via-orange-500/20 to-amber-600/20 rounded-3xl p-8 border border-amber-500/20">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Gift className="w-8 h-8 text-amber-400" />
                5 Reglas de Oro para Elegir Premios
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  'Elige premios que TÚ desearías ganar',
                  'Muestra fotos REALES del premio',
                  'El premio debe valer 40-60% de lo recaudado',
                  'Prefiere marcas reconocidas (Apple, Samsung)',
                  'Considera tu audiencia: edad, intereses, ubicación',
                ].map((regla, index) => (
                  <div key={index} className="flex items-center gap-3 text-gray-300">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                      {index + 1}
                    </div>
                    {regla}
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-white mb-8">Preguntas Frecuentes</h2>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="bg-gray-900/80 rounded-2xl p-6 border border-white/10">
                    <h4 className="text-white font-bold mb-2">{faq.question}</h4>
                    <p className="text-gray-300">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-16 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">¿Ya elegiste tu premio?</h3>
              <p className="text-gray-300 mb-6">Crea tu sorteo en minutos con Sortavo.</p>
              <Link to="/auth">
                <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Crear Sorteo Gratis
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
