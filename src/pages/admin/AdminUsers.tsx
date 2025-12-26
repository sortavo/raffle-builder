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
import { Search, Users, Mail, Building2, Eye } from "lucide-react";
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
          organizations:organization_id (name, slug)
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

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="hidden md:table-cell">Organización</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden lg:table-cell">Registrado</TableHead>
                  <TableHead className="hidden lg:table-cell">Último acceso</TableHead>
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
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
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
                            <div>
                              <div className="font-medium">
                                {profile.full_name || "Sin nombre"}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {profile.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {profile.organizations ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{profile.organizations.name}</span>
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
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {profile.created_at
                            ? format(new Date(profile.created_at), "d MMM yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {profile.last_login
                            ? format(new Date(profile.last_login), "d MMM yyyy", { locale: es })
                            : "Nunca"}
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
                            Simular
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
