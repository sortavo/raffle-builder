import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSimulation, SimulationMode } from "@/contexts/SimulationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Edit, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SimulateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    organization_id: string | null;
    organizations?: {
      name: string;
    } | null;
  } | null;
}

export function SimulateUserModal({ open, onOpenChange, user }: SimulateUserModalProps) {
  const [mode, setMode] = useState<SimulationMode>("readonly");
  const [loading, setLoading] = useState(false);
  const { startSimulation } = useSimulation();
  const navigate = useNavigate();

  if (!user) return null;

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const handleStartSimulation = async () => {
    if (!user.organization_id) {
      toast.error("Este usuario no tiene una organización asignada");
      return;
    }

    setLoading(true);
    try {
      await startSimulation(user.id, user.organization_id, mode);
      toast.success(`Simulando como ${user.full_name || user.email}`);
      onOpenChange(false);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error starting simulation:", error);
      toast.error("Error al iniciar la simulación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Simular Usuario</DialogTitle>
          <DialogDescription>
            Verás la plataforma exactamente como la ve este usuario
          </DialogDescription>
        </DialogHeader>

        {/* User preview */}
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.full_name || "Sin nombre"}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            {user.organizations && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {user.organizations.name}
              </div>
            )}
          </div>
        </div>

        {/* Mode selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Modo de simulación</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as SimulationMode)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="readonly" id="readonly" className="mt-1" />
              <Label htmlFor="readonly" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium">
                  <Eye className="h-4 w-4 text-warning" />
                  Solo Lectura
                  <span className="text-xs font-normal text-muted-foreground">(Recomendado)</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Puedes navegar y ver todo, pero no realizar cambios
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="full_access" id="full_access" className="mt-1" />
              <Label htmlFor="full_access" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium">
                  <Edit className="h-4 w-4 text-destructive" />
                  Acceso Completo
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Puedes realizar acciones como si fueras el usuario
                </p>
              </Label>
            </div>
          </RadioGroup>

          {mode === "full_access" && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                Las acciones que realices afectarán la cuenta real del usuario y quedarán
                registradas en el log de auditoría.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleStartSimulation} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Iniciando...
              </>
            ) : (
              "Iniciar Simulación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
