import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { scrollToSection, handleHashScroll } from "@/lib/scroll-utils";
import { useScopedDarkMode } from "@/hooks/useScopedDarkMode";
import { 
  Menu, 
  Sparkles, 
  Trophy, 
  CheckCircle2, 
   
  Zap, 
  Shield, 
  BarChart3, 
  Users, 
  Smartphone, 
  Headphones,
  ArrowRight,
  Star,
  Quote,
  Ticket,
  TrendingUp,
  Clock,
  Gift,
  ChevronRight
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import sortavoLogo from "@/assets/sortavo-logo.png";

const Index = () => {
  // Activate dark mode for this page
  useScopedDarkMode();
  
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleHashScroll(); // Handle initial hash scroll
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Zap,
      title: "Lanza en Minutos",
      description: "Configura tu sorteo completo en menos de 5 minutos. Interfaz intuitiva sin curva de aprendizaje.",
      color: "from-emerald-600 to-teal-500"
    },
    {
      icon: Shield,
      title: "Blindaje Total",
      description: "Pagos encriptados, sorteos verificables y auditoría completa. Tu confianza es nuestra obsesión.",
      color: "from-amber-500 to-yellow-500"
    },
    {
      icon: BarChart3,
      title: "Insights en Vivo",
      description: "Métricas en tiempo real, reportes automáticos y análisis predictivo para maximizar ventas.",
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: Users,
      title: "Equipo Unido",
      description: "Colabora con roles personalizados, permisos granulares y actividad en tiempo real.",
      color: "from-teal-500 to-emerald-600"
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Experiencia nativa en cualquier dispositivo. Tus compradores compran desde donde quieran.",
      color: "from-amber-600 to-orange-500"
    },
    {
      icon: Headphones,
      title: "Soporte VIP",
      description: "Equipo dedicado con respuesta en minutos. Nunca estarás solo.",
      color: "from-emerald-600 to-teal-600"
    }
  ];

  const stats = [
    { value: "10K+", label: "Sorteos Exitosos", icon: Trophy },
    { value: "50K+", label: "Usuarios Activos", icon: Users },
    { value: "98%", label: "Satisfacción", icon: Star },
    { value: "24/7", label: "Soporte", icon: Headphones }
  ];

  const testimonials = [
    {
      name: "María González",
      role: "Organizadora de Eventos",
      company: "EventosMX",
      content: "Sortavo transformó completamente mi negocio. Ahora organizo 3x más rifas con la mitad del esfuerzo.",
      rating: 5,
      image: "M"
    },
    {
      name: "Carlos Mendoza",
      role: "CEO",
      company: "RifasPro",
      content: "La plataforma más profesional que he usado. El ROI fue inmediato desde el primer sorteo.",
      rating: 5,
      image: "C"
    },
    {
      name: "Ana Ramírez",
      role: "Directora",
      company: "Fundación Esperanza",
      content: "Recaudamos 40% más que antes. La transparencia genera confianza en nuestros donantes.",
      rating: 5,
      image: "A"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Crea tu Sorteo",
      description: "Define premios, boletos y personaliza tu página en minutos.",
      icon: Gift
    },
    {
      number: "02",
      title: "Comparte y Vende",
      description: "Difunde en redes sociales y recibe pagos automáticamente.",
      icon: TrendingUp
    },
    {
      number: "03",
      title: "Sortea y Celebra",
      description: "Realiza el sorteo en vivo y notifica al ganador al instante.",
      icon: Trophy
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Premium Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-card/90 backdrop-blur-xl border-b border-border shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src={sortavoLogo} 
                alt="Sortavo" 
                className="h-8 lg:h-10 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <a 
                href="#features" 
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('features');
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors font-medium rounded-lg hover:bg-white/10 cursor-pointer"
              >
                Características
              </a>
              <Link 
                to="/pricing" 
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors font-medium rounded-lg hover:bg-white/10"
              >
                Precios
              </Link>
              <Link 
                to="/help" 
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors font-medium rounded-lg hover:bg-white/10"
              >
                Ayuda
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="font-medium text-gray-200 hover:text-white hover:bg-white/10">
                  Iniciar Sesión
                </Button>
              </Link>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-medium"
              >
                Comenzar Gratis
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="relative text-gray-200 hover:text-white hover:bg-white/10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-card">
                <div className="flex flex-col gap-6 mt-8">
                  <a 
                    href="#features" 
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('features', () => setMobileMenuOpen(false));
                    }}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Características
                  </a>
                  <Link 
                    to="/pricing" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Precios
                  </Link>
                  <Link 
                    to="/help" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Ayuda
                  </Link>
                  <hr className="border-border" />
                  <Link 
                    to="/auth" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Iniciar Sesión
                  </Link>
                  <Button 
                    onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                    className="bg-primary hover:bg-primary/90 w-full"
                  >
                    Comenzar Gratis
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section - TIER S: Premium Black & Emerald */}
      <section className="relative min-h-screen flex items-center pt-20 lg:pt-0 overflow-hidden">
        {/* Premium Multi-Layer Background */}
        <div className="absolute inset-0 bg-premium-hero" />
        
        {/* 6 Animated orbs - TIER S: Stripe/Linear level with 120px blur */}
        <div className="absolute top-[10%] -left-[10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-[5%] -right-[15%] w-[500px] h-[500px] bg-amber-500/12 rounded-full blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-teal-500/15 rounded-full blur-[120px] animate-blob animation-delay-4000" />
        <div className="absolute bottom-[30%] right-[10%] w-[350px] h-[350px] bg-violet-500/10 rounded-full blur-[120px] animate-blob animation-delay-1000" />
        <div className="absolute bottom-[10%] left-[5%] w-[350px] h-[350px] bg-emerald-500/15 rounded-full blur-[120px] animate-blob animation-delay-500" />
        <div className="absolute top-[60%] right-[30%] w-[300px] h-[300px] bg-teal-400/10 rounded-full blur-[120px] animate-blob animation-delay-300" />
        
        {/* Grid pattern overlay - premium 64px */}
        <div className="absolute inset-0 bg-grid-premium" />
        
        {/* Noise texture for depth */}
        <div className="absolute inset-0 noise-texture" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left column - Content */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left space-y-8"
            >
              {/* Badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/20"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">
                  Plataforma #1 en México
                </span>
              </motion.div>

              {/* Headline - TIER S: DRAMATIC PREMIUM TYPOGRAPHY */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black leading-[0.85] tracking-[-0.05em]">
                <span className="text-gradient-premium">Sorteos que </span>
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                    Enamoran
                  </span>
                  <svg className="absolute -bottom-1 lg:-bottom-2 left-0 w-full h-2 lg:h-3 text-emerald-500/40" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                </span>
              </h1>

              {/* Subheadline - Enhanced with better contrast */}
              <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-white/50 max-w-2xl mx-auto lg:mx-0 leading-snug tracking-tight">
                La plataforma más potente para gestionar rifas y sorteos. 
                <span className="text-white font-semibold"> Segura, rápida y hermosa.</span>
              </p>

              {/* CTAs */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button 
                  size="lg" 
                  variant="gradient"
                  className="text-lg lg:text-xl px-10 py-7 shadow-2xl shadow-emerald-600/30 group border-0 hover:shadow-3xl hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all duration-300"
                  onClick={() => navigate('/auth')}
                >
                  Comenzar Gratis
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg lg:text-xl px-10 py-7 border-2 border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 bg-white/5 backdrop-blur-sm text-white hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-300"
                  onClick={() => navigate('/pricing')}
                >
                  <Sparkles className="mr-2 w-6 h-6" />
                  Ver Planes
                </Button>
              </motion.div>

              {/* Stats inline - TIER S PREMIUM */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-4 gap-6 pt-10 border-t border-white/10"
              >
                {stats.map((stat, index) => (
                  <motion.div 
                    key={index} 
                    className="text-center lg:text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-[-0.03em] group-hover:text-emerald-400 transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/40 mt-2">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right column - Visual */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              {/* Main card */}
              <div className="relative">
                {/* Glow effect - emerald and gold */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600/20 via-amber-500/10 to-emerald-600/20 rounded-3xl blur-2xl opacity-60" />
                
                {/* Dashboard mockup */}
                <div className="relative bg-ultra-dark-elevated rounded-2xl shadow-2xl border border-ultra-dark overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-800/50 px-6 py-4 border-b border-white/10 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    <span className="ml-4 text-sm text-gray-300 font-medium">sortavo.app/mi-rifa</span>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white">iPhone 15 Pro Max</h3>
                        <p className="text-sm text-gray-300">256GB - Titanio Negro</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-full border border-emerald-500/20">
                        Activo
                      </span>
                    </div>
                    
                    <div className="relative h-40 bg-gradient-to-br from-emerald-600/10 to-amber-500/5 rounded-xl flex items-center justify-center overflow-hidden border border-white/5">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
                      <span className="text-7xl">📱</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Progreso de venta</span>
                        <span className="font-semibold text-white">847/1000</span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "85%" }}
                          transition={{ duration: 1.5, delay: 0.8 }}
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-white/5">
                        <p className="text-xs text-gray-400">Recaudado</p>
                        <p className="text-lg font-bold text-amber-400">$84,700</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-white/5">
                        <p className="text-xs text-gray-400">Fecha sorteo</p>
                        <p className="text-lg font-bold text-white">15 Ene</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating notification card */}
                <motion.div 
                  initial={{ opacity: 0, x: 20, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 1 }}
                  className="absolute -right-8 top-1/4 bg-gray-900 rounded-xl shadow-xl border border-white/10 p-4 max-w-[200px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">¡Nueva venta!</p>
                      <p className="text-xs text-gray-400">Hace 2 min</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating stats card */}
                <motion.div 
                  initial={{ opacity: 0, x: -20, y: -20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="absolute -left-8 bottom-1/4 bg-gray-900 rounded-xl shadow-xl border border-white/10 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">+23% esta semana</p>
                      <p className="text-xs text-gray-400">Ventas</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2"
        >
          <span className="text-xs text-gray-400">Descubre más</span>
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </motion.div>
        </motion.div>
      </section>

      {/* How it Works - TIER S Premium with contrasting background */}
      <section className="py-28 lg:py-36 xl:py-44 relative overflow-hidden">
        {/* Contrasting emerald gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-emerald-900/30 to-teal-950/40" />
        
        {/* Subtle orbs for this section */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-teal-500/8 rounded-full blur-[80px]" />
        
        {/* Grid pattern with higher visibility */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        {/* Top and bottom border glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        
        {/* Noise texture */}
        <div className="absolute inset-0 noise-texture" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20 lg:mb-24"
          >
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/15 backdrop-blur-sm rounded-full text-emerald-400 text-sm font-semibold mb-8 border border-emerald-500/20">
              <Clock className="w-4 h-4" />
              Simple y Rápido
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-6 tracking-[-0.03em]">
              3 Pasos para el{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Éxito</span>
            </h2>
            <p className="text-xl lg:text-2xl text-white/50 max-w-2xl mx-auto">
              Desde la idea hasta el sorteo en minutos. Sin complicaciones.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative group"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-20 left-[60%] w-[80%] h-px bg-gradient-to-r from-emerald-500/30 to-transparent" />
                )}
                
                <div className="relative bg-white/[0.03] backdrop-blur-sm rounded-2xl p-10 border border-white/[0.08] hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all duration-300 hover-glow">
                  {/* Step number */}
                  <span className="absolute -top-5 -left-3 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-xl shadow-emerald-500/30">
                    {step.number}
                  </span>
                  
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed text-lg">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - TIER S Premium Grid */}
      <section id="features" className="py-32 lg:py-40 xl:py-48 relative scroll-mt-20 overflow-hidden">
        {/* Ultra-dark background */}
        <div className="absolute inset-0 bg-ultra-dark" />
        
        {/* Subtle orbs */}
        <div className="absolute top-1/4 -right-[10%] w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -left-[10%] w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-premium" />
        
        {/* Noise texture */}
        <div className="absolute inset-0 noise-texture" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20 lg:mb-28"
          >
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 backdrop-blur-sm rounded-full text-amber-400 text-sm font-semibold mb-8 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
              Funcionalidades
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-6 tracking-[-0.03em]">
              Todo para{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Triunfar</span>
            </h2>
            <p className="text-xl lg:text-2xl text-white/50 max-w-2xl mx-auto">
              Herramientas profesionales para organizadores que buscan resultados extraordinarios.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-white/[0.03] backdrop-blur-xl rounded-2xl p-10 lg:p-12 border border-white/[0.08] hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all duration-300 hover-glow"
              >
                {/* TIER S: w-24 h-24 icon container */}
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-2xl`}>
                  <feature.icon className="w-12 h-12 text-white" />
                </div>
                
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-5 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-white/60 leading-relaxed text-lg lg:text-xl">
                  {feature.description}
                </p>
                
                <div className="mt-10 flex items-center text-emerald-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm">Saber más</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Social Proof Section - TIER S: WHITE CONTRAST */}
      <section className="py-28 lg:py-36 xl:py-44 relative overflow-hidden">
        {/* Dramatic white/emerald gradient - CONTRAST with dark sections */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-emerald-50/50 to-white" />
        
        {/* Subtle emerald orbs for depth */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-400/8 rounded-full blur-[100px]" />
        
        {/* Grid pattern - subtle on light bg */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20 lg:mb-24"
          >
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 backdrop-blur-sm rounded-full text-emerald-600 text-sm font-semibold mb-8 border border-emerald-500/20">
              <Star className="w-4 h-4 fill-current" />
              Lo Que Dicen
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 mb-6 tracking-[-0.03em]">
              Amados por{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Miles</span>
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-2xl mx-auto">
              Organizadores reales compartiendo sus experiencias reales.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative bg-white rounded-2xl p-10 border border-gray-200/80 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group"
              >
                <Quote className="absolute top-8 right-8 w-12 h-12 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors" />
                
                <div className="flex gap-1 mb-8">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                
                <p className="text-gray-700 leading-relaxed mb-10 text-lg">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/20">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                    <div className="text-gray-500">{testimonial.role} · {testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section - Premium Emerald */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,rgba(255,255,255,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(212,160,22,0.2),transparent_50%)]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6">
            ¿Listo para Despegar?
          </h2>
          <p className="text-lg lg:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Únete a miles de organizadores exitosos. 
            <span className="text-white font-semibold"> Empieza gratis hoy.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-white text-emerald-700 hover:bg-white/90 shadow-xl shadow-black/20 group"
              onClick={() => navigate('/auth')}
            >
              Crear Mi Primer Sorteo
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-6 border-2 border-white/30 text-white hover:bg-white/10 bg-transparent"
              onClick={() => navigate('/pricing')}
            >
              Ver Planes
            </Button>
          </div>
          
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">100% Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Sin tarjeta de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Configura en 5 min</span>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
