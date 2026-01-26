import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Ticket, 
  TrendingUp, 
  Trash2, 
  Loader2,
  CheckCircle2,
  Calendar,
  Mail,
  ExternalLink,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useOrganizationDetail } from "@/hooks/useOrganizationDetail";
import { useDeleteOrganization } from "@/hooks/useDeleteOrganization";
import { useDeleteOrganizationUsers } from "@/hooks/useDeleteOrganizationUsers";
import { useDeleteUser } from "@/hooks/useDeleteUser";

const tierColors: Record<string, string> = {
  basic: "bg-muted text-muted-foreground border-border",
  pro: "bg-primary/20 text-primary border-primary/30",
  premium: "bg-accent/20 text-accent border-accent/30",
};

const statusColors: Record<string, string> = {
  trial: "bg-warning/20 text-warning border-warning/30",
  active: "bg-success/20 text-success border-success/30",
  canceled: "bg-destructive/20 text-destructive border-destructive/30",
  past_due: "bg-warning/20 text-warning border-warning/30",
};

const raffleStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/20 text-success",
  paused: "bg-warning/20 text-warning",
  completed: "bg-primary/20 text-primary",
  canceled: "bg-destructive/20 text-destructive",
};

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Admin",
  member: "Miembro",
};

export default function AdminOrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { organization, users, raffles, stats, isLoading, refetch } = useOrganizationDetail(id);
  const deleteOrgMutation = useDeleteOrganization();
  const deleteAllUsersMutation = useDeleteOrganizationUsers();
  const deleteUserMutation = useDeleteUser();

  const [deleteOrgDialogOpen, setDeleteOrgDialogOpen] = useState(false);
  const [deleteAllUsersDialogOpen, setDeleteAllUsersDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

  const handleDeleteOrg = async () => {
    if (!id) return;
    await deleteOrgMutation.mutateAsync(id);
    navigate("/admin/organizations");
  };

  const handleDeleteAllUsers = async () => {
    if (!id) return;
    await deleteAllUsersMutation.mutateAsync(id);
    setDeleteAllUsersDialogOpen(false);
    refetch();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    await deleteUserMutation.mutateAsync(userToDelete.id);
    setUserToDelete(null);
    refetch();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: organization?.currency_code || "MXN",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Cargando..." description="">
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!organization) {
    return (
      <AdminLayout title="No encontrado" description="">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Organización no encontrada</p>
            <Button asChild className="mt-4">
              <Link to="/admin/organizations">Volver a Organizaciones</Link>
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={organization.name}
      description="Detalle de organización"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/admin/organizations">
            <ArrowLeft className="h-4 w-4" />
            Volver a Organizaciones
          </Link>
        </Button>

        {/* Organization Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {organization.logo_url ? (
                  <img src={organization.logo_url} alt={organization.name} className="h-12 w-12 object-contain" />
                ) : (
                  <Building2 className="h-8 w-8 text-primary" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold">{organization.name}</h2>
                  {organization.verified && (
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  )}
                  {organization.subscription_tier && (
                    <Badge variant="outline" className={tierColors[organization.subscription_tier]}>
                      {organization.subscription_tier}
                    </Badge>
                  )}
                  {organization.subscription_status && (
                    <Badge variant="outline" className={statusColors[organization.subscription_status]}>
                      {organization.subscription_status === "trial" ? "Prueba" :
                       organization.subscription_status === "active" ? "Activa" :
                       organization.subscription_status === "canceled" ? "Cancelada" : "Vencida"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {organization.email}
                  </span>
                  {organization.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Creada: {format(new Date(organization.created_at), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                  {organization.slug && (
                    <a 
                      href={`/${organization.slug}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      /{organization.slug}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{raffles.length}</p>
                  <p className="text-sm text-muted-foreground">Rifas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    Boletos ({stats?.sold || 0} vendidos)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Usuarios</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.revenue || 0)}</p>
                  <p className="text-sm text-muted-foreground">Ingresos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuarios ({users.length})
                </CardTitle>
                <CardDescription>Miembros del equipo de esta organización</CardDescription>
              </div>
              {users.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDeleteAllUsersDialogOpen(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar todos
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No hay usuarios en esta organización</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="hidden md:table-cell">Registrado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.profile?.full_name?.charAt(0) || user.profile?.email?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {user.profile?.full_name || "Sin nombre"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.profile?.email || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {roleLabels[user.role] || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {user.profile?.created_at 
                            ? format(new Date(user.profile.created_at), "d MMM yyyy", { locale: es })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUserToDelete({ 
                              id: user.user_id, 
                              email: user.profile?.email || "usuario" 
                            })}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Raffles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Rifas ({raffles.length})
            </CardTitle>
            <CardDescription>Todas las rifas creadas por esta organización</CardDescription>
          </CardHeader>
          <CardContent>
            {raffles.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No hay rifas en esta organización</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="hidden md:table-cell">Boletos</TableHead>
                      <TableHead className="hidden md:table-cell">Precio</TableHead>
                      <TableHead className="hidden lg:table-cell">Sorteo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {raffles.map((raffle) => (
                      <TableRow key={raffle.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{raffle.title}</div>
                            <div className="text-xs text-muted-foreground">/{raffle.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={raffleStatusColors[raffle.status || "draft"]}>
                            {raffle.status === "draft" ? "Borrador" :
                             raffle.status === "active" ? "Activa" :
                             raffle.status === "paused" ? "Pausada" :
                             raffle.status === "completed" ? "Completada" : "Cancelada"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {raffle.total_tickets.toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(raffle.ticket_price)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {raffle.draw_date 
                            ? format(new Date(raffle.draw_date), "d MMM yyyy", { locale: es })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Zona de Peligro
            </CardTitle>
            <CardDescription>Acciones irreversibles. Procede con precaución.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div>
                <p className="font-medium">Eliminar Organización</p>
                <p className="text-sm text-muted-foreground">
                  Elimina permanentemente la organización y todos sus datos
                </p>
              </div>
              <Button 
                variant="destructive"
                onClick={() => setDeleteOrgDialogOpen(true)}
              >
                Eliminar Organización
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Organization Dialog */}
      <AlertDialog open={deleteOrgDialogOpen} onOpenChange={setDeleteOrgDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminar Organización
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ¿Estás seguro de que deseas eliminar{" "}
                  <strong className="text-foreground">{organization.name}</strong>?
                </p>
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
                  <p className="font-medium text-destructive mb-1">⚠️ Esta acción es irreversible</p>
                  <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                    <li>{raffles.length} rifas y todos sus boletos</li>
                    <li>{users.length} miembros del equipo (desvinculados)</li>
                    <li>Métodos de pago, cupones y configuraciones</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrgMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrg}
              disabled={deleteOrgMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOrgMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Users Dialog */}
      <AlertDialog open={deleteAllUsersDialogOpen} onOpenChange={setDeleteAllUsersDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Users className="h-5 w-5" />
              Eliminar Todos los Usuarios
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ¿Estás seguro de que deseas eliminar los{" "}
                  <strong className="text-foreground">{users.length} usuarios</strong> de esta organización?
                </p>
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
                  <p className="font-medium text-destructive mb-1">⚠️ Nota importante</p>
                  <p className="text-muted-foreground">
                    Los usuarios que sean administradores de plataforma no serán eliminados.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAllUsersMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllUsers}
              disabled={deleteAllUsersMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAllUsersMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar Usuarios"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Single User Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminar Usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar al usuario{" "}
              <strong className="text-foreground">{userToDelete?.email}</strong>?
              Esta acción es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
