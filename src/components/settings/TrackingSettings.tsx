import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Save,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Code,
} from "lucide-react";
import { toast } from "sonner";
import {
  isValidGTMId,
  isValidMetaPixelId,
  isValidGA4Id,
  isValidTikTokPixelId,
  getValidationMessage,
  generateAllTrackingScripts,
  sanitizeCustomScript,
} from "@/lib/tracking-scripts";

interface TrackingSettingsProps {
  hasVerifiedDomain: boolean;
}

interface TrackingState {
  tracking_enabled: boolean;
  tracking_gtm_id: string;
  tracking_meta_pixel_id: string;
  tracking_ga4_id: string;
  tracking_tiktok_pixel_id: string;
  tracking_custom_scripts: string;
}

export function TrackingSettings({ hasVerifiedDomain }: TrackingSettingsProps) {
  const { organization } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [state, setState] = useState<TrackingState>({
    tracking_enabled: false,
    tracking_gtm_id: "",
    tracking_meta_pixel_id: "",
    tracking_ga4_id: "",
    tracking_tiktok_pixel_id: "",
    tracking_custom_scripts: "",
  });

  const [originalState, setOriginalState] = useState<TrackingState>(state);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!organization?.id) return;

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select(`
            tracking_enabled,
            tracking_gtm_id,
            tracking_meta_pixel_id,
            tracking_ga4_id,
            tracking_tiktok_pixel_id,
            tracking_custom_scripts
          `)
          .eq("id", organization.id)
          .single();

        if (error) throw error;

        const loadedState: TrackingState = {
          tracking_enabled: data.tracking_enabled || false,
          tracking_gtm_id: data.tracking_gtm_id || "",
          tracking_meta_pixel_id: data.tracking_meta_pixel_id || "",
          tracking_ga4_id: data.tracking_ga4_id || "",
          tracking_tiktok_pixel_id: data.tracking_tiktok_pixel_id || "",
          tracking_custom_scripts: data.tracking_custom_scripts || "",
        };

        setState(loadedState);
        setOriginalState(loadedState);
      } catch (error) {
        console.error("Error loading tracking settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [organization?.id]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(state) !== JSON.stringify(originalState);
    setHasChanges(changed);
  }, [state, originalState]);

  const handleChange = (field: keyof TrackingState, value: string | boolean) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          tracking_enabled: state.tracking_enabled,
          tracking_gtm_id: state.tracking_gtm_id.trim() || null,
          tracking_meta_pixel_id: state.tracking_meta_pixel_id.trim() || null,
          tracking_ga4_id: state.tracking_ga4_id.trim() || null,
          tracking_tiktok_pixel_id: state.tracking_tiktok_pixel_id.trim() || null,
          tracking_custom_scripts: state.tracking_custom_scripts.trim() || null,
        })
        .eq("id", organization.id);

      if (error) throw error;

      setOriginalState(state);
      setHasChanges(false);
      toast.success("Configuración de tracking guardada");
    } catch (error) {
      console.error("Error saving tracking settings:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldStatus = (type: "gtm" | "metaPixel" | "ga4" | "tiktok", value: string) => {
    if (!value.trim()) return "empty";
    const validators: Record<string, (v: string) => boolean> = {
      gtm: isValidGTMId,
      metaPixel: isValidMetaPixelId,
      ga4: isValidGA4Id,
      tiktok: isValidTikTokPixelId,
    };
    return validators[type](value) ? "valid" : "invalid";
  };

  const renderFieldBadge = (status: "empty" | "valid" | "invalid") => {
    if (status === "empty") return null;
    if (status === "valid") {
      return (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Válido
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Inválido
      </Badge>
    );
  };

  const previewScripts = generateAllTrackingScripts({
    gtm: state.tracking_gtm_id,
    metaPixel: state.tracking_meta_pixel_id,
    ga4: state.tracking_ga4_id,
    tiktok: state.tracking_tiktok_pixel_id,
    custom: state.tracking_custom_scripts,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Pixels y Tracking
              </CardTitle>
              <CardDescription>
                Agrega tus códigos de seguimiento para medir conversiones
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="tracking-enabled" className="text-sm text-muted-foreground">
                Activado
              </Label>
              <Switch
                id="tracking-enabled"
                checked={state.tracking_enabled}
                onCheckedChange={(checked) => handleChange("tracking_enabled", checked)}
                disabled={!hasVerifiedDomain}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!hasVerifiedDomain && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Configura y verifica un dominio personalizado para habilitar el tracking.
                Los scripts solo se ejecutan en dominios personalizados.
              </AlertDescription>
            </Alert>
          )}

          {hasVerifiedDomain && (
            <Alert variant="default" className="border-blue-200 bg-blue-50/50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Los scripts se inyectan automáticamente cuando los visitantes acceden
                a través de tu dominio personalizado verificado.
              </AlertDescription>
            </Alert>
          )}

          {/* GTM */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="gtm" className="text-sm font-medium">
                Google Tag Manager
              </Label>
              {renderFieldBadge(getFieldStatus("gtm", state.tracking_gtm_id))}
            </div>
            <Input
              id="gtm"
              placeholder="GTM-XXXXXXX"
              value={state.tracking_gtm_id}
              onChange={(e) => handleChange("tracking_gtm_id", e.target.value)}
              disabled={!hasVerifiedDomain}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Recomendado: gestiona todos tus pixels desde GTM
            </p>
            {getValidationMessage("gtm", state.tracking_gtm_id) && (
              <p className="text-xs text-destructive">
                {getValidationMessage("gtm", state.tracking_gtm_id)}
              </p>
            )}
          </div>

          {/* Meta Pixel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="meta-pixel" className="text-sm font-medium">
                Meta Pixel (Facebook/Instagram)
              </Label>
              {renderFieldBadge(getFieldStatus("metaPixel", state.tracking_meta_pixel_id))}
            </div>
            <Input
              id="meta-pixel"
              placeholder="123456789012345"
              value={state.tracking_meta_pixel_id}
              onChange={(e) => handleChange("tracking_meta_pixel_id", e.target.value)}
              disabled={!hasVerifiedDomain}
              className="font-mono text-sm"
            />
            {getValidationMessage("metaPixel", state.tracking_meta_pixel_id) && (
              <p className="text-xs text-destructive">
                {getValidationMessage("metaPixel", state.tracking_meta_pixel_id)}
              </p>
            )}
          </div>

          {/* GA4 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ga4" className="text-sm font-medium">
                Google Analytics 4
              </Label>
              {renderFieldBadge(getFieldStatus("ga4", state.tracking_ga4_id))}
            </div>
            <Input
              id="ga4"
              placeholder="G-XXXXXXXXXX"
              value={state.tracking_ga4_id}
              onChange={(e) => handleChange("tracking_ga4_id", e.target.value)}
              disabled={!hasVerifiedDomain}
              className="font-mono text-sm"
            />
            {getValidationMessage("ga4", state.tracking_ga4_id) && (
              <p className="text-xs text-destructive">
                {getValidationMessage("ga4", state.tracking_ga4_id)}
              </p>
            )}
          </div>

          {/* TikTok */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="tiktok" className="text-sm font-medium">
                TikTok Pixel
              </Label>
              {renderFieldBadge(getFieldStatus("tiktok", state.tracking_tiktok_pixel_id))}
            </div>
            <Input
              id="tiktok"
              placeholder="1234567890123456789"
              value={state.tracking_tiktok_pixel_id}
              onChange={(e) => handleChange("tracking_tiktok_pixel_id", e.target.value)}
              disabled={!hasVerifiedDomain}
              className="font-mono text-sm"
            />
            {getValidationMessage("tiktok", state.tracking_tiktok_pixel_id) && (
              <p className="text-xs text-destructive">
                {getValidationMessage("tiktok", state.tracking_tiktok_pixel_id)}
              </p>
            )}
          </div>

          {/* Custom Scripts */}
          <div className="space-y-2">
            <Label htmlFor="custom-scripts" className="text-sm font-medium">
              Scripts Personalizados
            </Label>
            <Textarea
              id="custom-scripts"
              placeholder="<!-- Hotjar, Clarity, etc. -->"
              value={state.tracking_custom_scripts}
              onChange={(e) => handleChange("tracking_custom_scripts", e.target.value)}
              disabled={!hasVerifiedDomain}
              className="font-mono text-xs min-h-[100px]"
            />
            <Alert variant="default" className="border-amber-200 bg-amber-50/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                Los scripts se sanitizan automáticamente por seguridad.
                Algunos patrones peligrosos serán removidos.
              </AlertDescription>
            </Alert>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!previewScripts.trim()}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Vista Previa
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || !hasVerifiedDomain}
              className="gap-2 sm:ml-auto"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Vista Previa de Scripts
            </DialogTitle>
            <DialogDescription>
              Estos scripts se inyectarán en tu dominio personalizado
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-auto max-h-[50vh]">
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {previewScripts || "No hay scripts configurados"}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(previewScripts);
                toast.success("Scripts copiados al portapapeles");
              }}
              disabled={!previewScripts.trim()}
            >
              Copiar Scripts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
