import { useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CountdownTimer } from "@/components/raffle/public/CountdownTimer";
import { usePublicRaffle, useUploadPaymentProof } from "@/hooks/usePublicRaffle";
import { useEmails } from "@/hooks/useEmails";
import { formatCurrency } from "@/lib/currency-utils";
import { WhatsAppContactButton } from "@/components/raffle/public/WhatsAppContactButton";
import { Loader2, Upload, Copy, Check, AlertTriangle, Ticket, CheckCircle2 } from "lucide-react";

export default function PaymentInstructions() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendProofReceivedEmail } = useEmails();

  const { tickets, reservedUntil, raffleId, buyerName, buyerEmail } = (location.state as {
    tickets: { id: string; ticket_number: string }[];
    reservedUntil: string;
    raffleId: string;
    buyerName?: string;
    buyerEmail?: string;
  }) || { tickets: [], reservedUntil: '', raffleId: '' };

  const { data: raffle } = usePublicRaffle(slug);
  const uploadProof = useUploadPaymentProof();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (!tickets.length || !raffle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-bold">No hay reservación activa</h1>
        <Button onClick={() => navigate(`/r/${slug}`)}>Volver al sorteo</Button>
      </div>
    );
  }

  const totalAmount = tickets.length * Number(raffle.ticket_price);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({ 
        title: "Archivo muy grande", 
        description: "El archivo debe ser menor a 5MB",
        variant: "destructive" 
      });
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({ 
        title: "Tipo de archivo no válido", 
        description: "Solo se permiten imágenes JPG, PNG o WEBP",
        variant: "destructive" 
      });
      return;
    }

    // Validate image dimensions
    const img = document.createElement('img');
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width > 4000 || img.height > 4000) {
        toast({
          title: "Imagen muy grande",
          description: "La imagen debe ser menor a 4000x4000 píxeles",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      toast({
        title: "Archivo inválido",
        description: "No se pudo procesar la imagen",
        variant: "destructive"
      });
    };
    img.src = URL.createObjectURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    await uploadProof.mutateAsync({
      raffleId,
      ticketIds: tickets.map(t => t.id),
      file,
      buyerName: buyerName || undefined,
    });

    // Send proof received email (non-blocking)
    if (buyerEmail && buyerName) {
      sendProofReceivedEmail({
        to: buyerEmail,
        buyerName,
        ticketNumbers: tickets.map(t => t.ticket_number),
        raffleTitle: raffle.title,
      }).catch(console.error);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExpire = () => {
    toast({ title: "Reservación expirada", description: "El tiempo de tu reservación ha terminado", variant: "destructive" });
    navigate(`/r/${slug}`);
  };


  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl space-y-6">
        {/* Countdown Header */}
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tu reservación expira en:</span>
              <CountdownTimer
                targetDate={new Date(reservedUntil)}
                variant="compact"
                onExpire={handleExpire}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reservation Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Resumen de tu Reservación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {tickets.map(t => (
                <Badge key={t.id} variant="secondary" className="text-lg px-3 py-1">
                  #{t.ticket_number}
                </Badge>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="font-medium">Total a pagar:</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(totalAmount, raffle.currency_code || 'MXN')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="transfer">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transfer">Transferencia</TabsTrigger>
                <TabsTrigger value="other">Otro Método</TabsTrigger>
              </TabsList>
              <TabsContent value="transfer" className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Monto</p>
                      <p className="font-mono font-bold">{formatCurrency(totalAmount, raffle.currency_code || 'MXN')}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(totalAmount.toString(), 'amount')}>
                      {copied === 'amount' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Referencia</p>
                      <p className="font-mono">{tickets.map(t => t.ticket_number).join('-')}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(tickets.map(t => t.ticket_number).join('-'), 'ref')}>
                      {copied === 'ref' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Contacta al organizador para obtener los datos bancarios específicos.
                </p>
              </TabsContent>
              <TabsContent value="other" className="pt-4">
                <p className="text-muted-foreground">
                  Contacta directamente al organizador para coordinar otro método de pago.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Upload Proof */}
        <Card>
          <CardHeader>
            <CardTitle>Subir Comprobante de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Imagen del comprobante (máx. 5MB)</Label>
              <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
            </div>
            {preview && (
              <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
            )}
            <Button className="w-full" onClick={handleUpload} disabled={!file || uploadProof.isPending}>
              {uploadProof.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Subir Comprobante
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Contact - Improved */}
        <WhatsAppContactButton
          organizationPhone={raffle.organization?.phone}
          organizationName={raffle.organization?.name}
          organizationLogo={raffle.organization?.logo_url}
          raffleTitle={raffle.title}
          ticketNumbers={tickets.map(t => t.ticket_number)}
          totalAmount={totalAmount}
          currencyCode={raffle.currency_code || 'MXN'}
          buyerName={buyerName}
          variant="card"
        />

        {/* Success indicator after upload */}
        {uploadProof.isSuccess && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <p className="font-semibold">¡Comprobante enviado!</p>
                  <p className="text-sm opacity-80">El organizador revisará tu pago pronto</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" className="w-full" onClick={() => navigate(`/r/${slug}`)}>
          Volver al Sorteo
        </Button>
      </div>
    </div>
  );
}
