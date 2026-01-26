import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QRScanner } from "./QRScanner";
import { useTicketVerification, VerifiedTicket } from "@/hooks/useTicketVerification";
import { formatCurrency } from "@/lib/currency-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Ticket,
  ExternalLink,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TicketScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketScannerDialog({ open, onOpenChange }: TicketScannerDialogProps) {
  const navigate = useNavigate();
  const [scannedTicketId, setScannedTicketId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(true);

  const { data: ticket, isLoading, error } = useTicketVerification(scannedTicketId || undefined);

  const handleScan = (ticketId: string) => {
    setScannedTicketId(ticketId);
    setShowScanner(false);
  };

  const handleScanAgain = () => {
    setScannedTicketId(null);
    setShowScanner(true);
  };

  const handleClose = () => {
    setScannedTicketId(null);
    setShowScanner(true);
    onOpenChange(false);
  };

  const getStatusConfig = (status: string, isWinner: boolean) => {
    if (isWinner) {
      return {
        icon: Trophy,
        label: "GANADOR",
        className: "bg-yellow-500 text-yellow-950",
        bgClass: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50",
      };
    }

    switch (status) {
      case "sold":
        return {
          icon: CheckCircle,
          label: "VÁLIDO",
          className: "bg-green-500 text-white",
          bgClass: "bg-green-500/10 border-green-500/50",
        };
      case "reserved":
        return {
          icon: Clock,
          label: "PENDIENTE",
          className: "bg-yellow-500 text-yellow-950",
          bgClass: "bg-yellow-500/10 border-yellow-500/50",
        };
      default:
        return {
          icon: XCircle,
          label: "NO VÁLIDO",
          className: "bg-destructive text-destructive-foreground",
          bgClass: "bg-destructive/10 border-destructive/50",
        };
    }
  };

  const renderTicketResult = (ticket: VerifiedTicket) => {
    const isWinner =
      ticket.raffle.winner_announced &&
      ticket.raffle.winner_ticket_number === ticket.ticket_number;

    const statusConfig = getStatusConfig(ticket.status, isWinner);
    const StatusIcon = statusConfig.icon;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4"
      >
        {/* Status Banner */}
        <div
          className={`rounded-lg border p-4 ${statusConfig.bgClass} flex items-center justify-center gap-3`}
        >
          <StatusIcon className="h-8 w-8" />
          <span className="text-2xl font-bold">{statusConfig.label}</span>
        </div>

        {/* Ticket Number */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Número de Boleto</p>
          <p className="text-4xl font-bold text-primary">#{ticket.ticket_number}</p>
        </div>

        <Separator />

        {/* Raffle Info */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            {ticket.raffle.title}
          </h4>
          <p className="text-sm text-muted-foreground">
            Premio: {ticket.raffle.prize_name}
          </p>
          <p className="text-sm text-muted-foreground">
            Precio: {formatCurrency(ticket.raffle.ticket_price, ticket.raffle.currency_code || "USD")}
          </p>
          {ticket.raffle.draw_date && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Sorteo: {format(new Date(ticket.raffle.draw_date), "PPP", { locale: es })}
            </p>
          )}
        </div>

        <Separator />

        {/* Buyer Info */}
        {ticket.buyer_name && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">
              Datos del Comprador
            </h4>
            <div className="grid gap-1 text-sm">
              <p className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                {ticket.buyer_name}
              </p>
              {ticket.buyer_email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  {ticket.buyer_email}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleScanAgain}>
            <QrCode className="h-4 w-4 mr-2" />
            Escanear otro
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => navigate(`/ticket/${ticket.id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver detalles
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Verificador de Boletos
          </DialogTitle>
          <DialogDescription>
            Escanea el código QR de un boleto para verificar su validez
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {showScanner ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <QRScanner onScan={handleScan} isActive={open && showScanner} />
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground">Verificando boleto...</p>
            </motion.div>
          ) : error || !ticket ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 gap-4"
            >
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Boleto no encontrado</p>
                <p className="text-sm text-muted-foreground">
                  El código QR no corresponde a un boleto válido
                </p>
              </div>
              <Button variant="outline" onClick={handleScanAgain}>
                <QrCode className="h-4 w-4 mr-2" />
                Escanear otro
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {renderTicketResult(ticket)}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
