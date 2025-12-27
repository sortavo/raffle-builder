import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Download, Loader2, RefreshCw, Trash2 } from "lucide-react";

const LAST_LOGO_URL_KEY = "sortavo_logo_last_url";
const LAST_LOGO_DESC_KEY = "sortavo_logo_last_desc";
const APPROVED_LOGO_URL_KEY = "sortavo_logo_approved_url";

export default function LogoPreview() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [approvedUrl, setApprovedUrl] = useState<string | null>(null);

  useEffect(() => {
    const last = localStorage.getItem(LAST_LOGO_URL_KEY);
    const lastDesc = localStorage.getItem(LAST_LOGO_DESC_KEY);
    const approved = localStorage.getItem(APPROVED_LOGO_URL_KEY);

    if (last) setLogoUrl(last);
    if (lastDesc) setDescription(lastDesc);
    if (approved) setApprovedUrl(approved);
  }, []);

  const transparencyBgStyle = useMemo(() => {
    // Checkerboard background so transparent logos are visible.
    const muted = "hsl(var(--muted))";
    return {
      backgroundImage: `linear-gradient(45deg, ${muted} 25%, transparent 25%),
linear-gradient(-45deg, ${muted} 25%, transparent 25%),
linear-gradient(45deg, transparent 75%, ${muted} 75%),
linear-gradient(-45deg, transparent 75%, ${muted} 75%)`,
      backgroundSize: "32px 32px",
      backgroundPosition: "0 0, 0 16px, 16px -16px, -16px 0px",
    } as const;
  }, []);

  const persistLast = (url: string, desc?: string) => {
    localStorage.setItem(LAST_LOGO_URL_KEY, url);
    localStorage.setItem(LAST_LOGO_DESC_KEY, desc ?? "");
  };

  const clearSaved = () => {
    localStorage.removeItem(LAST_LOGO_URL_KEY);
    localStorage.removeItem(LAST_LOGO_DESC_KEY);
    setLogoUrl(null);
    setDescription("");
    toast.success("Logo borrado de la vista previa");
  };

  const generateLogo = async () => {
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-logo");

      if (error) {
        console.error("Error invoking function:", error);
        toast.error("Error al generar el logo: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (!data?.imageUrl) {
        toast.error("No se recibió imagen del generador");
        return;
      }

      setLogoUrl(data.imageUrl);
      setDescription(data.description || "");
      persistLast(data.imageUrl, data.description);
      toast.success("Logo generado exitosamente");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error inesperado al generar el logo");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLogo = () => {
    if (!logoUrl) {
      toast.error("Primero genera un logo");
      return;
    }

    const link = document.createElement("a");
    link.href = logoUrl;
    link.download = "sortavo-logo.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Logo descargado");
  };

  const approveLogo = () => {
    if (!logoUrl) {
      toast.error("Primero genera (o carga) un logo para poder aprobarlo");
      return;
    }

    localStorage.setItem(APPROVED_LOGO_URL_KEY, logoUrl);
    setApprovedUrl(logoUrl);
    toast.success("Logo aprobado. Cuando me confirmes, lo implemento en todo el proyecto.");
  };

  const isApproved = !!logoUrl && approvedUrl === logoUrl;

  return (
    <>
      <Helmet>
        <title>Vista previa de logo Sortavo | Generador</title>
        <meta
          name="description"
          content="Genera y revisa un logo tipográfico de Sortavo (monocromático, fondo transparente) antes de implementarlo."
        />
        <link rel="canonical" href="/logo-preview" />
      </Helmet>

      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <section className="w-full max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <h1 className="text-2xl font-semibold leading-none tracking-tight">Vista previa de logo Sortavo</h1>
              <CardDescription>
                Estilo tech, monocromático, con <span className="font-medium">fondo transparente</span> (ideal para usar en
                cualquier diseño).
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {isApproved && (
                <div className="rounded-lg border bg-card p-4 text-sm text-card-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>Este logo está marcado como aprobado en esta sesión.</span>
                  </div>
                </div>
              )}

              {/* Preview Area */}
              <div
                className="aspect-video rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden bg-background"
                style={transparencyBgStyle}
              >
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin" />
                    <p>Generando logo con IA...</p>
                    <p className="text-sm">Esto puede tomar unos segundos</p>
                  </div>
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo tipográfico monocromático de Sortavo"
                    className="max-w-full max-h-full object-contain p-6"
                    loading="eager"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg mb-2">Sin logo cargado</p>
                    <p className="text-sm">Haz clic en "Generar logo" para crear uno</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {description && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={generateLogo} disabled={isGenerating} size="lg" className="gap-2">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      {logoUrl ? "Regenerar logo" : "Generar logo"}
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={downloadLogo} size="lg" className="gap-2" disabled={!logoUrl}>
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2"
                  onClick={approveLogo}
                  disabled={!logoUrl || isApproved}
                >
                  <Check className="h-4 w-4" />
                  {isApproved ? "Aprobado" : "Aprobar"}
                </Button>

                <Button variant="ghost" onClick={clearSaved} size="lg" className="gap-2" disabled={!logoUrl && !description}>
                  <Trash2 className="h-4 w-4" />
                  Limpiar
                </Button>
              </div>

              {/* Info */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Características actuales del generador:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Tipografía futurista / tech</li>
                  <li>• Monocromático (negro/grafito)</li>
                  <li>• Fondo transparente (se ve con el patrón de cuadros)</li>
                  <li>• Solo texto “Sortavo”</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
