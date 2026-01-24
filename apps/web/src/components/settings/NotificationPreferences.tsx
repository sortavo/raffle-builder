import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Ticket, 
  Clock, 
  CheckCircle2, 
  Trophy, 
  AlertCircle,
  Trash2,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  requestNotificationPermission, 
  getNotificationPermissionStatus 
} from "@/lib/push-notifications";
import { useState, useEffect } from "react";

interface NotificationPreferencesData {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  ticket_sold: boolean;
  payment_pending: boolean;
  payment_approved: boolean;
  raffle_completed: boolean;
  raffle_ending_soon: boolean;
  system_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setBrowserPermission(getNotificationPermissionStatus());
  }, []);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      // Create default preferences if none exist
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferencesData;
      }

      return data as NotificationPreferencesData;
    },
    enabled: !!user?.id
  });

  const updatePreference = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferencesData>) => {
      if (!user?.id) throw new Error('No user');
      
      const { error } = await supabase
        .from('notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences', user?.id] });
      
      const previous = queryClient.getQueryData<NotificationPreferencesData>(
        ['notification-preferences', user?.id]
      );
      
      if (previous) {
        queryClient.setQueryData<NotificationPreferencesData>(
          ['notification-preferences', user?.id],
          { ...previous, ...updates }
        );
      }
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['notification-preferences', user?.id],
          context.previous
        );
      }
      toast.error('Error al actualizar preferencias');
    },
    onSuccess: () => {
      toast.success('Preferencias actualizadas');
    }
  });

  const clearNotifications = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notificaciones limpiadas');
    },
    onError: () => {
      toast.error('Error al limpiar notificaciones');
    }
  });

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    setBrowserPermission(granted ? 'granted' : 'denied');
    
    if (granted) {
      updatePreference.mutate({ push_enabled: true });
      toast.success('Notificaciones push activadas');
    } else {
      toast.error('Permiso de notificaciones denegado');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const notificationTypes = [
    {
      key: 'ticket_sold' as const,
      icon: Ticket,
      label: 'Boleto vendido',
      description: 'Cuando alguien compra un boleto de tus sorteos'
    },
    {
      key: 'payment_pending' as const,
      icon: Clock,
      label: 'Pago pendiente',
      description: 'Cuando se sube un comprobante de pago para aprobar'
    },
    {
      key: 'payment_approved' as const,
      icon: CheckCircle2,
      label: 'Pago aprobado/rechazado',
      description: 'Actualizaciones sobre el estado de pagos'
    },
    {
      key: 'raffle_completed' as const,
      icon: Trophy,
      label: 'Sorteo completado',
      description: 'Cuando finaliza un sorteo y se selecciona ganador'
    },
    {
      key: 'raffle_ending_soon' as const,
      icon: AlertCircle,
      label: 'Sorteo próximo a finalizar',
      description: 'Recordatorio antes de que termine un sorteo'
    },
    {
      key: 'system_notifications' as const,
      icon: Bell,
      label: 'Notificaciones del sistema',
      description: 'Actualizaciones importantes y anuncios'
    }
  ];

  const isAnyChannelEnabled = preferences?.push_enabled || preferences?.email_enabled;

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Preferencias de Notificaciones
          </CardTitle>
          <CardDescription>
            Configura cómo y cuándo quieres recibir notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">Notificaciones por email</p>
                  <p className="text-sm text-muted-foreground break-words">
                    Recibir notificaciones en tu correo electrónico
                  </p>
                </div>
              </div>
              <Switch
                className="shrink-0"
                checked={preferences?.email_enabled ?? true}
                onCheckedChange={(checked) =>
                  updatePreference.mutate({ email_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">Notificaciones push</p>
                  <p className="text-sm text-muted-foreground break-words">
                    Recibir notificaciones en tiempo real en la app
                  </p>
                  {browserPermission === 'denied' && (
                    <p className="text-xs text-destructive mt-1">
                      Permiso denegado en el navegador
                    </p>
                  )}
                </div>
              </div>
              {browserPermission === 'granted' ? (
                <Switch
                  className="shrink-0"
                  checked={preferences?.push_enabled ?? true}
                  onCheckedChange={(checked) =>
                    updatePreference.mutate({ push_enabled: checked })
                  }
                />
              ) : browserPermission !== 'denied' ? (
                <Button size="sm" variant="outline" onClick={handleEnablePush} className="shrink-0">
                  Activar
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled className="shrink-0">
                  Bloqueado
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Individual notification types */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tipos de notificación
            </h4>
            
            {notificationTypes.map((type) => {
              const Icon = type.icon;
              const isEnabled = preferences?.[type.key] ?? true;
              
              return (
                <div
                  key={type.key}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground break-words">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      updatePreference.mutate({ [type.key]: checked })
                    }
                    disabled={!isAnyChannelEnabled}
                  />
                </div>
              );
            })}
            
            {!isAnyChannelEnabled && (
              <p className="text-sm text-muted-foreground text-center py-2 bg-muted/50 rounded-lg">
                Activa al menos un canal (email o push) para recibir notificaciones
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clear notifications */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium">Limpiar notificaciones</p>
              <p className="text-sm text-muted-foreground break-words">
                Eliminar todas las notificaciones leídas
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearNotifications.mutate()}
              disabled={clearNotifications.isPending}
              className="w-full sm:w-auto shrink-0"
            >
              {clearNotifications.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpiar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
