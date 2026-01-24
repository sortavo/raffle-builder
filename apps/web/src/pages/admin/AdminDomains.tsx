import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDomainStatus, DomainCheckResult } from "@/hooks/useDomainStatus";
import { RefreshCw, Globe, CheckCircle2, AlertTriangle, XCircle, Clock, Building2, ExternalLink, Wifi, LogOut, ShieldX, ServerCrash, ArrowLeft, Search, Check, X, Shield, Activity, Link2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    vercelToOrgMap,
  } = useDomainStatus({ enabled: isAuthReady });

  const [searchQuery, setSearchQuery] = useState("");
  const [healthPanelOpen, setHealthPanelOpen] = useState(true);

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

  // Determine domain type for Vercel domains
  const getDomainType = (domainName: string): { type: 'platform' | 'whitelabel' | 'wildcard'; label: string; variant: 'default' | 'secondary' | 'outline' } => {
    if (domainName.includes('*')) {
      return { type: 'wildcard', label: 'Wildcard', variant: 'secondary' };
    }
    if (domainName.includes('sortavo') || domainName.includes('vercel')) {
      return { type: 'platform', label: 'Plataforma', variant: 'default' };
    }
    return { type: 'whitelabel', label: 'White-label', variant: 'outline' };
  };

  // Filter domains by search query
  const filteredVercelDomains = useMemo(() => {
    if (!searchQuery.trim()) return vercelDomains;
    const q = searchQuery.toLowerCase();
    return vercelDomains.filter(d => {
      const orgInfo = vercelToOrgMap?.get(d.name);
      return d.name.toLowerCase().includes(q) || 
             orgInfo?.org_name.toLowerCase().includes(q);
    });
  }, [vercelDomains, searchQuery, vercelToOrgMap]);

  const filteredCustomDomains = useMemo(() => {
    if (!searchQuery.trim()) return customDomains;
    const q = searchQuery.toLowerCase();
    return customDomains.filter(d => 
      d.domain.toLowerCase().includes(q) || 
      d.organization_name?.toLowerCase().includes(q)
    );
  }, [customDomains, searchQuery]);

  // Health stats
  const healthStats = useMemo(() => {
    const vercelDomainNames = new Set(vercelDomains.map(d => d.name));
    const customDomainNames = new Set(customDomains.map(d => d.domain));
    
    const syncedToVercel = customDomains.filter(d => d.in_vercel).length;
    const orphanedInVercel = vercelDomains.filter(d => 
      !d.name.includes('*') && 
      !d.name.includes('sortavo') && 
      !d.name.includes('vercel') && 
      !customDomainNames.has(d.name)
    ).length;
    const orphanedInDb = customDomains.filter(d => !d.in_vercel).length;
    const sslActive = customDomains.filter(d => d.ssl_status === 'active').length;
    const sslPending = customDomains.filter(d => d.ssl_status !== 'active').length;
    
    return {
      totalVercel: vercelDomains.length,
      totalCustom: customDomains.length,
      syncedToVercel,
      orphanedInVercel,
      orphanedInDb,
      sslActive,
      sslPending,
    };
  }, [vercelDomains, customDomains]);

  // Tier badge helper
  const TierBadge = ({ tier }: { tier?: string | null }) => {
    if (!tier) return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
    
    const tierConfig: Record<string, { label: string; className: string }> = {
      basic: { label: 'Basic', className: 'bg-gray-500/10 text-gray-600 border-gray-500/30' },
      pro: { label: 'Pro', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
      business: { label: 'Business', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
      enterprise: { label: 'Enterprise', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
    };
    
    const config = tierConfig[tier.toLowerCase()] || tierConfig.basic;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
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

        {/* Health Summary Panel */}
        {!isLoadingDomains && !domainsError && (
          <Collapsible open={healthPanelOpen} onOpenChange={setHealthPanelOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Resumen de Salud</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {healthPanelOpen ? 'Ocultar' : 'Mostrar'}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{healthStats.totalVercel}</p>
                      <p className="text-xs text-muted-foreground">Vercel</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{healthStats.totalCustom}</p>
                      <p className="text-xs text-muted-foreground">Organizaciones</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10">
                      <p className="text-2xl font-bold text-green-600">{healthStats.syncedToVercel}</p>
                      <p className="text-xs text-muted-foreground">Sincronizados</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                      <p className="text-2xl font-bold text-yellow-600">{healthStats.orphanedInVercel}</p>
                      <p className="text-xs text-muted-foreground">Huérfanos Vercel</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-orange-500/10">
                      <p className="text-2xl font-bold text-orange-600">{healthStats.orphanedInDb}</p>
                      <p className="text-xs text-muted-foreground">Sin Vercel</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10">
                      <p className="text-2xl font-bold text-green-600">{healthStats.sslActive}</p>
                      <p className="text-xs text-muted-foreground">SSL Activo</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                      <p className="text-2xl font-bold text-yellow-600">{healthStats.sslPending}</p>
                      <p className="text-xs text-muted-foreground">SSL Pendiente</p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Search Bar */}
        {!isLoadingDomains && !domainsError && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por dominio u organización..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Vercel Domains */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Dominios en Vercel</CardTitle>
                <Badge variant="secondary" className="ml-2">{filteredVercelDomains.length}</Badge>
              </div>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Organización</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Latencia</TableHead>
                    <TableHead>Verificado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVercelDomains.map(domain => {
                    const check = getStatusForDomain(domain.name);
                    const domainType = getDomainType(domain.name);
                    const orgInfo = vercelToOrgMap?.get(domain.name);
                    const isWildcard = domain.name.includes('*');
                    return (
                      <TableRow key={domain.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={isWildcard ? undefined : check?.status} />
                            <span>{domain.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={domainType.variant} className="text-xs">
                            {domainType.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {orgInfo ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link 
                                    to={`/admin/organizations/${orgInfo.org_id}`}
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                  >
                                    {orgInfo.org_name}
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver organización</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Dominios de Organizaciones</CardTitle>
                <Badge variant="secondary" className="ml-2">{filteredCustomDomains.length}</Badge>
              </div>
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
                    <TableHead>Tier</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>En Vercel</TableHead>
                    <TableHead>DNS</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomDomains.map(domain => {
                    const check = getStatusForDomain(domain.domain);
                    // Basic tier should not have custom domains
                    const tierWarning = domain.subscription_tier === 'basic';
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link 
                                  to={`/admin/organizations/${domain.organization_id}`}
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  {domain.organization_name}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{domain.organization_email}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TierBadge tier={domain.subscription_tier} />
                            {tierWarning && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Plan Basic no incluye dominios personalizados</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={check?.status} />
                        </TableCell>
                        <TableCell>
                          {domain.in_vercel ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Sí
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600">
                              <X className="h-3 w-3 mr-1" />
                              No
                            </Badge>
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
