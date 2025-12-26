import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SimulateUserModal } from "@/components/admin/SimulateUserModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Mail, Building2, Eye, Crown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_login: string | null;
  organization_id: string | null;
  organizations: {
    name: string;
    slug: string | null;
    subscription_tier: "basic" | "pro" | "premium" | null;
    subscription_status: "active" | "canceled" | "past_due" | "trial" | null;
  } | null;
}

interface UserRole {
  user_id: string;
  role: "owner" | "admin" | "member";
}

interface PlatformAdmin {
  user_id: string;
}

const roleColors: Record<string, string> = {
  platform_admin: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  owner: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  admin: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  member: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
};

const roleLabels: Record<string, string> = {
  platform_admin: "Super Admin",
  owner: "Propietario",
  admin: "Admin",
  member: "Miembro",
};

const tierColors: Record<string, string> = {
  premium: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border-amber-300 dark:from-amber-900/40 dark:to-yellow-900/40 dark:text-amber-300 dark:border-amber-600",
  pro: "bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-indigo-300 dark:from-indigo-900/40 dark:to-purple-900/40 dark:text-indigo-300 dark:border-indigo-600",
  basic: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600",
  trial: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600",
};

const tierLabels: Record<string, string> = {
  premium: "Premium",
  pro: "Pro",
  basic: "Básico",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          created_at,
          last_login,
          organization_id,
          organizations:organization_id (name, slug, subscription_tier, subscription_status)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;
      return data as UserRole[];
    },
  });

  const { data: platformAdmins } = useQuery({
    queryKey: ["admin-platform-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id");

      if (error) throw error;
      return data as PlatformAdmin[];
    },
  });

  const isPlatformAdmin = (userId: string) => {
    return platformAdmins?.some((pa) => pa.user_id === userId) ?? false;
  };

  const getRoleForUser = (userId: string) => {
    // Platform admin takes priority
    if (isPlatformAdmin(userId)) {
      return "platform_admin";
    }
    return userRoles?.find((r) => r.user_id === userId)?.role;
  };

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

  const filteredProfiles = profiles?.filter((profile) => {
    const matchesSearch =
      profile.email.toLowerCase().includes(search.toLowerCase()) ||
      profile.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      profile.organizations?.name?.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <AdminLayout
      title="Usuarios"
      description="Busca y gestiona usuarios de la plataforma"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Usuarios
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredProfiles?.length || 0} de {profiles?.length || 0} usuarios
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email u organización..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {profilesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                      <div className="flex gap-1.5">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-14" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                  </div>
                </Card>
              ))
            ) : filteredProfiles?.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No se encontraron usuarios
              </Card>
            ) : (
              filteredProfiles?.map((profile) => {
                const role = getRoleForUser(profile.id);
                const tier = profile.organizations?.subscription_tier;
                const status = profile.organizations?.subscription_status;
                
                return (
                  <Card key={profile.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(profile.full_name, profile.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {profile.full_name || "Sin nombre"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {profile.email}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {role && (
                            <Badge variant="outline" className={`${roleColors[role]} text-xs`}>
                              {roleLabels[role]}
                            </Badge>
                          )}
                          {tier && (
                            <Badge 
                              variant="outline" 
                              className={`${status === "trial" ? tierColors.trial : tierColors[tier]} text-xs`}
                            >
                              {tier === "premium" && <Crown className="h-3 w-3 mr-1" />}
                              {status === "trial" ? "Trial" : tierLabels[tier]}
                            </Badge>
                          )}
                        </div>
                        {profile.organizations && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{profile.organizations.name}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(profile);
                          setSimulateModalOpen(true);
                        }}
                        className="h-8 w-8 flex-shrink-0"
                        disabled={!profile.organization_id}
                        title={!profile.organization_id ? "Usuario sin organización" : "Simular usuario"}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Organización</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden lg:table-cell">Plan</TableHead>
                  <TableHead className="hidden xl:table-cell">Registrado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profilesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProfiles?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles?.map((profile) => {
                    const role = getRoleForUser(profile.id);
                    const tier = profile.organizations?.subscription_tier;
                    const status = profile.organizations?.subscription_status;
                    
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(profile.full_name, profile.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate max-w-[200px]">
                                {profile.full_name || "Sin nombre"}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[180px]">{profile.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {profile.organizations ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate max-w-[150px]">{profile.organizations.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {role ? (
                            <Badge variant="outline" className={roleColors[role]}>
                              {roleLabels[role]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {tier ? (
                            <div className="flex items-center gap-1">
                              {tier === "premium" && <Crown className="h-3 w-3 text-amber-500" />}
                              <Badge 
                                variant="outline" 
                                className={status === "trial" ? tierColors.trial : tierColors[tier]}
                              >
                                {status === "trial" ? "Trial" : tierLabels[tier]}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">
                          {profile.created_at
                            ? format(new Date(profile.created_at), "d MMM yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(profile);
                              setSimulateModalOpen(true);
                            }}
                            className="h-8"
                            disabled={!profile.organization_id}
                            title={!profile.organization_id ? "Usuario sin organización" : "Simular usuario"}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="hidden lg:inline">Simular</span>
                          </Button>
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

      <SimulateUserModal
        open={simulateModalOpen}
        onOpenChange={setSimulateModalOpen}
        user={selectedUser}
      />
    </AdminLayout>
  );
}
