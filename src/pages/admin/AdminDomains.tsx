import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDomainStatus, DomainCheckResult } from "@/hooks/useDomainStatus";
import { RefreshCw, Globe, CheckCircle2, AlertTriangle, XCircle, Clock, Building2, ExternalLink, Wifi, LogOut, ShieldX, ServerCrash, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";

// Error type detection helper
function getErrorType(error: Error | null): 'auth' | 'forbidden' | 'server' | 'unknown' | null {
  if (!error) return null;
  const msg = error.message;
  const status = (error as any).status;
  
  if (msg === 'AUTH_ERROR' || status === 401 || msg?.includes('Missing authorization')) return 'auth';
  if (msg === 'FORBIDDEN' || status === 403) return 'forbidden';
  if (msg === 'SERVER_ERROR' || status >= 500) return 'server';
  if (msg?.includes('non-2xx')) return 'server';
  return 'unknown';
}

export default function AdminDomains() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isPlatformAdmin, isLoading: adminLoading } = useIsPlatformAdmin();
  
  // Only enable domain fetching when auth is fully loaded and user is platform admin
  const isAuthReady = !authLoading && !adminLoading && !!user && isPlatformAdmin;
  
  const {
    vercelDomains,
    customDomains,
    isLoadingDomains,
    domainsError,
    checkResults,
    isChecking,
    checkAllDomains,
    refresh,
  } = useDomainStatus({ enabled: isAuthReady });

  const [autoRefresh, setAutoRefresh] = useState(false);

  // Detect error type
  const errorType = getErrorType(domainsError as Error | null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  // Auto-check on mount (only if no error and auth is ready)
  useEffect(() => {
    if (!isLoadingDomains && !errorType && isAuthReady && vercelDomains.length > 0) {
      checkAllDomains();
    }
  }, [isLoadingDomains, errorType, isAuthReady, vercelDomains.length]);

  // Auto-refresh every 60 seconds (only if no error)
  useEffect(() => {
    if (!autoRefresh || errorType || !isAuthReady) return;
    const interval = setInterval(() => {
      checkAllDomains();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, errorType, isAuthReady]);


  const getStatusForDomain = (domain: string): DomainCheckResult | undefined => {
    return checkResults?.results.find(r => r.domain === domain);
  };

  const StatusIcon = ({ status }: { status?: DomainCheckResult['status'] }) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'slow':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'offline':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />;
    }
  };

  const StatusBadge = ({ status }: { status?: DomainCheckResult['status'] }) => {
    switch (status) {
      case 'online':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Online</Badge>;
      case 'slow':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Lento</Badge>;
      case 'offline':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Offline</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Verificando...</Badge>;
    }
  };

  const summary = checkResults?.summary;

  return (
    <AdminLayout
      title="Estado de Dominios"
      description="Monitoreo de disponibilidad de dominios en la plataforma"
    >
      <div className="space-y-6">
        {/* Summary Banner */}
        <Card className={cn(
          "border-l-4",
          summary?.offline ? "border-l-red-500 bg-red-500/5" :
          summary?.slow ? "border-l-yellow-500 bg-yellow-500/5" :
          summary ? "border-l-green-500 bg-green-500/5" : ""
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-full",
                  summary?.offline ? "bg-red-500/10" :
                  summary?.slow ? "bg-yellow-500/10" : "bg-green-500/10"
                )}>
                  <Wifi className={cn(
                    "h-6 w-6",
                    summary?.offline ? "text-red-500" :
                    summary?.slow ? "text-yellow-500" : "text-green-500"
                  )} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {summary?.offline ? "Algunos dominios están offline" :
                     summary?.slow ? "Algunos dominios están lentos" :
                     summary ? "Todos los dominios operativos" : "Verificando dominios..."}
                  </h3>
                  {summary && (
                    <p className="text-sm text-muted-foreground">
                      {summary.online} online • {summary.slow} lentos • {summary.offline} offline
                    </p>
                  )}
                  {checkResults?.checkedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Última verificación: {new Date(checkResults.checkedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
                  {autoRefresh ? "Auto ON" : "Auto OFF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refresh();
                    setTimeout(checkAllDomains, 500);
                  }}
                  disabled={isChecking}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isChecking && "animate-spin")} />
                  Verificar Ahora
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vercel Domains */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Dominios en Vercel</CardTitle>
            </div>
            <CardDescription>
              Dominios configurados en el proyecto de Vercel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDomains ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : domainsError ? (
              <div className="text-center py-8 space-y-4">
                {errorType === 'auth' ? (
                  <>
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <LogOut className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-amber-600">Tu sesión ha expirado</p>
                      <p className="text-sm text-muted-foreground mt-1">Por favor, inicia sesión de nuevo para continuar.</p>
                    </div>
                    <Button onClick={handleSignOut} variant="default">
                      <LogOut className="h-4 w-4 mr-2" />
                      Volver a iniciar sesión
                    </Button>
                  </>
                ) : errorType === 'forbidden' ? (
                  <>
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <ShieldX className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-red-600">Acceso denegado</p>
                      <p className="text-sm text-muted-foreground mt-1">No tienes permisos de Super Admin para ver esta sección.</p>
                    </div>
                    <Button onClick={handleGoToDashboard} variant="outline">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver al Dashboard
                    </Button>
                  </>
                ) : errorType === 'server' ? (
                  <>
                    <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <ServerCrash className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-orange-600">Error del servidor</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Puede que las credenciales de Vercel no estén configuradas correctamente.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Revisa que los secretos VERCEL_API_TOKEN, VERCEL_PROJECT_ID y VERCEL_TEAM_ID estén configurados.
                      </p>
                    </div>
                    <Button onClick={refresh} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-red-600">Error cargando dominios</p>
                      <p className="text-sm text-muted-foreground mt-1">{(domainsError as Error).message}</p>
                    </div>
                    <Button onClick={refresh} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dominio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Latencia</TableHead>
                    <TableHead>Verificado</TableHead>
                    <TableHead>Redirección</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vercelDomains.map(domain => {
                    const check = getStatusForDomain(domain.name);
                    const isWildcard = domain.name.includes('*');
                    return (
                      <TableRow key={domain.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={isWildcard ? undefined : check?.status} />
                            <span>{domain.name}</span>
                            {isWildcard && (
                              <Badge variant="secondary" className="text-xs">Wildcard</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isWildcard ? (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          ) : (
                            <StatusBadge status={check?.status} />
                          )}
                        </TableCell>
                        <TableCell>
                          {check?.latency ? (
                            <span className={cn(
                              "font-mono text-sm",
                              check.latency < 500 ? "text-green-600" :
                              check.latency < 2000 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {check.latency}ms
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {domain.verified ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">Sí</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pendiente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {domain.redirect ? (
                            <span className="text-sm text-muted-foreground">
                              → {domain.redirect} ({domain.redirectStatusCode})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={`https://${domain.name}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Custom Domains */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Dominios de Organizaciones</CardTitle>
            </div>
            <CardDescription>
              Dominios personalizados configurados por organizaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDomains ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : customDomains.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay dominios personalizados configurados
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dominio</TableHead>
                    <TableHead>Organización</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Latencia</TableHead>
                    <TableHead>DNS</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customDomains.map(domain => {
                    const check = getStatusForDomain(domain.domain);
                    return (
                      <TableRow key={domain.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={check?.status} />
                            <span>{domain.domain}</span>
                            {domain.is_primary && (
                              <Badge variant="secondary" className="text-xs">Principal</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{domain.organization_name}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={check?.status} />
                        </TableCell>
                        <TableCell>
                          {check?.latency ? (
                            <span className={cn(
                              "font-mono text-sm",
                              check.latency < 500 ? "text-green-600" :
                              check.latency < 2000 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {check.latency}ms
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {domain.verified ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">Verificado</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pendiente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            domain.ssl_status === 'active' ? "bg-green-500/10 text-green-600" :
                            domain.ssl_status === 'pending' ? "bg-yellow-500/10 text-yellow-600" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {domain.ssl_status || 'Pendiente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
