import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Printer, Trophy, ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPolicy() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>Política de Privacidad | Sortavo</title>
        <meta name="description" content="Política de privacidad de Sortavo. Conoce cómo recopilamos, usamos y protegemos tu información personal." />
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
                Política de Privacidad
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
                  1. Introducción y Alcance
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  En Sortavo, nos comprometemos a proteger tu privacidad. Esta Política de Privacidad explica 
                  cómo recopilamos, usamos, compartimos y protegemos tu información personal cuando utilizas 
                  nuestra plataforma.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  1.1. Esta política cumple con el Reglamento General de Protección de Datos (GDPR) de la Unión 
                  Europea y la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) 
                  de México.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  1.2. Al utilizar Sortavo, aceptas las prácticas descritas en esta política.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  2. Información que Recopilamos
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Recopilamos los siguientes tipos de información:</p>
                
                <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.1. Información de Cuenta</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Nombre completo</li>
                  <li>Dirección de correo electrónico</li>
                  <li>Número de teléfono</li>
                  <li>Ciudad de residencia</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.2. Información de Pago</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Los datos de pago (tarjetas de crédito/débito) son procesados directamente por Stripe. 
                  Sortavo no almacena información completa de tarjetas.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.3. Información de Participación</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Historial de sorteos en los que participas</li>
                  <li>Boletos comprados</li>
                  <li>Comprobantes de pago subidos</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-3">2.4. Información de Dispositivo</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Dirección IP</li>
                  <li>Tipo de navegador</li>
                  <li>Sistema operativo</li>
                  <li>Páginas visitadas y tiempo de navegación</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-3" id="cookies">2.5. Cookies y Tecnologías Similares</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies para mejorar tu experiencia, analizar el uso de la plataforma y 
                  personalizar contenido. Puedes gestionar tus preferencias de cookies en cualquier momento.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  3. Cómo Usamos tu Información
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos tu información para:</p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>3.1. Proveer el Servicio:</strong> Crear y gestionar tu cuenta, procesar participaciones 
                  en sorteos, y comunicarnos contigo.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>3.2. Procesar Transacciones:</strong> Gestionar pagos, verificar comprobantes y 
                  emitir confirmaciones.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>3.3. Comunicaciones:</strong> Enviar notificaciones sobre sorteos, ganadores, 
                  y actualizaciones importantes.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>3.4. Mejora de la Plataforma:</strong> Analizar el uso para mejorar nuestros servicios 
                  y experiencia de usuario.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>3.5. Cumplimiento Legal:</strong> Cumplir con obligaciones legales y responder a 
                  solicitudes de autoridades.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  4. Base Legal del Procesamiento (GDPR)
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Procesamos tus datos personales bajo las siguientes bases legales:</p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>4.1. Consentimiento:</strong> Para envío de comunicaciones de marketing y uso de 
                  cookies no esenciales.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>4.2. Ejecución de Contrato:</strong> Para proporcionar los servicios que has 
                  solicitado (participación en sorteos, gestión de cuenta).
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>4.3. Obligación Legal:</strong> Para cumplir con leyes fiscales, de prevención 
                  de fraude y otras regulaciones aplicables.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>4.4. Intereses Legítimos:</strong> Para mejorar nuestros servicios, prevenir fraudes 
                  y proteger la seguridad de la plataforma.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  5. Compartir Información
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Compartimos tu información con:</p>
                
                <h3 className="text-lg font-medium text-foreground mt-6 mb-3">5.1. Organizadores de Sorteos</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cuando participas en un sorteo, el organizador recibe tu nombre, email, teléfono y ciudad 
                  para gestionar tu participación y, en caso de ganar, coordinar la entrega del premio.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-3">5.2. Proveedores de Servicios</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li><strong>Stripe:</strong> Procesamiento de pagos</li>
                  <li><strong>Resend:</strong> Envío de correos electrónicos transaccionales</li>
                  <li><strong>Supabase:</strong> Alojamiento y base de datos</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-3">5.3. Autoridades</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Podemos compartir información cuando sea requerido por ley, orden judicial o para 
                  proteger nuestros derechos legales.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  6. Tus Derechos (GDPR)
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Bajo el GDPR, tienes los siguientes derechos:</p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>6.1. Derecho de Acceso:</strong> Solicitar una copia de los datos personales 
                  que tenemos sobre ti.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>6.2. Derecho de Rectificación:</strong> Corregir datos inexactos o incompletos.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>6.3. Derecho de Eliminación:</strong> Solicitar la eliminación de tus datos 
                  personales ("derecho al olvido").
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>6.4. Derecho de Portabilidad:</strong> Recibir tus datos en un formato estructurado 
                  y legible por máquina.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>6.5. Derecho de Oposición:</strong> Oponerte al procesamiento de tus datos para 
                  ciertos fines.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>6.6. Cómo Ejercer tus Derechos:</strong> Envía un correo a privacy@sortavo.com 
                  con tu solicitud. Responderemos en un plazo de 30 días.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  7. Seguridad de Datos
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Implementamos medidas de seguridad técnicas y organizacionales:</p>
                <p className="text-muted-foreground leading-relaxed">7.1. Cifrado de datos en tránsito (TLS/SSL) y en reposo.</p>
                <p className="text-muted-foreground leading-relaxed">7.2. Acceso restringido a datos personales solo al personal autorizado.</p>
                <p className="text-muted-foreground leading-relaxed">7.3. Monitoreo continuo de seguridad y auditorías regulares.</p>
                <p className="text-muted-foreground leading-relaxed">7.4. Copias de seguridad encriptadas y planes de recuperación ante desastres.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  8. Retención de Datos
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  8.1. Conservamos tus datos mientras tengas una cuenta activa o sea necesario para 
                  proporcionarte servicios.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  8.2. Datos de transacciones se conservan según requisitos fiscales y legales 
                  (generalmente 5-7 años).
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  8.3. Puedes solicitar la eliminación de tus datos en cualquier momento, sujeto a 
                  obligaciones legales de retención.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  9. Transferencias Internacionales
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  9.1. Nuestros servidores están ubicados en Estados Unidos (a través de proveedores 
                  como Supabase y Stripe).
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  9.2. Las transferencias de datos fuera de la UE se realizan bajo cláusulas contractuales 
                  estándar aprobadas por la Comisión Europea.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  10. Privacidad de Menores
                </h2>
                <p className="text-muted-foreground leading-relaxed">10.1. Sortavo no está dirigido a menores de 18 años.</p>
                <p className="text-muted-foreground leading-relaxed">10.2. No recopilamos intencionalmente información de menores de edad.</p>
                <p className="text-muted-foreground leading-relaxed">
                  10.3. Si descubrimos que hemos recopilado datos de un menor, los eliminaremos 
                  inmediatamente.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  11. Cambios a esta Política
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  11.1. Podemos actualizar esta política periódicamente. Te notificaremos sobre cambios 
                  significativos por correo electrónico o aviso en la plataforma.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  11.2. Te recomendamos revisar esta política regularmente.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  12. Información de Contacto
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Para cualquier consulta sobre privacidad o para ejercer tus derechos:
                </p>
                <div className="bg-primary/5 rounded-xl p-4 space-y-2">
                  <p className="text-foreground"><strong>Email:</strong> privacy@sortavo.com</p>
                  <p className="text-foreground"><strong>Responsable de Protección de Datos:</strong> dpo@sortavo.com</p>
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
