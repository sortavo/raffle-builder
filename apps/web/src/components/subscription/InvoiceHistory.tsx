import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, Receipt } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Invoice {
  id: string;
  number: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string | null;
  created: number;
  period_start: number;
  period_end: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  description: string;
}

// Issue M12: Improved status badges with tooltips
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; tooltip: string }> = {
  paid: {
    label: "Pagada",
    variant: "default",
    tooltip: "Esta factura ha sido pagada exitosamente"
  },
  open: {
    label: "Pendiente",
    variant: "secondary",
    tooltip: "Esta factura está pendiente de pago"
  },
  void: {
    label: "Anulada",
    variant: "outline",
    tooltip: "Esta factura fue cancelada y no requiere pago"
  },
  uncollectible: {
    label: "Incobrable",
    variant: "destructive",
    tooltip: "No se pudo cobrar esta factura después de varios intentos"
  },
  draft: {
    label: "Borrador",
    variant: "outline",
    tooltip: "Esta factura aún no ha sido finalizada"
  },
};

export function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("list-invoices");
        if (error) throw error;
        setInvoices(data?.invoices || []);
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError("No se pudieron cargar las facturas");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const formatCurrency = (cents: number, currency: string) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string | null) => {
    const config = statusConfig[status || ""] || { 
      label: status || "Desconocido", 
      variant: "secondary" as const, 
      tooltip: "Estado de factura" 
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={config.variant} className="cursor-help">
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historial de Facturas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historial de Facturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // L11: Improved empty state with more helpful message
  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historial de Facturas
          </CardTitle>
          <CardDescription>Tus facturas de suscripción</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">
            Sin facturas aún
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Las facturas aparecerán aquí después de tu primer pago.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Historial de Facturas
        </CardTitle>
        <CardDescription>Últimas {invoices.length} facturas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {invoice.number || `Factura ${invoice.id.slice(-8)}`}
                    </span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(invoice.created * 1000), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">
                  {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                </span>
                <div className="flex gap-1">
                  {invoice.invoice_pdf && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8"
                    >
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Descargar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {invoice.hosted_invoice_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8"
                    >
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver en línea"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
