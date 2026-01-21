import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, Link2, Unlink, Copy, Check, Crown, Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";

interface TelegramConnection {
  id: string;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  display_name: string | null;
  link_code: string | null;
  link_code_expires_at: string | null;
  verified_at: string | null;
  notify_ticket_reserved: boolean;
  notify_payment_proof: boolean;
  notify_payment_approved: boolean;
  notify_payment_rejected: boolean;
  notify_reservation_expired: boolean;
  notify_raffle_ending: boolean;
  notify_daily_summary: boolean;
  daily_summary_hour: number;
  notify_winner_selected: boolean;
}

export function TelegramSettings() {
  const { user, organization } = useAuth();
  const [connections, setConnections] = useState<TelegramConnection[]>([]);
  const [pendingCode, setPendingCode] = useState<{ code: string; expiresAt: string; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const subscriptionTier = (organization?.subscription_tier as SubscriptionTier) || "basic";
  const limits = getSubscriptionLimits(subscriptionTier);
  const hasTelegramAccess = limits.hasTelegramBot;

  useEffect(() => {
    if (organization?.id) {
      fetchConnections();
    }
  }, [organization?.id]);

  const fetchConnections = async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("telegram_connections")
      .select("*")
      .eq("organization_id", organization.id)
      .order("verified_at", { ascending: false, nullsFirst: true });

    if (!error && data) {
      // Separate verified connections from pending ones
      const verified = data.filter(
        (c) => c.verified_at && c.telegram_chat_id && !c.telegram_chat_id.startsWith("pending_")
      );
      const pending = data.find(
        (c) => c.link_code && c.link_code_expires_at && new Date(c.link_code_expires_at) > new Date()
      );

      setConnections(verified as TelegramConnection[]);

      if (pending) {
        setPendingCode({
          code: pending.link_code!,
          expiresAt: pending.link_code_expires_at!,
          id: pending.id,
        });
      } else {
        setPendingCode(null);
      }
    }
    setIsLoading(false);
  };

  const generateLinkCode = async () => {
    if (!organization?.id) return;

    setIsGenerating(true);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Create a NEW pending connection (not upsert)
    const { data, error } = await supabase
      .from("telegram_connections")
      .insert({
        organization_id: organization.id,
        link_code: code,
        link_code_expires_at: expiresAt,
        telegram_chat_id: null, // Will be set when user links via bot
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al generar código");
      console.error("Error generating code:", error);
    } else {
      setPendingCode({ code, expiresAt, id: data.id });
      toast.success("Código generado. Expira en 10 minutos.");
    }
    setIsGenerating(false);
  };

  const copyCode = () => {
    if (pendingCode?.code) {
      navigator.clipboard.writeText(pendingCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Código copiado");
    }
  };

  const cancelPendingCode = async () => {
    if (!pendingCode?.id) return;

    const { error } = await supabase
      .from("telegram_connections")
      .delete()
      .eq("id", pendingCode.id);

    if (!error) {
      setPendingCode(null);
    }
  };

  const unlinkUser = async (connectionId: string, username: string) => {
    const { error } = await supabase
      .from("telegram_connections")
      .delete()
      .eq("id", connectionId);

    if (error) {
      toast.error("Error al desvincular");
    } else {
      setConnections(connections.filter((c) => c.id !== connectionId));
      toast.success(`${username} desvinculado`);
    }
  };

  const updatePreference = async (connectionId: string, field: string, value: boolean) => {
    if (!organization?.id) return;
    setIsSaving(true);

    // Update ALL connections for this organization (shared preferences)
    const { error } = await supabase
      .from("telegram_connections")
      .update({ [field]: value })
      .eq("organization_id", organization.id);

    if (error) {
      toast.error("Error al guardar preferencia");
    } else {
      // Update all connections in local state
      setConnections(
        connections.map((c) => ({ ...c, [field]: value }))
      );
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasTelegramAccess) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Bot de Telegram</CardTitle>
          <CardDescription>
            Recibe notificaciones de ventas y pagos directamente en Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Esta función está disponible en los planes <strong>Premium</strong> y <strong>Enterprise</strong>.
          </p>
          <Button asChild>
            <a href="/pricing">Ver Planes</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Bot de Telegram
              </CardTitle>
              <CardDescription>
                Recibe notificaciones en tiempo real sobre ventas y pagos
              </CardDescription>
            </div>
            {connections.length > 0 && (
              <Badge variant="default" className="bg-green-500">
                <Users className="h-3 w-3 mr-1" />
                {connections.length} conectado{connections.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected Users List */}
          {connections.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Usuarios conectados</Label>
              <div className="space-y-2">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        @{conn.telegram_username || conn.display_name || "Usuario"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desde {new Date(conn.verified_at!).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        unlinkUser(conn.id, conn.telegram_username || "Usuario")
                      }
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New User */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-sm text-muted-foreground">
              {connections.length > 0 ? "Agregar otro usuario" : "Vincular cuenta de Telegram"}
            </Label>

            <Alert>
              <Link2 className="h-4 w-4" />
              <AlertDescription>
                Genera un código y envíalo al bot @Sortavo_bot en Telegram con el comando /vincular
              </AlertDescription>
            </Alert>

            {pendingCode && new Date(pendingCode.expiresAt) > new Date() ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <code className="text-xl sm:text-2xl font-mono font-bold tracking-wider">
                      {pendingCode.code}
                    </code>
                    <Button variant="ghost" size="sm" onClick={copyCode} className="shrink-0">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground sm:ml-auto">
                    Expira en{" "}
                    {Math.ceil((new Date(pendingCode.expiresAt).getTime() - Date.now()) / 60000)} min
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={cancelPendingCode}>
                  Cancelar código
                </Button>
              </div>
            ) : (
              <Button onClick={generateLinkCode} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                {connections.length > 0 ? "Agregar Usuario" : "Generar Código de Vinculación"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences - Show if at least one user connected */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preferencias de Notificación</CardTitle>
            <CardDescription>
              Estas preferencias se aplican a todos los usuarios conectados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Use first connection for preferences display (they share the same prefs) */}
            {(() => {
              const conn = connections[0];
              return (
                <>
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Ventas</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_ticket_reserved">Boletos reservados</Label>
                        <Switch
                          id="notify_ticket_reserved"
                          checked={conn.notify_ticket_reserved}
                          onCheckedChange={(v) =>
                            updatePreference(conn.id, "notify_ticket_reserved", v)
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_reservation_expired">Reservas expiradas</Label>
                        <Switch
                          id="notify_reservation_expired"
                          checked={conn.notify_reservation_expired}
                          onCheckedChange={(v) =>
                            updatePreference(conn.id, "notify_reservation_expired", v)
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Pagos</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_payment_proof">Comprobante recibido</Label>
                        <Switch
                          id="notify_payment_proof"
                          checked={conn.notify_payment_proof}
                          onCheckedChange={(v) =>
                            updatePreference(conn.id, "notify_payment_proof", v)
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_payment_approved">Pago aprobado</Label>
                        <Switch
                          id="notify_payment_approved"
                          checked={conn.notify_payment_approved}
                          onCheckedChange={(v) =>
                            updatePreference(conn.id, "notify_payment_approved", v)
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_payment_rejected">Pago rechazado</Label>
                        <Switch
                          id="notify_payment_rejected"
                          checked={conn.notify_payment_rejected}
                          onCheckedChange={(v) =>
                            updatePreference(conn.id, "notify_payment_rejected", v)
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Sorteos</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_raffle_ending">Sorteo por terminar (24h)</Label>
                        <Switch
                          id="notify_raffle_ending"
                          checked={conn.notify_raffle_ending}
                          onCheckedChange={(v) =>
                            updatePreference(conn.id, "notify_raffle_ending", v)
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_winner_selected">Ganador seleccionado</Label>
                        <Switch
                          id="notify_winner_selected"
                          checked={conn.notify_winner_selected}
                          onCheckedChange={(v) =>
                            updatePreference(conn.id, "notify_winner_selected", v)
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
