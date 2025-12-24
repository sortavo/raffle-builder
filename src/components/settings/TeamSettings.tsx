import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  User,
  MoreVertical,
  Trash2,
  Mail,
  Loader2,
  Clock,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface TeamMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

const ROLE_LABELS = {
  owner: { label: "Propietario", icon: Crown, color: "bg-yellow-500/10 text-yellow-600" },
  admin: { label: "Administrador", icon: Shield, color: "bg-blue-500/10 text-blue-600" },
  member: { label: "Miembro", icon: User, color: "bg-gray-500/10 text-gray-600" },
};

export function TeamSettings() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["team-members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq("organization_id", organization.id);

      if (error) throw error;

      // Fetch profiles for each member
      const memberIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", memberIds);

      return data.map((member) => ({
        ...member,
        profile: profiles?.find((p) => p.id === member.user_id) || null,
      })) as TeamMember[];
    },
    enabled: !!organization?.id,
  });

  // Fetch pending invitations
  const { data: pendingInvites } = useQuery({
    queryKey: ["pending-invites", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("team_invitations")
        .select("id, email, role, created_at, expires_at")
        .eq("organization_id", organization.id)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: "admin" | "member" }) => {
      const { data, error } = await supabase.functions.invoke("send-team-invite", {
        body: { email, role },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      toast.success("Invitación enviada correctamente");
      setShowInviteDialog(false);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitación cancelada");
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Miembro eliminado del equipo");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setMemberToRemove(null);
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: "admin" | "member" }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rol actualizado");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Ingresa un email válido");
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Equipo</CardTitle>
            <CardDescription>
              Administra los miembros de tu organización
            </CardDescription>
          </div>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar Miembro
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !teamMembers || teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay miembros en el equipo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => {
                const roleInfo = ROLE_LABELS[member.role];
                const isCurrentUser = member.user_id === user?.id;
                const isOwner = member.role === "owner";

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.profile?.full_name || "Usuario"}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">Tú</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={roleInfo.color}>
                        <roleInfo.icon className="mr-1 h-3 w-3" />
                        {roleInfo.label}
                      </Badge>

                      {!isOwner && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === "member" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateRoleMutation.mutate({
                                    memberId: member.id,
                                    newRole: "admin",
                                  })
                                }
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Hacer Administrador
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateRoleMutation.mutate({
                                    memberId: member.id,
                                    newRole: "member",
                                  })
                                }
                              >
                                <User className="mr-2 h-4 w-4" />
                                Cambiar a Miembro
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setMemberToRemove(member)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvites && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Invitaciones Pendientes
            </CardTitle>
            <CardDescription>
              Invitaciones enviadas que aún no han sido aceptadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((invite) => {
              const roleInfo = ROLE_LABELS[invite.role as keyof typeof ROLE_LABELS];
              const expiresAt = new Date(invite.expires_at);
              const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-dashed"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Expira en {daysLeft} día{daysLeft !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={roleInfo?.color || "bg-gray-500/10 text-gray-600"}>
                      {roleInfo?.label || invite.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => cancelInviteMutation.mutate(invite.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Miembro</DialogTitle>
            <DialogDescription>
              Envía una invitación por email para unirse a tu organización
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "admin" | "member")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Administrador</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Miembro</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {inviteRole === "admin"
                  ? "Puede crear, editar y eliminar sorteos"
                  : "Solo puede ver sorteos y aprobar pagos"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Mail className="mr-2 h-4 w-4" />
              Enviar Invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.profile?.full_name || "Este usuario"} será removido
              de tu organización y perderá acceso a todos los sorteos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => memberToRemove && removeMutation.mutate(memberToRemove.id)}
            >
              {removeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
