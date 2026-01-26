import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, Clock, TrendingUp, Users, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { PremiumHero } from '@/components/layout/PremiumBackground';
import { useScopedDarkMode } from '@/hooks/useScopedDarkMode';
import { SEOHead, StructuredData, createBreadcrumbSchema } from '@/components/seo';

const guides = [
  {
    slug: 'como-organizar-rifa-legal-mexico',
    title: 'Cómo Organizar una Rifa Legal en México',
    description: 'Guía completa paso a paso para crear sorteos legales, seguros y exitosos. Aprende los requisitos, permisos y mejores prácticas.',
    category: 'Legal',
    readTime: '12 min',
    icon: BookOpen,
    gradient: 'from-emerald-600 to-teal-500',
    featured: true,
  },
  {
    slug: 'mejores-premios-para-rifas',
    title: 'Los Mejores Premios para Rifas que Generan Ventas',
    description: 'Descubre qué premios atraen más compradores y maximizan tus ventas. Análisis de tendencias y estrategias probadas.',
    category: 'Estrategia',
    readTime: '10 min',
    icon: Gift,
    gradient: 'from-amber-500 to-orange-500',
    featured: true,
  },
  {
    slug: 'como-vender-boletos-online',
    title: 'Cómo Vender Boletos de Rifa Online',
    description: 'Aprende las mejores estrategias para vender boletos digitales, promocionar tu sorteo y maximizar conversiones.',
    category: 'Marketing',
    readTime: '15 min',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-pink-500',
    featured: true,
  },
];

const stats = [
  { value: '50,000+', label: 'Sorteos creados' },
  { value: '2M+', label: 'Boletos vendidos' },
  { value: '98%', label: 'Satisfacción' },
];

export default function GuidesIndex() {
  useScopedDarkMode();

  const breadcrumbs = [
    { name: 'Inicio', url: 'https://sortavo.com/' },
    { name: 'Guías', url: 'https://sortavo.com/guias' },
  ];

  return (
    <>
      <SEOHead
        title="Guías para Organizar Sorteos Exitosos"
        description="Aprende a crear rifas legales, elegir los mejores premios y vender boletos online. Guías completas y gratuitas de expertos en sorteos."
        canonical="https://sortavo.com/guias"
        keywords="guías sorteos, cómo organizar rifas, vender boletos online, premios para rifas, sorteos legales méxico"
      />
      <StructuredData data={createBreadcrumbSchema(breadcrumbs)} />

      <div className="min-h-screen bg-ultra-dark">
        <PremiumNavbar variant="solid" />

        {/* Hero Section */}
        <PremiumHero className="pt-28 pb-20 lg:pt-36 lg:pb-28">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Recursos Gratuitos
              </Badge>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6">
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
                  Guías para
                </span>
                <br />
                <span className="text-white">Sorteos Exitosos</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10">
                Aprende de expertos cómo organizar rifas legales, elegir premios que venden 
                y dominar el marketing digital para sorteos.
              </p>

              {/* Stats */}
              <div className="flex justify-center gap-8 md:gap-16">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-gray-400 text-sm md:text-base">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </PremiumHero>

        {/* Guides Grid */}
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {guides.map((guide, index) => (
                <motion.div
                  key={guide.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link
                    to={`/guias/${guide.slug}`}
                    className="group block h-full"
                  >
                    <article className="h-full bg-gray-900/80 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${guide.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <guide.icon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <Badge variant="secondary" className="bg-white/10 text-gray-300 border-white/20">
                            {guide.category}
                          </Badge>
                        </div>
                      </div>

                      <h2 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                        {guide.title}
                      </h2>
                      
                      <p className="text-gray-400 mb-6 leading-relaxed">
                        {guide.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-500 text-sm">
                          <Clock className="w-4 h-4 mr-1" />
                          {guide.readTime} lectura
                        </div>
                        <div className="flex items-center text-emerald-400 font-medium group-hover:gap-2 transition-all">
                          Leer guía
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                ¿Listo para crear tu primer sorteo?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Aplica lo aprendido y lanza tu sorteo en menos de 5 minutos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Comenzar Gratis
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10">
                    Ver Planes
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
