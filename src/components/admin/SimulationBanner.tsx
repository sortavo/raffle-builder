import { useSimulation } from "@/contexts/SimulationContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, EyeOff, LogOut, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SimulationBanner() {
  const { isSimulating, simulatedUser, simulatedOrg, mode, toggleMode, endSimulation } =
    useSimulation();
  const navigate = useNavigate();

  if (!isSimulating || !simulatedUser) return null;

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

  const handleExit = async () => {
    await endSimulation();
    navigate("/admin/users");
  };

  const isReadonly = mode === "readonly";

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] px-4 py-2",
        "border-b shadow-md",
        isReadonly
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800"
          : "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800"
      )}
    >
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        {/* Left: User info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className={cn("h-4 w-4", isReadonly ? "text-amber-600" : "text-red-600")} />
            <span
              className={cn(
                "text-sm font-medium",
                isReadonly ? "text-amber-800 dark:text-amber-200" : "text-red-800 dark:text-red-200"
              )}
            >
              Simulando:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={simulatedUser.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(simulatedUser.full_name, simulatedUser.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <span className="font-medium text-sm">
                {simulatedUser.full_name || simulatedUser.email}
              </span>
              {simulatedOrg && (
                <span className="text-muted-foreground text-xs ml-2">({simulatedOrg.name})</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Mode indicator */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-medium",
              isReadonly
                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200"
                : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200"
            )}
          >
            {isReadonly ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Solo Lectura
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Acceso Completo
              </>
            )}
          </Badge>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMode}
            className={cn(
              "h-8 text-xs",
              isReadonly
                ? "border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200"
                : "border-red-300 text-red-800 hover:bg-red-100 dark:border-red-700 dark:text-red-200"
            )}
          >
            {isReadonly ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Cambiar a Acceso Completo
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Cambiar a Solo Lectura
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExit}
            className={cn(
              "h-8 text-xs",
              isReadonly
                ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100"
                : "border-red-300 bg-red-100 text-red-900 hover:bg-red-200 dark:border-red-700 dark:bg-red-900 dark:text-red-100"
            )}
          >
            <LogOut className="h-3 w-3 mr-1" />
            Salir
          </Button>
        </div>
      </div>
    </div>
  );
}
