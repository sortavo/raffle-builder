import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import sortavoLogo from '@/assets/sortavo-logo.png';

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

      <div className="min-h-screen bg-gray-950">
        <PremiumNavbar variant="solid" showCTA={false} />

        <div className="max-w-4xl mx-auto px-4 py-28">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Términos y Condiciones de Uso
              </h1>
              <p className="text-gray-400 mt-1">
                Última actualización: 24 de diciembre de 2025
              </p>
            </div>
            <Button variant="outline" onClick={handlePrint} className="print:hidden border-white/20 text-white hover:bg-white/10">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>

          {/* Content */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-8 md:p-12">
            <div className="prose prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">1. Aceptación de los Términos</h2>
                <p className="text-gray-400 leading-relaxed">Al acceder y utilizar la plataforma Sortavo ("la Plataforma"), usted acepta estar sujeto a estos Términos y Condiciones de Uso.</p>
                <p className="text-gray-400 leading-relaxed">1.1. Estos términos constituyen un acuerdo legalmente vinculante entre usted y Sortavo.</p>
                <p className="text-gray-400 leading-relaxed">1.2. El uso continuado de la Plataforma después de cualquier modificación constituye aceptación de los nuevos términos.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">2. Descripción del Servicio</h2>
                <p className="text-gray-400 leading-relaxed">Sortavo es una plataforma tecnológica que permite a organizadores crear, gestionar y ejecutar sorteos en línea de manera transparente y segura.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">3. Registro y Cuenta de Usuario</h2>
                <p className="text-gray-400 leading-relaxed">3.1. Para utilizar ciertas funciones de la Plataforma, debe registrarse y crear una cuenta.</p>
                <p className="text-gray-400 leading-relaxed">3.2. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">4-16. Secciones Adicionales</h2>
                <p className="text-gray-400 leading-relaxed">Para ver los términos completos incluyendo responsabilidades, pagos, reembolsos y más, contacte a legal@sortavo.com</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">Información de Contacto</h2>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-white"><strong>Email:</strong> legal@sortavo.com</p>
                  <p className="text-white"><strong>Dirección:</strong> Ciudad de México, México</p>
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
