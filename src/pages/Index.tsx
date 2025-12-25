import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Quote
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Zap,
      title: "Configuración Instantánea",
      description: "Crea tu primer sorteo en menos de 5 minutos. Sin complicaciones.",
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      icon: Shield,
      title: "100% Seguro",
      description: "Pagos encriptados y sorteos verificables. Tu confianza es nuestra prioridad.",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: BarChart3,
      title: "Analytics en Tiempo Real",
      description: "Métricas detalladas y reportes profesionales al instante.",
      gradient: "from-blue-400 to-indigo-500"
    },
    {
      icon: Users,
      title: "Gestión de Equipo",
      description: "Colabora con tu equipo con roles y permisos personalizados.",
      gradient: "from-purple-400 to-pink-500"
    },
    {
      icon: Smartphone,
      title: "Optimizado para Móvil",
      description: "Experiencia perfecta en cualquier dispositivo. Diseño responsive.",
      gradient: "from-cyan-400 to-blue-500"
    },
    {
      icon: Headphones,
      title: "Soporte Premium",
      description: "Equipo dedicado listo para ayudarte. Respuesta en minutos.",
      gradient: "from-red-400 to-rose-500"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      role: "Organizadora de Eventos",
      content: "Sortavo transformó la manera en que organizo mis rifas. Ahora todo es más fácil y profesional.",
      rating: 5
    },
    {
      name: "Carlos Mendoza",
      role: "Emprendedor",
      content: "La plataforma más completa que he usado. El soporte es excepcional.",
      rating: 5
    },
    {
      name: "Ana Ramírez",
      role: "Fundadora de ONG",
      content: "Recaudamos más fondos que nunca gracias a la facilidad de uso de Sortavo.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                SORTAVO
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/pricing" className="text-gray-600 hover:text-violet-600 transition-colors font-medium">
                Precios
              </Link>
              <Link to="/auth" className="text-gray-600 hover:text-violet-600 transition-colors font-medium">
                Iniciar Sesión
              </Link>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25"
              >
                Comenzar Gratis
              </Button>
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
                  <Link 
                    to="/pricing" 
                    className="text-lg font-medium text-gray-700 hover:text-violet-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Precios
                  </Link>
                  <Link 
                    to="/auth" 
                    className="text-lg font-medium text-gray-700 hover:text-violet-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Iniciar Sesión
                  </Link>
                  <Button 
                    onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 w-full"
                  >
                    Comenzar Gratis
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Premium Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        </div>

        {/* Floating blob elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left column - Content */}
            <div className="text-center lg:text-left space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-purple-200 shadow-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  Plataforma #1 en México
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Organiza Sorteos
                </span>
                <br />
                <span className="text-gray-900">
                  Como un Profesional
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl lg:text-2xl text-gray-600 max-w-xl">
                La plataforma más completa para gestionar rifas y sorteos. 
                Segura, rápida y fácil de usar.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 py-6">
                <div>
                  <div className="text-3xl font-bold text-gray-900">10K+</div>
                  <div className="text-sm text-gray-600">Sorteos Exitosos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">50K+</div>
                  <div className="text-sm text-gray-600">Usuarios Activos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">98%</div>
                  <div className="text-sm text-gray-600">Satisfacción</div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-xl shadow-violet-500/25 group"
                  onClick={() => navigate('/auth')}
                >
                  Comenzar Gratis
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6 border-2 border-gray-300 hover:border-violet-600 hover:text-violet-600 bg-white/50"
                  onClick={() => navigate('/pricing')}
                >
                  <Play className="mr-2 w-5 h-5" />
                  Ver Demo
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">2,847+</span> organizadores confían en Sortavo
                </div>
              </div>
            </div>

            {/* Right column - Visual */}
            <div className="relative hidden lg:block">
              {/* Floating cards */}
              <div className="absolute -top-4 -left-4 w-64 h-80 bg-white rounded-2xl shadow-2xl p-6 transform rotate-6 hover:rotate-3 transition-transform duration-300 animate-float">
                <div className="space-y-4">
                  <div className="h-4 bg-gradient-to-r from-violet-200 to-indigo-200 rounded w-3/4"></div>
                  <div className="h-32 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <span className="text-4xl">🎟️</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>

              <div className="relative w-80 h-96 bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 mx-auto">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-2 bg-gray-100 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="h-40 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl flex items-center justify-center">
                    <div className="text-6xl">🎯</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                      <div className="h-3 bg-violet-200 rounded w-16"></div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full w-full">
                      <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 w-64 h-80 bg-white rounded-2xl shadow-2xl p-6 transform -rotate-6 hover:-rotate-3 transition-transform duration-300 animate-float animation-delay-2000">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-green-200 rounded w-20"></div>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                    <span className="text-4xl">🏆</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                    <div className="h-2 bg-gray-200 rounded w-4/5"></div>
                    <div className="h-2 bg-gray-200 rounded w-3/5"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}triunfar
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Herramientas profesionales diseñadas para organizadores que buscan resultados
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-violet-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/0 to-indigo-500/0 group-hover:from-violet-500/5 group-hover:to-indigo-500/5 transition-all duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-violet-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}clientes
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Miles de organizadores confían en Sortavo para sus sorteos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow duration-300 relative"
              >
                <Quote className="w-10 h-10 text-violet-200 absolute top-6 right-6" />
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center text-white font-medium">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium CTA Section */}
      <section className="py-24 bg-gradient-to-r from-violet-600 to-indigo-600 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_120%,rgba(255,255,255,0.2),rgba(255,255,255,0))]"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            ¿Listo para crear tu primer sorteo?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Únete a miles de organizadores que ya confían en Sortavo. 
            Comienza gratis hoy mismo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-white text-violet-600 hover:bg-gray-100 shadow-xl group"
              onClick={() => navigate('/auth')}
            >
              Comenzar Ahora
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-6 border-2 border-white/50 text-white hover:bg-white/10 bg-transparent"
              onClick={() => navigate('/pricing')}
            >
              Ver Planes
            </Button>
          </div>
          
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-white/70">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>100% Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Sin compromisos</span>
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              <span>Soporte 24/7</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
