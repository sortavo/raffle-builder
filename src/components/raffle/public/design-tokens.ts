// Ultra Premium Enterprise Design Tokens
// Inspired by Linear, Raycast, Vercel, Stripe

export const PREMIUM_TOKENS = {
  // Background colors
  bg: {
    primary: 'bg-[#030712]',        // Near black - main background
    secondary: 'bg-[#0a0f1a]',      // Slightly elevated
    elevated: 'bg-white/[0.03]',    // Ultra subtle cards
    hover: 'bg-white/[0.06]',       // Hover state
    active: 'bg-white/[0.08]',      // Active/pressed state
  },
  
  // Border colors
  border: {
    subtle: 'border-white/[0.06]',
    default: 'border-white/[0.08]',
    hover: 'border-white/[0.12]',
    focus: 'border-emerald-500/50',
  },
  
  // Text colors
  text: {
    primary: 'text-white',
    secondary: 'text-white/70',
    muted: 'text-white/50',
    dimmed: 'text-white/30',
    accent: 'text-emerald-400',
  },
  
  // Accent colors
  accent: {
    primary: 'emerald',             // Main accent
    success: 'emerald',
    warning: 'amber',
    error: 'red',
  },
  
  // Effects
  effects: {
    glassmorphism: 'backdrop-blur-xl',
    glassmorphismHeavy: 'backdrop-blur-2xl',
    shadow: 'shadow-2xl shadow-black/50',
    shadowGlow: 'shadow-[0_0_60px_-12px] shadow-emerald-500/20',
  },
  
  // Spacing (generous)
  spacing: {
    section: 'py-16 lg:py-24',
    container: 'px-5 sm:px-6 lg:px-8',
    card: 'p-5 sm:p-6',
    compact: 'p-3 sm:p-4',
  },
  
  // Border radius
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  },
  
  // Typography
  typography: {
    display: 'text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight',
    h1: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight',
    h2: 'text-2xl sm:text-3xl font-bold tracking-tight',
    h3: 'text-xl sm:text-2xl font-semibold tracking-tight',
    body: 'text-base text-white/70',
    small: 'text-sm text-white/50',
    label: 'text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] text-white/40',
  },
  
  // Transitions
  transition: {
    fast: 'transition-all duration-150 ease-out',
    default: 'transition-all duration-200 ease-out',
    slow: 'transition-all duration-300 ease-out',
    spring: 'transition-all duration-500 ease-out',
  },
} as const;

// CSS variable values for inline styles
export const PREMIUM_COLORS = {
  bg: {
    primary: '#030712',
    secondary: '#0a0f1a',
    card: 'rgba(255, 255, 255, 0.03)',
    cardHover: 'rgba(255, 255, 255, 0.06)',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.08)',
    hover: 'rgba(255, 255, 255, 0.12)',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
    dimmed: 'rgba(255, 255, 255, 0.3)',
  },
  accent: {
    emerald: '#34d399',
    emeraldDark: '#10b981',
    amber: '#fbbf24',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    subtle: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
  },
} as const;

// Helper function to generate glassmorphism styles
export const getGlassStyles = (opacity: number = 0.03, blur: number = 24) => ({
  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: `blur(${blur}px)`,
  WebkitBackdropFilter: `blur(${blur}px)`,
});

// Helper for premium button styles
export const getPremiumButtonStyles = (variant: 'primary' | 'secondary' | 'ghost' = 'primary') => {
  switch (variant) {
    case 'primary':
      return 'bg-white text-[#030712] hover:bg-white/90 font-semibold shadow-lg';
    case 'secondary':
      return 'bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.12]';
    case 'ghost':
      return 'text-white/50 hover:text-white hover:bg-white/[0.06]';
  }
};
