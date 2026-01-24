import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { useScopedDarkMode } from '@/hooks/useScopedDarkMode';
import { SEOHead } from '@/components/seo';

export default function PrivacyPolicy() {
  useScopedDarkMode();
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <SEOHead
        title="Política de Privacidad"
        description="Política de privacidad de Sortavo. Conoce cómo recopilamos, usamos y protegemos tu información personal."
        noindex={true}
      />

      <div className="min-h-screen bg-ultra-dark">
        <PremiumNavbar variant="solid" showCTA={false} />

        <div className="max-w-4xl mx-auto px-4 py-28">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Política de Privacidad
              </h1>
              <p className="text-white/60 mt-1">Última actualización: 24 de diciembre de 2025</p>
            </div>
            <Button variant="outline" onClick={handlePrint} className="print:hidden border-white/20 text-white hover:bg-white/10">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl shadow-xl border border-white/[0.06] p-8 md:p-12">
            <div className="prose prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">1. Introducción y Alcance</h2>
                <p className="text-white/70 leading-relaxed">En Sortavo, nos comprometemos a proteger tu privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos tu información personal cuando utilizas nuestra plataforma.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">2. Información que Recopilamos</h2>
                <h3 className="text-lg font-medium text-white mt-6 mb-3">2.1. Información de Cuenta</h3>
                <ul className="list-disc list-inside text-white/70 space-y-1">
                  <li>Nombre completo</li>
                  <li>Dirección de correo electrónico</li>
                  <li>Número de teléfono</li>
                  <li>Ciudad de residencia</li>
                </ul>
                <h3 className="text-lg font-medium text-white mt-6 mb-3">2.2. Información de Pago</h3>
                <p className="text-white/70 leading-relaxed">Los datos de pago son procesados directamente por Stripe. Sortavo no almacena información completa de tarjetas.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">3. Cómo Usamos tu Información</h2>
                <p className="text-white/70 leading-relaxed"><strong className="text-white">3.1. Proveer el Servicio:</strong> Crear y gestionar tu cuenta, procesar participaciones en sorteos.</p>
                <p className="text-white/70 leading-relaxed"><strong className="text-white">3.2. Procesar Transacciones:</strong> Gestionar pagos, verificar comprobantes.</p>
                <p className="text-white/70 leading-relaxed"><strong className="text-white">3.3. Comunicaciones:</strong> Enviar notificaciones sobre sorteos y ganadores.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">4. Tus Derechos</h2>
                <p className="text-white/70 leading-relaxed">Tienes derecho a acceder, rectificar, eliminar y portar tus datos personales. Contacta privacy@sortavo.com para ejercer estos derechos.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">Información de Contacto</h2>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-white"><strong>Email:</strong> privacy@sortavo.com</p>
                  <p className="text-white"><strong>DPO:</strong> dpo@sortavo.com</p>
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
