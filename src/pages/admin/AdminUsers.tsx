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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Mail, Building2, Eye, Crown, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDeleteUser } from "@/hooks/useDeleteUser";
import { useAuth } from "@/hooks/useAuth";

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
  platform_admin: "bg-accent/20 text-accent border-accent/30",
  owner: "bg-primary/20 text-primary border-primary/30",
  admin: "bg-success/20 text-success border-success/30",
  member: "bg-muted text-muted-foreground border-border",
};

const roleLabels: Record<string, string> = {
  platform_admin: "Super Admin",
  owner: "Propietario",
  admin: "Admin",
  member: "Miembro",
};

const tierColors: Record<string, string> = {
  premium: "bg-accent/20 text-accent border-accent/30",
  pro: "bg-primary/20 text-primary border-primary/30",
  basic: "bg-muted text-muted-foreground border-border",
  trial: "bg-warning/20 text-warning border-warning/30",
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  
  const { user: currentUser } = useAuth();
  const deleteUserMutation = useDeleteUser();

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

  const canDeleteUser = (userId: string) => {
    // Cannot delete yourself
    if (userId === currentUser?.id) return false;
    // Cannot delete other platform admins
    if (isPlatformAdmin(userId)) return false;
    return true;
  };

  const handleDeleteClick = (profile: Profile) => {
    setUserToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    await deleteUserMutation.mutateAsync(userToDelete.id);
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

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
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(profile);
                            setSimulateModalOpen(true);
                          }}
                          className="h-8 w-8"
                          disabled={!profile.organization_id}
                          title={!profile.organization_id ? "Usuario sin organización" : "Simular usuario"}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canDeleteUser(profile.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(profile)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
                              {tier === "premium" && <Crown className="h-3 w-3 text-accent" />}
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
                          <div className="flex justify-end gap-1">
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
                            {canDeleteUser(profile.id) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(profile)}
                                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              ¿Eliminar usuario permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Estás a punto de eliminar a:
                </p>
                {userToDelete && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium">{userToDelete.full_name || "Sin nombre"}</p>
                    <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                    {userToDelete.organizations && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Organización: {userToDelete.organizations.name}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-destructive font-medium">
                  Esta acción es irreversible. El usuario perderá acceso a la plataforma y sus datos de perfil serán eliminados.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar usuario"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
