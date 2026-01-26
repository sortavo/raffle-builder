import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Trophy, CheckCircle, XCircle, UserPlus, Users, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useScopedDarkMode } from "@/hooks/useScopedDarkMode";

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
  // Activate Ultra-Dark theme
  useScopedDarkMode();
  
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
      // Use secure RPC function to get invitation by token
      // This prevents enumeration of invitation tokens
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { p_token: token })
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
      <div className="min-h-screen flex items-center justify-center bg-ultra-dark">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Invitación - Sortavo</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-ultra-dark p-4 relative overflow-hidden">
          {/* Background blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10"
          >
            <Card className="w-full max-w-md shadow-xl bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
                    <XCircle className="h-8 w-8 text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-white">Invitación Inválida</h2>
                  <p className="text-white/60 mb-6">{error}</p>
                  <Button 
                    onClick={() => navigate("/")}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                  >
                    Ir al Inicio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
      <div className="min-h-screen flex items-center justify-center bg-ultra-dark p-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Sortavo
            </span>
          </Link>

          <Card className="shadow-xl bg-white/[0.03] border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <CardHeader className="text-center pb-4 bg-white/[0.02]">
              <div className="flex justify-center mb-4">
                <motion.div 
                  className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 relative"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Users className="h-8 w-8 text-emerald-400" />
                  <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400" />
                </motion.div>
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                ¡Has sido invitado!
              </CardTitle>
              <CardDescription className="text-base mt-2 text-white/60">
                Te han invitado a unirte a <strong className="text-emerald-400">{invitation.organization.name}</strong> como <strong className="text-emerald-400">{roleLabel}</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {user ? (
                // User is logged in
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-sm text-white/60 mb-1">Sesión iniciada como</p>
                    <p className="font-semibold text-white">{user.email}</p>
                  </div>

                  {user.email === invitation.email ? (
                    <Button
                      onClick={handleAcceptAsExistingUser}
                      disabled={isAccepting}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 transition-all duration-300"
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
                      <p className="text-sm text-red-400 text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                        Esta invitación es para <strong>{invitation.email}</strong>. 
                        Inicia sesión con esa cuenta para aceptarla.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          supabase.auth.signOut();
                          navigate(`/auth?redirect=/invite/${token}`);
                        }}
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        Cambiar de Cuenta
                      </Button>
                    </div>
                  )}
                </div>
              ) : showRegistration ? (
                // Registration form
                <form onSubmit={handleRegisterAndAccept} className="space-y-4">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-sm font-medium text-white">{invitation.email}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-white/80">Nombre Completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      variant="dark"
                      className="border-white/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/80">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      variant="dark"
                      className="border-white/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white/80">Confirmar Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      required
                      variant="dark"
                      className="border-white/20 focus:border-emerald-500"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isAccepting} 
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 transition-all duration-300" 
                    size="lg"
                  >
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
                    className="w-full text-white/60 hover:text-white hover:bg-white/10"
                  >
                    Volver
                  </Button>
                </form>
              ) : (
                // Initial options
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-sm text-white/60">Invitación para</p>
                    <p className="font-semibold text-white">{invitation.email}</p>
                  </div>

                  <Button
                    onClick={() => setShowRegistration(true)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 transition-all duration-300"
                    size="lg"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crear Nueva Cuenta
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-ultra-dark-card px-2 text-white/40">
                        ¿Ya tienes cuenta?
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => navigate(`/auth?redirect=/invite/${token}`)}
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    size="lg"
                  >
                    Iniciar Sesión
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
