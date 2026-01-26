import { cn } from "@/lib/utils";

interface PremiumBackgroundProps {
  children: React.ReactNode;
  variant?: 'dark' | 'hero-only';
  className?: string;
  showGrid?: boolean;
  showOrbs?: boolean;
  showNoise?: boolean;
}

export function PremiumBackground({ 
  children, 
  variant = 'dark',
  className,
  showGrid = true,
  showOrbs = true,
  showNoise = true 
}: PremiumBackgroundProps) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      {/* Premium Ultra-Dark Background with multi-layer gradient */}
      <div className="absolute inset-0 bg-premium-hero" />
      
      {/* 6 Animated Orbs - TIER S: Stripe/Linear level */}
      {showOrbs && (
        <>
          {/* Primary large emerald orb - top left */}
          <div className="absolute top-[10%] -left-[10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] animate-blob" />
          
          {/* Secondary amber orb - top right */}
          <div className="absolute top-[5%] -right-[15%] w-[500px] h-[500px] bg-amber-500/12 rounded-full blur-[120px] animate-blob animation-delay-2000" />
          
          {/* Tertiary teal orb - center */}
          <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-teal-500/15 rounded-full blur-[100px] animate-blob animation-delay-4000" />
          
          {/* Fourth orb - purple accent for variety */}
          <div className="absolute bottom-[30%] right-[10%] w-[350px] h-[350px] bg-violet-500/10 rounded-full blur-[100px] animate-blob animation-delay-1000" />
          
          {/* Fifth orb - emerald bottom left */}
          <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] bg-emerald-500/15 rounded-full blur-[80px] animate-blob animation-delay-500" />
          
          {/* Sixth orb - small teal accent */}
          <div className="absolute top-[60%] right-[30%] w-[250px] h-[250px] bg-teal-400/10 rounded-full blur-[80px] animate-blob animation-delay-300" />
        </>
      )}
      
      {/* Grid pattern overlay - premium 64px grid */}
      {showGrid && (
        <div className="absolute inset-0 bg-grid-premium" />
      )}
      
      {/* Noise texture for depth - TIER S requirement */}
      {showNoise && (
        <div className="absolute inset-0 noise-texture" />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Hero section specific wrapper - TIER S
export function PremiumHero({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <section className={cn("relative pt-28 pb-20 lg:pt-36 lg:pb-32 xl:pb-40 overflow-hidden", className)}>
      {/* Premium Ultra-Dark Background */}
      <div className="absolute inset-0 bg-premium-hero" />
      
      {/* 6 Animated orbs - TIER S */}
      <div className="absolute top-[10%] -left-[10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] animate-blob" />
      <div className="absolute top-[5%] -right-[15%] w-[500px] h-[500px] bg-amber-500/12 rounded-full blur-[120px] animate-blob animation-delay-2000" />
      <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-teal-500/15 rounded-full blur-[100px] animate-blob animation-delay-4000" />
      <div className="absolute bottom-[30%] right-[10%] w-[350px] h-[350px] bg-violet-500/10 rounded-full blur-[100px] animate-blob animation-delay-1000" />
      <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] bg-emerald-500/15 rounded-full blur-[80px] animate-blob animation-delay-500" />
      <div className="absolute top-[60%] right-[30%] w-[250px] h-[250px] bg-teal-400/10 rounded-full blur-[80px] animate-blob animation-delay-300" />
      
      {/* Grid pattern - 64px premium */}
      <div className="absolute inset-0 bg-grid-premium" />
      
      {/* Noise texture */}
      <div className="absolute inset-0 noise-texture" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}

// Contrasting Section - Emerald gradient for visual rhythm
export function PremiumSectionEmerald({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <section className={cn("relative py-24 lg:py-32 xl:py-40 overflow-hidden", className)}>
      {/* Emerald gradient background - creates contrast with ultra-dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-teal-950/30" />
      
      {/* Subtle orbs */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-teal-500/8 rounded-full blur-[80px]" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      {/* Top and bottom border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      
      {/* Noise texture */}
      <div className="absolute inset-0 noise-texture" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
