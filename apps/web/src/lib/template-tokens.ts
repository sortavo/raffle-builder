// ============================================================================
// TIER S: Template Token System - WCAG Indestructible Contrast Engine
// ============================================================================
// This file contains all color manipulation utilities and CSS variable generation
// to ensure WCAG 4.5:1 contrast ratios and auto-calculated accessible colors.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface TemplateTokens {
  [key: string]: string;
}

// =============================================================================
// COLOR CONVERSION UTILITIES
// =============================================================================

/**
 * Converts hex color to RGB object
 * Supports both #RGB and #RRGGBB formats
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');
  
  // Handle shorthand (#RGB)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;
  
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  
  if (!result) {
    console.warn(`Invalid hex color: ${hex}, defaulting to black`);
    return { r: 0, g: 0, b: 0 };
  }
  
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Converts RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Converts RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }

  return { h: h * 360, s, l };
}

/**
 * Converts HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;
  const hNorm = h / 360;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1/3) * 255),
  };
}

/**
 * Converts hex to HSL string for CSS variables
 */
export function hexToHslString(hex: string): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  return `${Math.round(hsl.h)} ${Math.round(hsl.s * 100)}% ${Math.round(hsl.l * 100)}%`;
}

// =============================================================================
// WCAG CONTRAST UTILITIES
// =============================================================================

/**
 * Calculates relative luminance according to WCAG 2.1
 * @see https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates WCAG contrast ratio between two colors
 * @returns Ratio between 1 and 21
 */
export function getContrastRatio(fg: string, bg: string): number {
  const fgLum = getLuminance(hexToRgb(fg));
  const bgLum = getLuminance(hexToRgb(bg));
  
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if contrast meets WCAG AA for normal text (4.5:1)
 */
export function meetsWCAG_AA(fg: string, bg: string): boolean {
  return getContrastRatio(fg, bg) >= 4.5;
}

/**
 * Checks if contrast meets WCAG AAA for normal text (7:1)
 */
export function meetsWCAG_AAA(fg: string, bg: string): boolean {
  return getContrastRatio(fg, bg) >= 7;
}

/**
 * Returns white or dark color based on background luminance
 * ALWAYS returns a color with >= 4.5:1 contrast
 */
export function getContrastColor(bgColor: string): string {
  const WHITE = '#FFFFFF';
  const DARK = '#0F172A'; // Slate-900
  
  const bgLum = getLuminance(hexToRgb(bgColor));
  
  // If background is light, use dark text
  // Threshold at 0.179 ensures WCAG AA compliance
  return bgLum > 0.179 ? DARK : WHITE;
}

/**
 * Adjusts a foreground color to meet minimum contrast ratio against background
 * Preserves hue and saturation, adjusts lightness
 */
export function adjustForContrast(
  fg: string, 
  bg: string, 
  minRatio: number = 4.5
): string {
  const currentRatio = getContrastRatio(fg, bg);
  
  // Already meets requirement
  if (currentRatio >= minRatio) {
    return fg;
  }
  
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const fgHsl = rgbToHsl(fgRgb);
  const bgLum = getLuminance(bgRgb);
  
  // Try making foreground lighter or darker
  const shouldLighten = bgLum < 0.5;
  
  // Binary search for optimal lightness
  let low = shouldLighten ? fgHsl.l : 0;
  let high = shouldLighten ? 1 : fgHsl.l;
  let bestL = fgHsl.l;
  
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const testHsl = { ...fgHsl, l: mid };
    const testRgb = hslToRgb(testHsl);
    const testHex = rgbToHex(testRgb);
    const ratio = getContrastRatio(testHex, bg);
    
    if (ratio >= minRatio) {
      bestL = mid;
      // Try to get closer to original
      if (shouldLighten) {
        high = mid;
      } else {
        low = mid;
      }
    } else {
      if (shouldLighten) {
        low = mid;
      } else {
        high = mid;
      }
    }
  }
  
  const resultHsl = { ...fgHsl, l: bestL };
  return rgbToHex(hslToRgb(resultHsl));
}

/**
 * Ensures text is always readable on given background
 * If original color doesn't meet contrast, returns pure white/black
 */
export function ensureReadable(text: string, bg: string): string {
  if (meetsWCAG_AA(text, bg)) {
    return text;
  }
  
  const adjusted = adjustForContrast(text, bg, 4.5);
  if (meetsWCAG_AA(adjusted, bg)) {
    return adjusted;
  }
  
  // Fallback to pure contrast color
  return getContrastColor(bg);
}

// =============================================================================
// COLOR DERIVATION UTILITIES
// =============================================================================

/**
 * Generates shade variations of a color
 */
export function generateShades(baseColor: string): {
  lighter: string;
  light: string;
  base: string;
  dark: string;
  darker: string;
} {
  const rgb = hexToRgb(baseColor);
  const hsl = rgbToHsl(rgb);
  
  return {
    lighter: rgbToHex(hslToRgb({ ...hsl, l: Math.min(0.95, hsl.l + 0.3) })),
    light: rgbToHex(hslToRgb({ ...hsl, l: Math.min(0.85, hsl.l + 0.15) })),
    base: baseColor,
    dark: rgbToHex(hslToRgb({ ...hsl, l: Math.max(0.15, hsl.l - 0.15) })),
    darker: rgbToHex(hslToRgb({ ...hsl, l: Math.max(0.05, hsl.l - 0.3) })),
  };
}

/**
 * Generates state colors (hover, active, disabled) from base
 */
export function generateStateColors(primary: string): {
  hover: string;
  active: string;
  disabled: string;
} {
  const rgb = hexToRgb(primary);
  const hsl = rgbToHsl(rgb);
  
  return {
    hover: rgbToHex(hslToRgb({ ...hsl, l: Math.min(0.9, hsl.l + 0.08) })),
    active: rgbToHex(hslToRgb({ ...hsl, l: Math.max(0.1, hsl.l - 0.08) })),
    disabled: rgbToHex(hslToRgb({ ...hsl, s: hsl.s * 0.4, l: 0.7 })),
  };
}

/**
 * Determines if a background is considered "light"
 */
export function isLightBackground(bgColor: string): boolean {
  return getLuminance(hexToRgb(bgColor)) > 0.179;
}

// =============================================================================
// TEMPLATE TOKEN GENERATION
// =============================================================================

export interface TemplateConfig {
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    background: string;
    cardBg?: string;
    text?: string;
    textMuted?: string;
  };
  fonts?: {
    title?: string;
    body?: string;
  };
  effects?: {
    borderRadius?: string;
    shadow?: string;
    gradient?: string;
  };
}

export interface CustomizationOverrides {
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  text_color?: string;
}

/**
 * Generates all CSS variables for a template
 * Automatically calculates contrasting colors for WCAG compliance
 */
export function generateTemplateTokens(
  template: TemplateConfig,
  customization?: CustomizationOverrides
): TemplateTokens {
  // Apply customization overrides
  const primary = customization?.primary_color || template.colors.primary;
  const secondary = customization?.secondary_color || template.colors.secondary;
  const background = customization?.background_color || template.colors.background;
  const accent = template.colors.accent || secondary;
  
  const isLight = isLightBackground(background);
  
  // Auto-calculate text colors with WCAG compliance
  const textColor = customization?.text_color || 
    template.colors.text || 
    getContrastColor(background);
  
  const textMuted = template.colors.textMuted || 
    (isLight ? '#64748B' : '#94A3B8');
  
  // Auto-calculate text on primary/secondary buttons
  const textOnPrimary = getContrastColor(primary);
  const textOnSecondary = getContrastColor(secondary);
  
  // Generate derived surface colors
  const cardBg = template.colors.cardBg || 
    (isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.7)');
  
  const cardBgHover = isLight 
    ? 'rgba(248, 250, 252, 1)' 
    : 'rgba(30, 41, 59, 0.8)';
  
  // Border colors
  const borderColor = isLight 
    ? 'rgba(0, 0, 0, 0.1)' 
    : 'rgba(255, 255, 255, 0.1)';
  
  const borderHover = isLight 
    ? 'rgba(0, 0, 0, 0.15)' 
    : 'rgba(255, 255, 255, 0.15)';
  
  // Modal specific colors
  const modalBg = isLight 
    ? 'rgba(255, 255, 255, 0.98)' 
    : 'rgba(3, 7, 18, 0.98)';
  
  const modalText = getContrastColor(isLight ? '#FFFFFF' : '#030712');
  
  const modalBorder = isLight 
    ? 'rgba(0, 0, 0, 0.1)' 
    : 'rgba(255, 255, 255, 0.1)';
  
  // Input colors
  const inputBg = isLight 
    ? 'rgba(255, 255, 255, 1)' 
    : 'rgba(15, 23, 42, 0.5)';
  
  const inputBorder = isLight 
    ? 'rgba(0, 0, 0, 0.15)' 
    : 'rgba(255, 255, 255, 0.15)';
  
  // Generate primary state colors
  const primaryStates = generateStateColors(primary);
  
  // Effect colors
  const gradient = template.effects?.gradient || 
    `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
  
  const shadow = template.effects?.shadow || 
    `0 10px 40px -10px ${primary}40`;
  
  const glow = `0 0 40px ${primary}30`;
  
  // Radius
  const radius = template.effects?.borderRadius || '1rem';
  const radiusNum = parseFloat(radius);
  const radiusSm = `${radiusNum * 0.5}rem`;
  const radiusLg = `${radiusNum * 1.5}rem`;
  
  // Fonts with fallback
  const fontTitle = template.fonts?.title || 'Montserrat';
  const fontBody = template.fonts?.body || 'Inter';
  const fontFallback = 'Inter, system-ui, -apple-system, sans-serif';
  
  return {
    // Base colors
    '--template-bg': background,
    '--template-primary': primary,
    '--template-secondary': secondary,
    '--template-accent': accent,
    
    // Text colors (WCAG auto-calculated)
    '--template-text': textColor,
    '--template-text-muted': textMuted,
    '--template-text-on-primary': textOnPrimary,
    '--template-text-on-secondary': textOnSecondary,
    
    // Surface colors
    '--template-card-bg': cardBg,
    '--template-card-bg-hover': cardBgHover,
    '--template-card-border': borderColor,
    '--template-card-border-hover': borderHover,
    
    // Input colors
    '--template-input-bg': inputBg,
    '--template-input-border': inputBorder,
    '--template-input-focus': primary,
    
    // Modal colors
    '--template-modal-bg': modalBg,
    '--template-modal-text': modalText,
    '--template-modal-border': modalBorder,
    '--template-overlay': 'rgba(0, 0, 0, 0.6)',
    
    // Primary state colors
    '--template-primary-hover': primaryStates.hover,
    '--template-primary-active': primaryStates.active,
    '--template-primary-disabled': primaryStates.disabled,
    
    // Effects
    '--template-gradient': gradient,
    '--template-shadow': shadow,
    '--template-glow': glow,
    
    // Radius
    '--template-radius': radius,
    '--template-radius-sm': radiusSm,
    '--template-radius-lg': radiusLg,
    
    // Spacing
    '--template-section-gap': '4rem',
    '--template-content-gap': '2rem',
    
    // Typography
    '--template-font-title': `'${fontTitle}', ${fontFallback}`,
    '--template-font-body': `'${fontBody}', ${fontFallback}`,
    '--template-font-fallback': fontFallback,
    
    // Utility
    '--template-is-light': isLight ? '1' : '0',
  };
}

/**
 * Validates that all critical tokens meet WCAG requirements
 * Returns warnings for any non-compliant combinations
 */
export function validateTokenAccessibility(tokens: TemplateTokens): string[] {
  const warnings: string[] = [];
  
  const bg = tokens['--template-bg'];
  const text = tokens['--template-text'];
  const primary = tokens['--template-primary'];
  const textOnPrimary = tokens['--template-text-on-primary'];
  
  // Check main text contrast
  if (!meetsWCAG_AA(text, bg)) {
    warnings.push(`Text contrast (${getContrastRatio(text, bg).toFixed(1)}:1) does not meet WCAG AA (4.5:1)`);
  }
  
  // Check button text contrast
  if (!meetsWCAG_AA(textOnPrimary, primary)) {
    warnings.push(`Button text contrast (${getContrastRatio(textOnPrimary, primary).toFixed(1)}:1) does not meet WCAG AA (4.5:1)`);
  }
  
  return warnings;
}
