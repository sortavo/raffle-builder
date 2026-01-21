/**
 * C10 GDPR Data Portability - Privacy Settings UI
 * Allows users to export their data per GDPR Art. 20
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, Shield, FileText, AlertCircle } from "lucide-react";

export function PrivacySettings() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("export-user-data");
      
      if (error) throw error;
      
      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sortavo-data-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Datos exportados correctamente");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al exportar datos. Intenta de nuevo.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Data Export Section */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="p-3 sm:p-4 lg:p-6 pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <Download className="h-5 w-5" />
            Exportar mis Datos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Descarga una copia de todos tus datos personales (GDPR Art. 20)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-4">
          <Alert className="bg-muted/50">
            <FileText className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Tu exportación incluirá: perfil, organización, sorteos, órdenes, historial de facturación, 
              registro de auditoría, aceptación de términos, notificaciones, métodos de pago y cupones.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleExportData} 
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Exportando..." : "Descargar mis Datos (JSON)"}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Information */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="p-3 sm:p-4 lg:p-6 pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <Shield className="h-5 w-5" />
            Tus Derechos de Privacidad
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Información sobre cómo protegemos tus datos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <strong>Derecho de Acceso:</strong> Puedes solicitar una copia de tus datos personales en cualquier momento.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <strong>Derecho de Rectificación:</strong> Puedes corregir cualquier dato incorrecto en la sección de Organización.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <strong>Derecho al Olvido:</strong> Para solicitar la eliminación de tu cuenta, contacta a{" "}
                <a href="mailto:legal@sortavo.com" className="text-primary hover:underline">legal@sortavo.com</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <strong>Derecho a la Portabilidad:</strong> Usa el botón de arriba para exportar todos tus datos en formato JSON.
              </div>
            </div>
          </div>
          
          <Alert variant="default" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Para ejercer cualquier otro derecho de privacidad o hacer consultas, 
              contacta a <a href="mailto:privacy@sortavo.com" className="text-primary hover:underline">privacy@sortavo.com</a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
