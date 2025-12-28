import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { Search, ExternalLink, Building2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

type SubscriptionTier = "basic" | "pro" | "premium";
type SubscriptionStatus = "trial" | "active" | "canceled" | "past_due";

interface Organization {
  id: string;
  name: string;
  email: string;
  slug: string | null;
  subscription_tier: SubscriptionTier | null;
  subscription_status: SubscriptionStatus | null;
  created_at: string | null;
  trial_ends_at: string | null;
  verified: boolean | null;
}

const tierColors: Record<SubscriptionTier, string> = {
  basic: "bg-muted text-muted-foreground border-border",
  pro: "bg-primary/20 text-primary border-primary/30",
  premium: "bg-accent/20 text-accent border-accent/30",
};

const statusColors: Record<SubscriptionStatus, string> = {
  trial: "bg-warning/20 text-warning border-warning/30",
  active: "bg-success/20 text-success border-success/30",
  canceled: "bg-destructive/20 text-destructive border-destructive/30",
  past_due: "bg-warning/20 text-warning border-warning/30",
};

export default function AdminOrganizations() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, email, slug, subscription_tier, subscription_status, created_at, trial_ends_at, verified")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Organization[];
    },
  });

  const toggleVerification = async (orgId: string, newValue: boolean) => {
    const { error } = await supabase
      .from("organizations")
      .update({ verified: newValue })
      .eq("id", orgId);

    if (error) {
      toast.error("Error al actualizar verificación");
      console.error(error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    toast.success(newValue ? "Organización verificada" : "Verificación removida");
  };

  const filteredOrgs = organizations?.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.email.toLowerCase().includes(search.toLowerCase()) ||
      org.slug?.toLowerCase().includes(search.toLowerCase());

    const matchesTier = tierFilter === "all" || org.subscription_tier === tierFilter;
    const matchesStatus = statusFilter === "all" || org.subscription_status === statusFilter;
    const matchesVerified = 
      verifiedFilter === "all" || 
      (verifiedFilter === "verified" && org.verified === true) ||
      (verifiedFilter === "unverified" && (org.verified === false || org.verified === null));

    return matchesSearch && matchesTier && matchesStatus && matchesVerified;
  });

  return (
    <AdminLayout
      title="Organizaciones"
      description="Gestiona todas las organizaciones de la plataforma"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Lista de Organizaciones
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredOrgs?.length || 0} de {organizations?.length || 0} organizaciones
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los planes</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="trial">En prueba</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="canceled">Cancelada</SelectItem>
                <SelectItem value="past_due">Vencida</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Verificación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Verificación</SelectItem>
                <SelectItem value="verified">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    Verificados
                  </span>
                </SelectItem>
                <SelectItem value="unverified">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    Sin verificar
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Verificado</TableHead>
                  <TableHead className="hidden lg:table-cell">Creada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrgs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No se encontraron organizaciones
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrgs?.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {org.verified && (
                            <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                          )}
                          <div>
                            <div className="font-medium">{org.name}</div>
                            {org.slug && (
                              <div className="text-xs text-muted-foreground">/{org.slug}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {org.email}
                      </TableCell>
                      <TableCell>
                        {org.subscription_tier && (
                          <Badge 
                            variant="outline" 
                            className={tierColors[org.subscription_tier]}
                          >
                            {org.subscription_tier}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {org.subscription_status && (
                          <Badge 
                            variant="outline" 
                            className={statusColors[org.subscription_status]}
                          >
                            {org.subscription_status === "trial" ? "Prueba" : 
                             org.subscription_status === "active" ? "Activa" :
                             org.subscription_status === "canceled" ? "Cancelada" : "Vencida"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={org.verified === true}
                          onCheckedChange={(checked) => toggleVerification(org.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {org.created_at && format(new Date(org.created_at), "d MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        {org.slug && (
                          <Button variant="ghost" size="sm" asChild>
                            <a 
                              href={`/${org.slug}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
