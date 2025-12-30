import { cn } from "@/lib/utils";

interface PremiumBackgroundProps {
  children: React.ReactNode;
  variant?: 'dark' | 'hero-only';
  className?: string;
  showGrid?: boolean;
  showOrbs?: boolean;
}

export function PremiumBackground({ 
  children, 
  variant = 'dark',
  className,
  showGrid = true,
  showOrbs = true 
}: PremiumBackgroundProps) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      {/* Premium Dark Background with emerald tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950/30" />
      
      {/* Animated emerald gradient orbs */}
      {showOrbs && (
        <>
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </>
      )}
      
      {/* Grid pattern overlay - subtle on dark */}
      {showGrid && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Hero section specific wrapper
export function PremiumHero({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <section className={cn("relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden", className)}>
      {/* Premium Dark Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950/30" />
      
      {/* Animated orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
