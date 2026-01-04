// Color utility functions for dynamic theming

/**
 * Adjusts the brightness of a hex color by a percentage
 * @param hex - The hex color (e.g., "#10b981")
 * @param percent - Positive to lighten, negative to darken
 */
export function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Adjust brightness
  const adjust = (value: number) => {
    const adjusted = value + (value * percent / 100);
    return Math.min(255, Math.max(0, Math.round(adjusted)));
  };
  
  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Converts a hex color to rgba
 * @param hex - The hex color (e.g., "#10b981")
 * @param alpha - Alpha value from 0 to 1
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Creates a gradient string from a primary color
 * @param primaryColor - The primary color
 */
export function createGradientFromColor(primaryColor: string): string {
  const lighter = adjustColorBrightness(primaryColor, 20);
  return `linear-gradient(to right, ${primaryColor}, ${lighter}, ${primaryColor})`;
}
