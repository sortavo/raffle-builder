import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CreditCard, Users, Loader2, Bell, ShieldAlert, Send, Globe, ShieldCheck } from "lucide-react";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { PaymentMethodsSettings } from "@/components/settings/PaymentMethodsSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { TelegramSettings } from "@/components/settings/TelegramSettings";
import { CustomDomainsSettings } from "@/components/settings/CustomDomainsSettings";
import { ProtectedAction } from "@/components/auth/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const { isSortavoEmail } = useIsPlatformAdmin();
  
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
          <div className="w-full overflow-x-auto pb-1 -mx-1 px-1">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto sm:min-w-0 gap-1 p-1 h-auto">
              <TabsTrigger value="organization" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline">Org</span>
              </TabsTrigger>
              <TabsTrigger value="payment-methods" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline">Pagos</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Bell className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline">Alertas</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline">Equipo</span>
              </TabsTrigger>
              <TabsTrigger value="telegram" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Send className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline">TG</span>
              </TabsTrigger>
              <TabsTrigger value="domains" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline">Dominios</span>
              </TabsTrigger>
              {isSortavoEmail && (
                <TabsTrigger value="security" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="hidden xs:inline">Seguridad</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="organization" className="animate-fade-in">
            <OrganizationSettings />
          </TabsContent>

          <TabsContent value="payment-methods" className="animate-fade-in">
            <PaymentMethodsSettings />
          </TabsContent>

          <TabsContent value="notifications" className="animate-fade-in">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="team" className="animate-fade-in">
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

          <TabsContent value="telegram" className="animate-fade-in">
            <TelegramSettings />
          </TabsContent>

          <TabsContent value="domains" className="animate-fade-in">
            <ProtectedAction
              resource="subscription"
              action="update"
              fallback={
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Solo el propietario puede gestionar los dominios.
                  </AlertDescription>
                </Alert>
              }
            >
              <CustomDomainsSettings />
            </ProtectedAction>
          </TabsContent>

          {isSortavoEmail && (
            <TabsContent value="security" className="animate-fade-in">
              <SecuritySettings />
            </TabsContent>
          )}

        </Tabs>
      </div>
    </DashboardLayout>
  );
}
