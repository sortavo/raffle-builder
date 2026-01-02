import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Ticket, Users, Settings, Palette, Dices, Zap, Headphones,
  CheckCircle2, ArrowRight, Sparkles, Grid3X3, Heart, Gift,
  QrCode, Trophy, CreditCard, Clock, FileSpreadsheet, FileText,
  Hash, Wand2, Image, Video, Youtube, EyeOff, Shuffle, Calendar,
  Bot, Bell, Mail, MessageCircle, UserCheck, Shield
} from 'lucide-react';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

const categories = [
  {
    icon: Ticket,
    title: 'Capacidad y Escalabilidad',
    description: 'Crece sin límites con nuestra infraestructura empresarial',
    features: [
      { icon: Ticket, name: 'Sorteos activos ilimitados', description: 'Según tu plan, hasta 999 sorteos simultáneos' },
      { icon: Grid3X3, name: 'Hasta 10 millones de boletos', description: 'Escala desde 100 hasta 10M de boletos por sorteo' },
      { icon: Zap, name: 'Dominios personalizados', description: 'Usa tu propio dominio (sorteos.tuempresa.com)' },
    ]
  },
  {
    icon: Users,
    title: 'Experiencia del Comprador',
    description: 'Facilita la compra y aumenta tus conversiones',
    features: [
      { icon: Grid3X3, name: 'Selector visual de números', description: 'Grid interactivo para elegir boletos en tiempo real' },
      { icon: Heart, name: 'Números de la suerte', description: 'Genera números basados en cumpleaños o fechas especiales' },
      { icon: Gift, name: 'Paquetes con bonificación', description: 'Ofrece promociones como compra 2 lleva 3' },
      { icon: QrCode, name: 'Verificador QR 24/7', description: 'Los compradores verifican sus boletos escaneando el código' },
      { icon: Trophy, name: 'Historial de ganadores', description: 'Muestra ganadores anteriores para generar confianza' },
    ]
  },
  {
    icon: Settings,
    title: 'Gestión y Ventas',
    description: 'Automatiza tu operación y maximiza ingresos',
    features: [
      { icon: CreditCard, name: 'Múltiples métodos de pago', description: 'Acepta transferencias, OXXO, PayPal y más' },
      { icon: CheckCircle2, name: 'Flujo de aprobación', description: 'Sistema para revisar y aprobar comprobantes de pago' },
      { icon: Clock, name: 'Recordatorios automáticos', description: 'Envía recordatorios a compradores con pagos pendientes' },
      { icon: FileSpreadsheet, name: 'Exportación Excel/CSV', description: 'Descarga listas de boletos, compradores y ventas' },
      { icon: FileText, name: 'Reportes financieros PDF', description: 'Genera reportes profesionales para tu contabilidad' },
      { icon: Hash, name: 'Numeración personalizada', description: 'Personaliza el formato de numeración de tus boletos' },
    ]
  },
  {
    icon: Palette,
    title: 'Diseño y Marca',
    description: 'Destaca con una imagen profesional',
    features: [
      { icon: Wand2, name: '6 plantillas premium', description: 'Temas visuales profesionales para tu página pública' },
      { icon: Image, name: 'Galería de premios', description: 'Muestra fotos y videos de tus premios' },
      { icon: Youtube, name: 'Link de transmisión', description: 'Agrega el enlace de tu transmisión en vivo' },
      { icon: EyeOff, name: 'Sin marca Sortavo', description: 'Remueve el logo de Sortavo de tu página (Pro+)' },
    ]
  },
  {
    icon: Dices,
    title: 'Métodos de Sorteo',
    description: 'Transparencia y confianza garantizadas',
    features: [
      { icon: UserCheck, name: 'Sorteo manual', description: 'Selecciona el ganador manualmente desde tu dashboard' },
      { icon: Ticket, name: 'Método Lotería Nacional', description: 'Usa los últimos dígitos del premio mayor' },
      { icon: Shuffle, name: 'Sorteo aleatorio seguro', description: 'Criptografía avanzada para máxima transparencia' },
      { icon: Calendar, name: 'Sorteo automático', description: 'Programa el sorteo para ejecutarse automáticamente' },
    ]
  },
  {
    icon: Zap,
    title: 'Integraciones',
    description: 'Conecta con las herramientas que ya usas',
    features: [
      { icon: Bot, name: 'Bot Telegram', description: 'Notificaciones en tiempo real vía Telegram' },
      { icon: Bell, name: 'Notificaciones push', description: 'Alertas instantáneas de reservaciones y pagos' },
    ]
  },
  {
    icon: Headphones,
    title: 'Soporte y Equipo',
    description: 'Siempre estamos para ayudarte',
    features: [
      { icon: Mail, name: 'Soporte por email', description: 'Recibe ayuda por correo electrónico' },
      { icon: MessageCircle, name: 'Soporte WhatsApp', description: 'Contacto directo para atención más rápida' },
      { icon: UserCheck, name: 'Account Manager', description: 'Un ejecutivo asignado a tu organización (Enterprise)' },
      { icon: Shield, name: 'SLA 99.9%', description: 'Garantía de disponibilidad empresarial (Enterprise)' },
    ]
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Features() {
  return (
    <>
      <Helmet>
        <title>Características | Sortavo - Plataforma de Sorteos</title>
        <meta name="description" content="Descubre todas las características de Sortavo: selector visual de boletos, múltiples métodos de pago, notificaciones en tiempo real y más." />
      </Helmet>

      <div className="min-h-screen bg-ultra-dark">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/5 rounded-full blur-[180px]" />
        </div>

        <PremiumNavbar variant="transparent" />

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Plataforma Completa
              </span>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
                Todo lo que necesitas para{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  sorteos exitosos
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-ultra-dark-dimmed max-w-3xl mx-auto mb-10">
                Desde la creación hasta el sorteo final, Sortavo automatiza cada paso para que te enfoques en lo que importa: hacer crecer tu negocio.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" variant="gradient" className="px-8 py-6 text-lg">
                  <Link to="/auth?tab=signup">
                    Comenzar Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-white/20 text-white hover:bg-white/10">
                  <Link to="/pricing">
                    Ver Precios
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        {categories.map((category, categoryIndex) => (
          <section 
            key={category.title}
            className={`relative py-20 lg:py-28 ${categoryIndex % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <category.icon className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{category.title}</h2>
                <p className="text-lg text-ultra-dark-dimmed max-w-2xl mx-auto">{category.description}</p>
              </motion.div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {category.features.map((feature) => (
                  <motion.div
                    key={feature.name}
                    variants={itemVariants}
                    className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                        <feature.icon className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">{feature.name}</h3>
                        <p className="text-sm text-ultra-dark-dimmed leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        ))}

        {/* CTA Section */}
        <section className="relative py-24 lg:py-32">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                ¿Listo para empezar?
              </h2>
              <p className="text-lg text-ultra-dark-dimmed mb-8 max-w-2xl mx-auto">
                Únete a cientos de organizadores que ya confían en Sortavo para sus sorteos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" variant="gradient" className="px-10 py-7 text-xl">
                  <Link to="/auth?tab=signup">
                    Crear Cuenta Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-white/20 text-white hover:bg-white/10">
                  <Link to="/pricing">
                    Comparar Planes
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
