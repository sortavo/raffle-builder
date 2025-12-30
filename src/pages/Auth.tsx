import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { z } from "zod";
import sortavoLogo from "@/assets/sortavo-logo.png";

const emailSchema = z.string().email("Ingresa un correo electrónico válido");
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres");

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, resetPassword, isLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && !isLoading) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  const validateForm = (type: "login" | "signup" | "reset") => {
    const newErrors: Record<string, string> = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    if (type !== "reset") {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0].message;
        }
      }
    }

    if (type === "signup" && !fullName.trim()) {
      newErrors.fullName = "Ingresa tu nombre completo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm("login")) return;
    
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Credenciales incorrectas", {
          description: "Revisa tu correo y contraseña e intenta de nuevo.",
        });
      } else {
        toast.error("Error al iniciar sesión", {
          description: error.message,
        });
      }
    } else {
      toast.success("¡Bienvenido!");
      navigate("/dashboard");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm("signup")) return;
    
    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Este correo ya está registrado", {
          description: "Intenta iniciar sesión o usa otro correo.",
        });
      } else {
        toast.error("Error al crear cuenta", {
          description: error.message,
        });
      }
    } else {
      toast.success("¡Cuenta creada exitosamente!", {
        description: "Completa tu perfil para continuar.",
      });
      const plan = searchParams.get("plan");
      const onboardingUrl = plan ? `/onboarding?plan=${plan}` : "/onboarding";
      navigate(onboardingUrl);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm("reset")) return;
    
    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    setIsSubmitting(false);

    if (error) {
      toast.error("Error al enviar correo", {
        description: error.message,
      });
    } else {
      toast.success("Correo enviado", {
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
      setActiveTab("login");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Premium Dark Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950/30" />
      
      {/* Animated Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Back to Home */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors z-10"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Inicio</span>
      </Link>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <img 
            src={sortavoLogo} 
            alt="Sortavo" 
            className="h-12 w-auto"
          />
        </div>

        <Card className="backdrop-blur-sm bg-gray-900/80 border-white/10 shadow-2xl shadow-emerald-600/10">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-400 text-gray-400">
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-400 text-gray-400">
                Crear Cuenta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader className="text-center">
                  <CardTitle className="text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Bienvenido de vuelta
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Ingresa a tu cuenta para administrar tus sorteos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-gray-300">Correo electrónico</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 ${errors.email ? "border-red-500" : ""}`}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-gray-300">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 pr-10 ${errors.password ? "border-red-500" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-400">{errors.password}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("reset")}
                    className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardHeader className="text-center">
                  <CardTitle className="text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Crea tu cuenta
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Comienza a crear sorteos profesionales en minutos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-gray-300">Nombre completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 ${errors.fullName ? "border-red-500" : ""}`}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-red-400">{errors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300">Correo electrónico</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 ${errors.email ? "border-red-500" : ""}`}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-300">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 pr-10 ${errors.password ? "border-red-500" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-400">{errors.password}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      "Crear Cuenta"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              <form onSubmit={handleResetPassword}>
                <CardHeader className="text-center">
                  <CardTitle className="text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Restablecer contraseña
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Te enviaremos un enlace para crear una nueva contraseña
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-gray-300">Correo electrónico</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 ${errors.email ? "border-red-500" : ""}`}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400">{errors.email}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar enlace"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    Volver a iniciar sesión
                  </button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="mt-8 text-center text-sm text-gray-400">
          ¿Necesitas ayuda?{" "}
          <a href="mailto:soporte@sortavo.com" className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors">
            Contáctanos
          </a>
        </p>
      </div>
    </div>
  );
}
