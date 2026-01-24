import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Users, 
  Ticket,
  ExternalLink,
  Trash2
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface DemoStatus {
  exists: boolean;
  email: string;
  organizationName: string;
  raffleCount: number;
  slug: string;
}

interface DemoConfig {
  key: string;
  name: string;
  description: string;
  email: string;
  color: string;
  raffles: Array<{
    title: string;
    tickets: number;
    slug: string;
  }>;
}

const DEMO_CONFIGS: DemoConfig[] = [
  {
    key: 'demo1',
    name: 'Sorteos El Dorado',
    description: 'Sorteos premium con Mercedes-Benz, Tech Gamer, Viajes y Canastas',
    email: 'demo1@sortavo.com',
    color: 'bg-amber-500',
    raffles: [
      { title: 'Mercedes-Benz 2027', tickets: 500000, slug: 'mercedes-benz-2027' },
      { title: 'Tech Gamer Festival', tickets: 1000000, slug: 'tech-gamer-festival' },
      { title: 'Viaje Europa 2027', tickets: 5000, slug: 'viaje-europa-2027' },
      { title: 'Canasta Navideña', tickets: 1000, slug: 'canasta-navidena' },
    ],
  },
  {
    key: 'demo2',
    name: 'Fundación Esperanza',
    description: 'Sorteos benéficos con Casa de Playa, Harley, Efectivo y Laptop',
    email: 'demo2@sortavo.com',
    color: 'bg-emerald-500',
    raffles: [
      { title: 'Casa de Playa', tickets: 3000000, slug: 'casa-de-playa' },
      { title: 'Harley-Davidson 2027', tickets: 500000, slug: 'harley-davidson-2027' },
      { title: 'Un Millón en Efectivo', tickets: 2000000, slug: 'millon-en-efectivo' },
      { title: 'Laptop Gamer ASUS', tickets: 25000, slug: 'laptop-gamer-asus' },
    ],
  },
  {
    key: 'demo3',
    name: 'Loterías Premium',
    description: 'Mega sorteos con Mansión, Ferrari, Relojes y Viaje Cancún',
    email: 'demo3@sortavo.com',
    color: 'bg-violet-500',
    raffles: [
      { title: 'MEGA Mansión Los Cabos', tickets: 10000000, slug: 'mega-mansion-los-cabos' },
      { title: 'Ferrari 296 GTB', tickets: 7000000, slug: 'ferrari-296-gtb' },
      { title: 'Relojes de Lujo', tickets: 5000000, slug: 'relojes-de-lujo' },
      { title: 'Viaje Cancún', tickets: 50000, slug: 'viaje-cancun' },
    ],
  },
];

function formatTickets(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(count % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K`;
  }
  return count.toLocaleString();
}

export default function AdminDemos() {
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Check which demos exist
  const { data: demoStatuses, isLoading: checkingStatus } = useQuery({
    queryKey: ['admin-demo-status'],
    queryFn: async () => {
      const statuses: Record<string, DemoStatus> = {};
      
      for (const config of DEMO_CONFIGS) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('slug', config.key)
          .maybeSingle();
        
        if (org) {
          const { count } = await supabase
            .from('raffles')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id);
          
          statuses[config.key] = {
            exists: true,
            email: config.email,
            organizationName: org.name,
            raffleCount: count || 0,
            slug: org.slug,
          };
        } else {
          statuses[config.key] = {
            exists: false,
            email: config.email,
            organizationName: config.name,
            raffleCount: 0,
            slug: config.key,
          };
        }
      }
      
      return statuses;
    },
    refetchInterval: 30000,
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const createDemo = async (demoKey: string) => {
    setLoadingDemo(demoKey);
    addLog(`Iniciando creación de ${demoKey}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-demo-account', {
        body: { demo_key: demoKey },
      });

      if (error) {
        throw error;
      }

      addLog(`✅ ${demoKey} creado exitosamente con ${data.raffles?.length || 0} rifas`);
      toast.success(`Demo ${demoKey} creado exitosamente`);
      queryClient.invalidateQueries({ queryKey: ['admin-demo-status'] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addLog(`❌ Error creando ${demoKey}: ${message}`);
      toast.error(`Error creando demo: ${message}`);
    } finally {
      setLoadingDemo(null);
    }
  };

  const createAllDemos = async () => {
    setLogs([]);
    addLog('Iniciando creación de todas las demos...');
    
    for (const config of DEMO_CONFIGS) {
      await createDemo(config.key);
      // Small delay between demos
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    addLog('🎉 Proceso completado');
  };

  return (
    <AdminLayout
      title="Gestión de Demos"
      description="Crea y administra las cuentas demo de Sortavo"
    >
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={createAllDemos}
            disabled={loadingDemo !== null}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            {loadingDemo ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Crear Todas las Demos
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-demo-status'] })}
            disabled={checkingStatus}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
            Actualizar Estado
          </Button>
        </div>

        {/* Demo Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {DEMO_CONFIGS.map((config) => {
            const status = demoStatuses?.[config.key];
            const isLoading = loadingDemo === config.key;
            
            return (
              <Card key={config.key} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />
                
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    {checkingStatus ? (
                      <Badge variant="outline" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando
                      </Badge>
                    ) : status?.exists ? (
                      <Badge variant="default" className="gap-1 bg-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        No existe
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {config.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{config.email}</span>
                    </div>
                    {status?.exists && (
                      <div className="flex items-center gap-1">
                        <Ticket className="h-4 w-4" />
                        <span>{status.raffleCount} rifas</span>
                      </div>
                    )}
                  </div>

                  {/* Raffles Preview */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Rifas incluidas:</p>
                    <div className="flex flex-wrap gap-1">
                      {config.raffles.map((raffle) => (
                        <Badge 
                          key={raffle.slug} 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0"
                        >
                          {raffle.title} ({formatTickets(raffle.tickets)})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => createDemo(config.key)}
                      disabled={loadingDemo !== null}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : status?.exists ? (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {status?.exists ? 'Recrear' : 'Crear'}
                    </Button>
                    
                    {status?.exists && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a 
                          href={`/${config.key}/${config.raffles[0].slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Logs de Ejecución</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLogs([])}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-md p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Enlaces Rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEMO_CONFIGS.map((config) => (
                <div key={config.key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{config.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {config.raffles.map((raffle) => (
                      <a
                        key={raffle.slug}
                        href={`/${config.key}/${raffle.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {raffle.title}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
