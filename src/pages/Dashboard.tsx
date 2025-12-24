import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Users, DollarSign, Clock, Plus, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, organization, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    {
      title: "Ingresos Totales",
      value: "$0.00",
      description: "Este mes",
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Boletos Vendidos",
      value: "0",
      description: "De 0 disponibles",
      icon: Gift,
      color: "text-primary",
    },
    {
      title: "Sorteos Activos",
      value: "0",
      description: `De ${organization?.max_active_raffles || 2} permitidos`,
      icon: Clock,
      color: "text-secondary",
    },
    {
      title: "Aprobaciones Pendientes",
      value: "0",
      description: "Requieren acción",
      icon: Users,
      color: "text-warning",
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              ¡Hola, {profile?.full_name?.split(" ")[0] || "Usuario"}! 👋
            </h1>
            <p className="text-muted-foreground">
              Aquí está el resumen de tu cuenta
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard/raffles/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Sorteo
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Empty State */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Raffles */}
          <Card>
            <CardHeader>
              <CardTitle>Sorteos Activos</CardTitle>
              <CardDescription>Tus sorteos en curso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Gift className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No tienes sorteos activos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primer sorteo y comienza a vender boletos
                </p>
                <Button variant="outline" onClick={() => navigate("/dashboard/raffles/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear mi primer sorteo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Pendientes</CardTitle>
              <CardDescription>Pagos que requieren tu atención</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Sin aprobaciones pendientes</h3>
                <p className="text-sm text-muted-foreground">
                  Los pagos de tus compradores aparecerán aquí
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Banner */}
        {organization?.subscription_status === "trial" && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-foreground">
                  Estás en el plan de prueba
                </h3>
                <p className="text-sm text-muted-foreground">
                  Actualiza a un plan de pago para desbloquear todas las funcionalidades
                </p>
              </div>
              <Button onClick={() => navigate("/dashboard/subscription")}>
                Ver planes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
