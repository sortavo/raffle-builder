import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, CreditCard, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

type SubscriptionTier = "basic" | "pro" | "premium";
type SubscriptionStatus = "trial" | "active" | "canceled" | "past_due";

interface Organization {
  id: string;
  name: string;
  email: string;
  subscription_tier: SubscriptionTier | null;
  subscription_status: SubscriptionStatus | null;
  subscription_period: "monthly" | "annual" | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

const tierColors: Record<SubscriptionTier, string> = {
  basic: "bg-slate-100 text-slate-700 border-slate-200",
  pro: "bg-blue-100 text-blue-700 border-blue-200",
  premium: "bg-purple-100 text-purple-700 border-purple-200",
};

const statusColors: Record<SubscriptionStatus, string> = {
  trial: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  canceled: "bg-red-100 text-red-700 border-red-200",
  past_due: "bg-orange-100 text-orange-700 border-orange-200",
};

export default function AdminSubscriptions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id, name, email, subscription_tier, subscription_status, subscription_period, trial_ends_at, stripe_customer_id, stripe_subscription_id"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Organization[];
    },
  });

  const filteredOrgs = organizations?.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || org.subscription_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getTrialDaysLeft = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null;
    const daysLeft = differenceInDays(new Date(trialEndsAt), new Date());
    return daysLeft > 0 ? daysLeft : 0;
  };

  return (
    <AdminLayout
      title="Suscripciones"
      description="Gestiona las suscripciones de las organizaciones"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Gestión de Suscripciones
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="trial">En prueba</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="canceled">Cancelada</SelectItem>
                <SelectItem value="past_due">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="hidden md:table-cell">Trial</TableHead>
                  <TableHead className="hidden lg:table-cell">Stripe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrgs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No se encontraron organizaciones
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrgs?.map((org) => {
                    const trialDays = getTrialDaysLeft(org.trial_ends_at);
                    
                    return (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-muted-foreground">{org.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {org.subscription_tier && (
                            <Badge variant="outline" className={tierColors[org.subscription_tier]}>
                              {org.subscription_tier}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {org.subscription_status && (
                            <Badge variant="outline" className={statusColors[org.subscription_status]}>
                              {org.subscription_status === "trial" ? "Prueba" : 
                               org.subscription_status === "active" ? "Activa" :
                               org.subscription_status === "canceled" ? "Cancelada" : "Vencida"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground capitalize">
                            {org.subscription_period === "monthly" ? "Mensual" : 
                             org.subscription_period === "annual" ? "Anual" : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {org.subscription_status === "trial" && trialDays !== null ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                              <span className={`text-sm ${trialDays <= 3 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                {trialDays} días
                              </span>
                            </div>
                          ) : org.trial_ends_at ? (
                            <span className="text-xs text-muted-foreground">
                              Terminó {format(new Date(org.trial_ends_at), "d MMM", { locale: es })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {org.stripe_customer_id ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              Conectado
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin conectar</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
