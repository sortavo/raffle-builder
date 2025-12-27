import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { 
  Menu, 
  Sparkles, 
  Trophy, 
  CheckCircle2, 
  Play, 
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

const Index = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Zap,
      title: "Lanza en Minutos",
      description: "Configura tu sorteo completo en menos de 5 minutos. Interfaz intuitiva sin curva de aprendizaje.",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: Shield,
      title: "Blindaje Total",
      description: "Pagos encriptados, sorteos verificables y auditoría completa. Tu confianza es nuestra obsesión.",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: BarChart3,
      title: "Insights en Vivo",
      description: "Métricas en tiempo real, reportes automáticos y análisis predictivo para maximizar ventas.",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: Users,
      title: "Equipo Unido",
      description: "Colabora con roles personalizados, permisos granulares y actividad en tiempo real.",
      color: "from-purple-500 to-violet-600"
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Experiencia nativa en cualquier dispositivo. Tus compradores compran desde donde quieran.",
      color: "from-pink-500 to-rose-600"
    },
    {
      icon: Headphones,
      title: "Soporte VIP",
      description: "Equipo dedicado con respuesta en minutos. Nunca estarás solo.",
      color: "from-cyan-500 to-blue-600"
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
              <div className="relative w-10 h-10 lg:w-12 lg:h-12">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300" />
                <div className="relative w-full h-full bg-gradient-to-br from-primary to-primary/90 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                  <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" />
                </div>
              </div>
              <span className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
                SORTAVO
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Link 
                to="/#features" 
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50"
              >
                Características
              </Link>
              <Link 
                to="/pricing" 
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50"
              >
                Precios
              </Link>
              <Link 
                to="/help" 
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50"
              >
                Ayuda
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="font-medium">
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
                <Button variant="ghost" size="icon" className="relative">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-card">
                <div className="flex flex-col gap-6 mt-8">
                  <Link 
                    to="/#features" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Características
                  </Link>
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

      {/* Hero Section - Premium */}
      <section className="relative min-h-screen flex items-center pt-20 lg:pt-0 overflow-hidden">
        {/* Premium Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

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
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  Plataforma #1 en México
                </span>
              </motion.div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight">
                <span className="text-foreground">Sorteos que </span>
                <span className="relative">
                  <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                    Enamoran
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                La plataforma más potente para gestionar rifas y sorteos. 
                <span className="text-foreground font-medium"> Segura, rápida y hermosa.</span>
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
                  className="text-base lg:text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25 group"
                  onClick={() => navigate('/auth')}
                >
                  Comenzar Gratis
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base lg:text-lg px-8 py-6 border-2 border-border hover:border-primary hover:bg-primary/5 bg-card/50 backdrop-blur-sm"
                  onClick={() => {
                    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Play className="mr-2 w-5 h-5" />
                  Ver Demo
                </Button>
              </motion.div>

              {/* Stats inline */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-4 gap-4 pt-8 border-t border-border/50"
              >
                {stats.map((stat, index) => (
                  <div key={index} className="text-center lg:text-left">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {stat.label}
                    </div>
                  </div>
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
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-3xl blur-2xl opacity-60" />
                
                {/* Dashboard mockup */}
                <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
                  {/* Header */}
                  <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                    <span className="ml-4 text-sm text-muted-foreground font-medium">sortavo.app/mi-rifa</span>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">iPhone 15 Pro Max</h3>
                        <p className="text-sm text-muted-foreground">256GB - Titanio Negro</p>
                      </div>
                      <span className="px-3 py-1 bg-success/10 text-success text-sm font-medium rounded-full">
                        Activo
                      </span>
                    </div>
                    
                    <div className="relative h-40 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
                      <span className="text-7xl">📱</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progreso de venta</span>
                        <span className="font-semibold text-foreground">847/1000</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "85%" }}
                          transition={{ duration: 1.5, delay: 0.8 }}
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Recaudado</p>
                        <p className="text-lg font-bold text-foreground">$84,700</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Fecha sorteo</p>
                        <p className="text-lg font-bold text-foreground">15 Ene</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating notification card */}
                <motion.div 
                  initial={{ opacity: 0, x: 20, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 1 }}
                  className="absolute -right-8 top-1/4 bg-card rounded-xl shadow-xl border border-border p-4 max-w-[200px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">¡Nueva venta!</p>
                      <p className="text-xs text-muted-foreground">Hace 2 min</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating stats card */}
                <motion.div 
                  initial={{ opacity: 0, x: -20, y: -20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="absolute -left-8 bottom-1/4 bg-card rounded-xl shadow-xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">+23% esta semana</p>
                      <p className="text-xs text-muted-foreground">Ventas</p>
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
          <span className="text-xs text-muted-foreground">Descubre más</span>
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-border flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </motion.div>
        </motion.div>
      </section>

      {/* How it Works - Premium */}
      <section className="py-24 lg:py-32 bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-card" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 lg:mb-20"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-semibold mb-6">
              <Clock className="w-4 h-4" />
              Simple y Rápido
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              3 Pasos para el{" "}
              <span className="text-primary">Éxito</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-border to-transparent" />
                )}
                
                <div className="relative bg-background rounded-2xl p-8 border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                  {/* Step number */}
                  <span className="absolute -top-4 -left-4 w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shadow-primary/25">
                    {step.number}
                  </span>
                  
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Premium Grid */}
      <section id="features" className="py-24 lg:py-32 bg-background relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 lg:mb-20"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full text-secondary text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Funcionalidades
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Todo para{" "}
              <span className="text-primary">Triunfar</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Herramientas profesionales para organizadores que buscan resultados extraordinarios.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-card rounded-2xl p-8 border border-border hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="mt-6 flex items-center text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm">Saber más</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section - Premium */}
      <section id="demo" className="py-24 lg:py-32 bg-gradient-to-br from-foreground via-foreground/95 to-foreground relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.3),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_100%_100%,rgba(249,115,22,0.2),transparent)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Content */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-center lg:text-left"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 mb-6">
                <Play className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-white/80">Demo Interactiva</span>
              </span>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Mira el{" "}
                <span className="text-primary">Poder</span>
                <br />en Acción
              </h2>
              
              <p className="text-lg text-white/70 mb-8 max-w-lg">
                Descubre lo fácil que es crear y gestionar sorteos profesionales con Sortavo. 
                Sin curva de aprendizaje.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  "Crea tu sorteo en menos de 5 minutos",
                  "Comparte por WhatsApp y redes sociales",
                  "Recibe pagos de forma automática",
                  "Sortea ganadores con total transparencia"
                ].map((item, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 text-white/80"
                  >
                    <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
              
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-white text-foreground hover:bg-white/90 shadow-xl group"
                onClick={() => navigate('/auth')}
              >
                Probar Gratis
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
            
            {/* Video Preview */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2 shadow-2xl">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
                  
                  {/* Play button */}
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl group"
                  >
                    <Play className="w-8 h-8 text-primary ml-1" />
                  </motion.button>
                  
                  {/* Live indicator */}
                  <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-white">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      En vivo
                    </span>
                  </div>
                  
                  <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
                    2:34
                  </div>
                </div>
              </div>
              
              {/* Decorative blurs */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-secondary/30 rounded-full blur-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Premium */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-background via-card to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 lg:mb-20"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-warning/10 rounded-full text-warning text-sm font-semibold mb-6">
              <Star className="w-4 h-4 fill-current" />
              Testimonios
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Amados por{" "}
              <span className="text-primary">Miles</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Organizadores reales compartiendo sus experiencias reales.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative bg-card rounded-2xl p-8 border border-border hover:shadow-xl transition-all duration-300"
              >
                <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10" />
                
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                
                <p className="text-foreground leading-relaxed mb-8">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role} · {testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section - Premium */}
      <section className="py-24 lg:py-32 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,rgba(255,255,255,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(249,115,22,0.3),transparent_50%)]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-primary-foreground mb-6">
            ¿Listo para Despegar?
          </h2>
          <p className="text-lg lg:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Únete a miles de organizadores exitosos. 
            <span className="text-primary-foreground font-semibold"> Empieza gratis hoy.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-white text-primary hover:bg-white/90 shadow-xl group"
              onClick={() => navigate('/auth')}
            >
              Crear Mi Primer Sorteo
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-6 border-2 border-white/30 text-primary-foreground hover:bg-white/10 bg-transparent"
              onClick={() => navigate('/pricing')}
            >
              Ver Planes
            </Button>
          </div>
          
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-primary-foreground/70">
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
