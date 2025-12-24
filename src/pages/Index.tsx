import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Ticket, ArrowRight, Gift, Users, CreditCard, BarChart3, Menu, X, Home, Tag, HelpCircle, FileText } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

export default function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/pricing", label: "Planes y Precios", icon: Tag },
    { to: "/#features", label: "Características", icon: Gift },
    { to: "/terms", label: "Términos", icon: FileText },
    { to: "/privacy", label: "Privacidad", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="text-xl font-extrabold text-foreground">SORTAVO</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-4">
            <Link to="/pricing">
              <Button variant="ghost" size="sm">
                Precios
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button size="sm">
                Registrarse
              </Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden items-center gap-2">
            <Link to="/auth?tab=signup">
              <Button size="sm" className="text-xs px-3">
                Registrarse
              </Button>
            </Link>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-primary" />
                      <span className="font-bold text-foreground">SORTAVO</span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="flex-1 py-4">
                    <div className="space-y-1 px-2">
                      {navLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Icon className="h-5 w-5" />
                            <span>{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auth Buttons */}
                  <div className="p-4 border-t space-y-2">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Iniciar Sesión
                      </Button>
                    </Link>
                    <Link to="/auth?tab=signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">
                        Crear Cuenta Gratis
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            La plataforma #1 para{" "}
            <span className="text-primary">sorteos digitales</span> en Latinoamérica
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Crea sorteos profesionales, vende boletos en línea y gestiona todo desde un solo lugar. 
            Sin complicaciones, sin comisiones por venta.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="w-full sm:w-auto">
                Comenzar gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Ver planes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-card py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Todo lo que necesitas para tus sorteos
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Gift}
              title="Sorteos ilimitados"
              description="Crea tantos sorteos como tu plan permita, con hasta 100,000 boletos cada uno."
            />
            <FeatureCard
              icon={Users}
              title="Gestión de compradores"
              description="Administra a tus compradores, aprueba pagos y envía notificaciones automáticas."
            />
            <FeatureCard
              icon={CreditCard}
              title="Sin comisiones"
              description="Recibe el 100% de tus ventas directamente. Solo pagas una suscripción mensual."
            />
            <FeatureCard
              icon={BarChart3}
              title="Analíticas en tiempo real"
              description="Monitorea tus ventas, conversiones y tráfico con dashboards intuitivos."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            ¿Listo para empezar?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Crea tu cuenta gratis y lanza tu primer sorteo en menos de 5 minutos.
          </p>
          <Link to="/auth?tab=signup">
            <Button size="lg">
              Crear mi cuenta gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-6 transition-shadow hover:shadow-md">
      <Icon className="mb-4 h-8 w-8 text-primary" />
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
