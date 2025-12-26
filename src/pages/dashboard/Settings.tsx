import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CreditCard, Users, Receipt, Loader2, Bell, ShieldAlert } from "lucide-react";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { PaymentMethodsSettings } from "@/components/settings/PaymentMethodsSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { ProtectedAction } from "@/components/auth/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  
  const activeTab = searchParams.get("tab") || "organization";

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Configuración" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground">
            Administra tu organización, equipo y suscripción
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="inline-flex h-auto w-full flex-wrap gap-1 p-1 sm:flex-nowrap sm:overflow-x-auto">
            <TabsTrigger value="organization" className="flex-1 min-w-fit gap-2 px-3 py-2 text-xs sm:text-sm">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Organización</span>
            </TabsTrigger>
            <TabsTrigger value="payment-methods" className="flex-1 min-w-fit gap-2 px-3 py-2 text-xs sm:text-sm">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 min-w-fit gap-2 px-3 py-2 text-xs sm:text-sm">
              <Bell className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex-1 min-w-fit gap-2 px-3 py-2 text-xs sm:text-sm">
              <Users className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Equipo</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex-1 min-w-fit gap-2 px-3 py-2 text-xs sm:text-sm">
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Suscripción</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization">
            <OrganizationSettings />
          </TabsContent>

          <TabsContent value="payment-methods">
            <PaymentMethodsSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="team">
            <ProtectedAction
              resource="team"
              action="create"
              fallback={
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Solo el propietario puede gestionar el equipo.
                  </AlertDescription>
                </Alert>
              }
            >
              <TeamSettings />
            </ProtectedAction>
          </TabsContent>

          <TabsContent value="subscription">
            <ProtectedAction
              resource="subscription"
              action="update"
              fallback={
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Solo el propietario puede gestionar la suscripción.
                  </AlertDescription>
                </Alert>
              }
            >
              <SubscriptionSettings />
            </ProtectedAction>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
