import { Card, CardContent } from "@/components/ui/card";
import { 
  Ticket, 
  User, 
  CreditCard, 
  Upload, 
  CheckCircle, 
  Trophy 
} from "lucide-react";

const steps = [
  {
    icon: Ticket,
    title: "Elige tus boletos",
    description: "Selecciona tus números de la suerte o déjalo al azar",
  },
  {
    icon: User,
    title: "Completa tus datos",
    description: "Ingresa tu nombre, email y teléfono para la reservación",
  },
  {
    icon: CreditCard,
    title: "Realiza el pago",
    description: "Transfiere el monto a la cuenta indicada",
  },
  {
    icon: Upload,
    title: "Sube tu comprobante",
    description: "Adjunta la imagen de tu comprobante de pago",
  },
  {
    icon: CheckCircle,
    title: "Espera aprobación",
    description: "Verificamos tu pago en máximo 24 horas",
  },
  {
    icon: Trophy,
    title: "¡Participa en el sorteo!",
    description: "Si ganas, te contactaremos para entregarte tu premio",
  },
];

export function HowItWorks() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {steps.map((step, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="absolute top-2 right-2 text-4xl font-bold text-muted/20">
              {index + 1}
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
