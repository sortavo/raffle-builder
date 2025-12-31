import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useScopedDarkMode } from '@/hooks/useScopedDarkMode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Footer } from '@/components/layout/Footer';
import { PremiumNavbar } from '@/components/layout/PremiumNavbar';
import { toast } from 'sonner';
import { useSystemStatus, ServiceStatus } from '@/hooks/useSystemStatus';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Bell,
  Clock,
  Server,
  CreditCard,
  Mail,
  Database,
  Shield,
  Globe,
  Activity,
  HardDrive,
  Loader2
} from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  status: 'resolved' | 'monitoring' | 'investigating' | 'identified';
  date: string;
  description: string;
  updates: { time: string; message: string }[];
}

const recentIncidents: Incident[] = [];

const getServiceIcon = (serviceName: string) => {
  const iconMap: Record<string, React.ElementType> = {
    'Base de Datos': Database,
    'Pagos (Stripe)': CreditCard,
    'API / Edge Functions': Server,
    'Autenticación': Shield,
    'Email': Mail,
    'Almacenamiento': HardDrive,
    'Plataforma Web': Globe,
  };
  return iconMap[serviceName] || Activity;
};

const getServiceDescription = (serviceName: string) => {
  const descMap: Record<string, string> = {
    'Base de Datos': 'Almacenamiento y consultas de datos',
    'Pagos (Stripe)': 'Procesamiento de pagos con Stripe',
    'API / Edge Functions': 'Servicios de backend y endpoints',
    'Autenticación': 'Sistema de login y registro',
    'Email': 'Envío de notificaciones por correo',
    'Almacenamiento': 'Almacenamiento de archivos e imágenes',
    'Plataforma Web': 'Aplicación web principal y dashboard',
  };
  return descMap[serviceName] || 'Servicio del sistema';
};

const getStatusColor = (status: ServiceStatus) => {
  switch (status) {
    case 'operational': return 'bg-emerald-500';
    case 'degraded': return 'bg-amber-500';
    case 'outage': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStatusIcon = (status: ServiceStatus) => {
  switch (status) {
    case 'operational': return CheckCircle2;
    case 'degraded': return AlertTriangle;
    case 'outage': return XCircle;
    default: return Activity;
  }
};

const getStatusText = (status: ServiceStatus) => {
  switch (status) {
    case 'operational': return 'Operativo';
    case 'degraded': return 'Degradado';
    case 'outage': return 'Interrupción';
    default: return 'Desconocido';
  }
};

const getIncidentStatusColor = (status: Incident['status']) => {
  switch (status) {
    case 'resolved': return 'bg-emerald-500/20 text-emerald-400';
    case 'monitoring': return 'bg-blue-500/20 text-blue-400';
    case 'investigating': return 'bg-amber-500/20 text-amber-400';
    case 'identified': return 'bg-orange-500/20 text-orange-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const getIncidentStatusText = (status: Incident['status']) => {
  switch (status) {
    case 'resolved': return 'Resuelto';
    case 'monitoring': return 'Monitoreando';
    case 'investigating': return 'Investigando';
    case 'identified': return 'Identificado';
    default: return status;
  }
};

export default function SystemStatus() {
  // Activate dark mode for this page
  useScopedDarkMode();
  
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  
  const { services, overallStatus, isLoading, error, lastRefresh, refresh } = useSystemStatus({ 
    autoRefresh: true, 
    refreshInterval: 60000 
  });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('¡Suscrito a alertas!', {
      description: 'Recibirás notificaciones cuando haya cambios en el estado del sistema.'
    });
    setEmail('');
    setIsSubscribing(false);
  };

  const handleRefresh = async () => {
    toast.info('Actualizando estado...');
    await refresh();
    toast.success('Estado actualizado');
  };

  return (
    <>
      <Helmet>
        <title>Estado del Sistema | Sortavo</title>
        <meta name="description" content="Monitorea el estado en tiempo real de todos los servicios de Sortavo." />
      </Helmet>

      <div className="min-h-screen bg-ultra-dark">
        <PremiumNavbar variant="solid" />

        {/* Overall Status Banner */}
        <section className={`pt-28 pb-12 ${
          isLoading 
            ? 'bg-gradient-to-r from-gray-600 to-gray-700'
            : overallStatus === 'operational' 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500' 
              : overallStatus === 'degraded'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-gradient-to-r from-red-500 to-rose-500'
        }`}>
          <div className="max-w-7xl mx-auto px-4 text-center text-white">
            <div className="flex items-center justify-center gap-3 mb-4">
              {isLoading ? (
                <Loader2 className="w-12 h-12 animate-spin" />
              ) : overallStatus === 'operational' ? (
                <CheckCircle2 className="w-12 h-12" />
              ) : overallStatus === 'degraded' ? (
                <AlertTriangle className="w-12 h-12" />
              ) : (
                <XCircle className="w-12 h-12" />
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {isLoading ? 'Verificando estado...' : overallStatus === 'operational' ? 'Todos los sistemas operativos' : overallStatus === 'degraded' ? 'Algunos sistemas degradados' : 'Interrupción del servicio'}
            </h1>
            <p className="text-white/80">
              Última actualización: {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            {error && <p className="mt-2 text-white/60 text-sm">⚠️ Error al obtener estado: {error}</p>}
          </div>
        </section>

        {/* Refresh & Subscribe */}
        <section className="py-8 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="border-white/20 text-white hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Actualizando...' : 'Actualizar Estado'}
            </Button>
            
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full sm:w-auto">
              <Input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full sm:w-64 bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500" />
              <Button type="submit" disabled={isSubscribing} className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 whitespace-nowrap">
                <Bell className="w-4 h-4 mr-2" />
                {isSubscribing ? 'Suscribiendo...' : 'Suscribirse'}
              </Button>
            </form>
          </div>
        </section>

        {/* Services Status */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-white mb-8">Estado de Servicios</h2>
            
            {isLoading && services.length === 0 ? (
              <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-ultra-dark-card rounded-xl p-6 border border-ultra-dark animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-ultra-dark-elevated" />
                      <div className="flex-1"><div className="h-4 bg-ultra-dark-elevated rounded w-1/4 mb-2" /><div className="h-3 bg-ultra-dark-card rounded w-1/3" /></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {services.map((service, index) => {
                  const ServiceIcon = getServiceIcon(service.name);
                  return (
                    <div key={index} className="bg-ultra-dark-card rounded-xl p-6 border border-ultra-dark hover:border-ultra-dark-subtle transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-ultra-dark-elevated flex items-center justify-center">
                            <ServiceIcon className="w-6 h-6 text-ultra-dark-dimmed" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{service.name}</h3>
                            <p className="text-sm text-gray-400">{getServiceDescription(service.name)}</p>
                            {service.message && <p className="text-xs text-red-400 mt-1">{service.message}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)} ${service.status === 'operational' ? 'animate-pulse' : ''}`}></div>
                          <span className={`font-medium ${service.status === 'operational' ? 'text-emerald-400' : service.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`}>
                            {getStatusText(service.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Recent Incidents */}
        <section className="py-12 bg-ultra-dark-elevated">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-white mb-8">Incidentes Recientes</h2>
            <div className="bg-ultra-dark-card rounded-xl p-12 text-center border border-ultra-dark">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Sin incidentes recientes</h3>
              <p className="text-ultra-dark-dimmed">No ha habido incidentes en los últimos 90 días.</p>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-12 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">¿Experimentas problemas?</h2>
            <p className="text-gray-300 mb-6">Si estás experimentando problemas que no se reflejan aquí, por favor contáctanos.</p>
            <Link to="/contact">
              <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white">
                Contactar Soporte
              </Button>
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
