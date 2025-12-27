import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle, ArrowLeft, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary/80 to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              Sortavo
            </span>
          </Link>

          {/* 404 Number */}
          <div className="relative">
            <motion.h1 
              className="text-[10rem] leading-none font-black bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent drop-shadow-sm"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              404
            </motion.h1>
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />
          </div>

          {/* Error icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-warning/20 to-warning/30 shadow-lg"
          >
            <AlertTriangle className="w-8 h-8 text-warning" />
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h2 className="text-2xl font-bold text-foreground">
              ¡Oops! Página no encontrada
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              La página que buscas no existe o fue movida. Verifica la URL o regresa al inicio.
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4"
          >
            <Button
              asChild
              className="bg-gradient-to-r from-primary via-primary/80 to-accent hover:from-primary/90 hover:via-primary/70 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Ir al Inicio
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-primary/20 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver Atrás
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
