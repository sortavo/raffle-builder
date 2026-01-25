/**
 * Theme exports for the Sortavo mobile app
 * Centralized design tokens and common styles
 */

export { colors, type ColorKey } from './colors';
export {
  fontSize,
  fontWeight,
  lineHeight,
  textStyles,
  type FontSizeKey,
  type FontWeightKey,
  type TextStyleKey,
} from './typography';
export {
  spacing,
  borderRadius,
  sizes,
  shadows,
  type SpacingKey,
  type BorderRadiusKey,
  type SizeKey,
  type ShadowKey,
} from './spacing';
export { commonStyles } from './commonStyles';

// Re-export everything as a theme object for convenience
import { colors } from './colors';
import { fontSize, fontWeight, lineHeight, textStyles } from './typography';
import { spacing, borderRadius, sizes, shadows } from './spacing';
import { commonStyles } from './commonStyles';

export const theme = {
  colors,
  fontSize,
  fontWeight,
  lineHeight,
  textStyles,
  spacing,
  borderRadius,
  sizes,
  shadows,
  commonStyles,
} as const;
