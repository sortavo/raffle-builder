import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Printer, Trophy, ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export default function TermsOfService() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>Términos y Condiciones | Sortavo</title>
        <meta name="description" content="Términos y condiciones de uso de la plataforma Sortavo para organización de sorteos en línea." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-primary/5">
        {/* Navigation */}
        <nav className="bg-background/80 backdrop-blur-lg border-b border-border sticky top-0 z-50 print:hidden">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SORTAVO
              </span>
            </Link>
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Volver al inicio</span>
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Términos y Condiciones de Uso
              </h1>
              <p className="text-muted-foreground mt-1">
                Última actualización: 24 de diciembre de 2025
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handlePrint} 
              className="print:hidden border-primary/20 hover:bg-primary/5"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>

          {/* Content */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-primary/5 p-8 md:p-12">
            <div className="prose prose-gray max-w-none dark:prose-invert">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  1. Aceptación de los Términos
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Al acceder y utilizar la plataforma Sortavo ("la Plataforma"), usted acepta estar sujeto a estos 
                  Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no podrá 
                  acceder al servicio.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  1.1. Estos términos constituyen un acuerdo legalmente vinculante entre usted y Sortavo.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  1.2. El uso continuado de la Plataforma después de cualquier modificación constituye aceptación 
                  de los nuevos términos.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  2. Descripción del Servicio
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Sortavo es una plataforma tecnológica que permite a organizadores crear, gestionar y ejecutar 
                  sorteos en línea de manera transparente y segura.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  3. Registro y Cuenta de Usuario
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  3.1. Para utilizar ciertas funciones de la Plataforma, debe registrarse y crear una cuenta.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  3.2. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  4-16. Secciones Adicionales
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para ver los términos completos incluyendo responsabilidades, pagos, reembolsos y más,
                  contacte a legal@sortavo.com
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  Información de Contacto
                </h2>
                <div className="bg-primary/5 rounded-xl p-4 space-y-2">
                  <p className="text-foreground"><strong>Email:</strong> legal@sortavo.com</p>
                  <p className="text-foreground"><strong>Dirección:</strong> Ciudad de México, México</p>
                </div>
              </section>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
