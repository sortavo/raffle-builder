import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Ticket, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  organization: {
    id: string;
    name: string;
  };
  inviter: {
    full_name: string | null;
  };
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Registration form state
  const [showRegistration, setShowRegistration] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token de invitación inválido");
      setIsLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select(`
          id,
          email,
          role,
          expires_at,
          accepted_at,
          organization_id
        `)
        .eq("token", token)
        .single();

      if (error || !data) {
        setError("Invitación no encontrada o expirada");
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError("Esta invitación ha expirado");
        return;
      }

      // Check if already accepted
      if (data.accepted_at) {
        setError("Esta invitación ya fue aceptada");
        return;
      }

      // Fetch organization details
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", data.organization_id)
        .single();

      setInvitation({
        ...data,
        organization: org || { id: data.organization_id, name: "Organización" },
        inviter: { full_name: null },
      });
    } catch (err) {
      setError("Error al cargar la invitación");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptAsExistingUser = async () => {
    if (!user || !invitation) return;

    // Check if user email matches invitation
    if (user.email !== invitation.email) {
      toast.error(`Debes iniciar sesión con ${invitation.email} para aceptar esta invitación`);
      return;
    }

    setIsAccepting(true);
    try {
      // Update user's organization
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ organization_id: invitation.organization.id })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Create role assignment
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{
          user_id: user.id,
          organization_id: invitation.organization.id,
          role: invitation.role as "admin" | "member" | "owner",
        }]);

      if (roleError) throw roleError;

      // Mark invitation as accepted
      await supabase
        .from("team_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      toast.success("¡Te has unido al equipo!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Error al aceptar invitación: " + err.message);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsAccepting(true);
    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        toast.info("Revisa tu email para confirmar tu cuenta");
        return;
      }

      // Wait for profile to be created by trigger
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update profile with org and name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          organization_id: invitation.organization.id,
          full_name: fullName,
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      // Create role assignment
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert([{
          user_id: authData.user.id,
          organization_id: invitation.organization.id,
          role: invitation.role as "admin" | "member" | "owner",
        }]);

      if (roleError) throw roleError;

      // Mark invitation as accepted
      await supabase
        .from("team_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      toast.success("¡Cuenta creada y te has unido al equipo!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Invitación - Sortavo</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-destructive/10 mb-4">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Invitación Inválida</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => navigate("/")}>Ir al Inicio</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!invitation) return null;

  const roleLabel = invitation.role === "admin" ? "Administrador" : "Miembro";

  return (
    <>
      <Helmet>
        <title>Aceptar Invitación - Sortavo</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Ticket className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">¡Has sido invitado!</CardTitle>
            <CardDescription className="text-base mt-2">
              Te han invitado a unirte a <strong>{invitation.organization.name}</strong> como <strong>{roleLabel}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {user ? (
              // User is logged in
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground mb-1">Sesión iniciada como</p>
                  <p className="font-medium">{user.email}</p>
                </div>

                {user.email === invitation.email ? (
                  <Button
                    onClick={handleAcceptAsExistingUser}
                    disabled={isAccepting}
                    className="w-full"
                    size="lg"
                  >
                    {isAccepting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Aceptar Invitación
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-destructive text-center">
                      Esta invitación es para <strong>{invitation.email}</strong>. 
                      Inicia sesión con esa cuenta para aceptarla.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        supabase.auth.signOut();
                        navigate(`/auth?redirect=/invite/${token}`);
                      }}
                      className="w-full"
                    >
                      Cambiar de Cuenta
                    </Button>
                  </div>
                )}
              </div>
            ) : showRegistration ? (
              // Registration form
              <form onSubmit={handleRegisterAndAccept} className="space-y-4">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-sm font-medium">{invitation.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    required
                  />
                </div>

                <Button type="submit" disabled={isAccepting} className="w-full" size="lg">
                  {isAccepting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Crear Cuenta y Unirme
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowRegistration(false)}
                  className="w-full"
                >
                  Volver
                </Button>
              </form>
            ) : (
              // Initial options
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">Invitación para</p>
                  <p className="font-medium">{invitation.email}</p>
                </div>

                <Button
                  onClick={() => setShowRegistration(true)}
                  className="w-full"
                  size="lg"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear Cuenta Nueva
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      o si ya tienes cuenta
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => navigate(`/auth?redirect=/invite/${token}`)}
                  className="w-full"
                >
                  Iniciar Sesión
                </Button>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Al aceptar, te unes al equipo de {invitation.organization.name} y aceptas nuestros términos de servicio.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
