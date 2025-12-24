import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatCurrency } from "@/lib/currency-utils";
import { useReserveTickets } from "@/hooks/usePublicRaffle";
import { useEmails } from "@/hooks/useEmails";
import { Loader2, Ticket, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Raffle = Tables<'raffles'>;

const checkoutSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Ingresa un email válido"),
  phone: z.string().min(10, "Ingresa un teléfono válido"),
  city: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debes aceptar los términos y condiciones",
  }),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raffle: Raffle;
  selectedTickets: string[];
  ticketPrice: number;
  packages?: { quantity: number; price: number }[];
  onReservationComplete: (tickets: { id: string; ticket_number: string }[], reservedUntil: string, buyerData: { name: string; email: string }) => void;
}

export function CheckoutModal({
  open,
  onOpenChange,
  raffle,
  selectedTickets,
  ticketPrice,
  packages = [],
  onReservationComplete,
}: CheckoutModalProps) {
  const reserveTickets = useReserveTickets();
  const { sendReservationEmail } = useEmails();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      city: "",
      acceptTerms: false,
    },
  });

  const calculateTotal = () => {
    const matchingPackage = packages.find(p => p.quantity === selectedTickets.length);
    if (matchingPackage) {
      return matchingPackage.price;
    }
    return selectedTickets.length * ticketPrice;
  };

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      const result = await reserveTickets.mutateAsync({
        raffleId: raffle.id,
        ticketNumbers: selectedTickets,
        buyerData: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city,
        },
        reservationMinutes: raffle.reservation_time_minutes || 15,
      });

      // Send reservation email (non-blocking)
      sendReservationEmail({
        to: data.email,
        buyerName: data.name,
        ticketNumbers: selectedTickets,
        raffleTitle: raffle.title,
        raffleSlug: raffle.slug,
        amount: calculateTotal(),
        currency: raffle.currency_code || 'MXN',
        timerMinutes: raffle.reservation_time_minutes || 15,
      }).catch(console.error);

      onReservationComplete(
        result.tickets.map(t => ({ id: t.id, ticket_number: t.ticket_number })),
        result.reservedUntil,
        { name: data.name, email: data.email }
      );
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reservar Boletos</DialogTitle>
          <DialogDescription>
            Ingresa tus datos para reservar tus boletos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tickets Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ticket className="h-4 w-4" />
              <span>Boletos seleccionados:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedTickets.map(num => (
                <Badge key={num} variant="secondary">
                  #{num}
                </Badge>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-xl font-bold">
                {formatCurrency(calculateTotal(), raffle.currency_code || 'MXN')}
              </span>
            </div>
          </div>

          {/* Reservation Time Notice */}
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            <span>
              Tienes {raffle.reservation_time_minutes || 15} minutos para completar el pago
            </span>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="juan@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="55 1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad de México" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Acepto los términos y condiciones del sorteo
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={reserveTickets.isPending}
              >
                {reserveTickets.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Reservando...
                  </>
                ) : (
                  "Reservar y Continuar al Pago"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
