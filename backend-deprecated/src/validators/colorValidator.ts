/**
 * WCAG Color Contrast Validator
 * Implements WCAG 2.1 Level AA contrast requirements
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastValidationResult {
  valid: boolean;
  warnings: string[];
  contrastRatios: {
    primary: number;
    secondary: number;
  };
  recommendations?: {
    primary?: string;
    secondary?: string;
  };
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Calculate relative luminance per WCAG formula
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(rgb: RGB): number {
  // Convert 0-255 to 0-1 range
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  // Apply gamma correction
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(hexToRgb(color1));
  const l2 = relativeLuminance(hexToRgb(color2));

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA for normal text (4.5:1)
 */
export function meetsWCAG_AA(ratio: number, fontSize: 'normal' | 'large' = 'normal'): boolean {
  return fontSize === 'normal' ? ratio >= 4.5 : ratio >= 3.0;
}

/**
 * Check if contrast ratio meets WCAG AAA for normal text (7:1)
 */
export function meetsWCAG_AAA(ratio: number, fontSize: 'normal' | 'large' = 'normal'): boolean {
  return fontSize === 'normal' ? ratio >= 7.0 : ratio >= 4.5;
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Get recommended alternative color with better contrast
 * Simple approach: darken if too light, lighten if too dark
 */
function getRecommendedColor(color: string, background: string): string {
  const colorRgb = hexToRgb(color);
  const bgRgb = hexToRgb(background);

  // Calculate average brightness
  const colorBrightness = (colorRgb.r + colorRgb.g + colorRgb.b) / 3;
  const bgBrightness = (bgRgb.r + bgRgb.g + bgRgb.b) / 3;

  // If background is light (white), return darker color
  if (bgBrightness > 128) {
    // For light backgrounds, recommend 3Civette gold as safe alternative
    return '#D4AF37';
  }

  // For dark backgrounds, return lighter color
  return '#E5E7EB'; // 3Civette silver
}

/**
 * Validate tenant branding colors for WCAG AA compliance
 */
export function validateBrandingColors(
  primary: string,
  secondary: string,
  background: string = '#FFFFFF'
): ContrastValidationResult {
  // Validate hex format
  if (!isValidHexColor(primary)) {
    throw new Error('Primary color must be in hex format (#RRGGBB)');
  }
  if (!isValidHexColor(secondary)) {
    throw new Error('Secondary color must be in hex format (#RRGGBB)');
  }
  if (!isValidHexColor(background)) {
    throw new Error('Background color must be in hex format (#RRGGBB)');
  }

  // Calculate contrast ratios
  const primaryRatio = calculateContrastRatio(primary, background);
  const secondaryRatio = calculateContrastRatio(secondary, background);

  const warnings: string[] = [];
  const recommendations: { primary?: string; secondary?: string } = {};

  // Check primary color
  if (!meetsWCAG_AA(primaryRatio)) {
    warnings.push(
      `Primary color (${primary}) fails WCAG AA contrast (${primaryRatio.toFixed(1)}:1, needs 4.5:1 for normal text)`
    );
    recommendations.primary = getRecommendedColor(primary, background);
  }

  // Check secondary color
  if (!meetsWCAG_AA(secondaryRatio)) {
    warnings.push(
      `Secondary color (${secondary}) fails WCAG AA contrast (${secondaryRatio.toFixed(1)}:1, needs 4.5:1 for normal text)`
    );
    recommendations.secondary = getRecommendedColor(secondary, background);
  }

  return {
    valid: warnings.length === 0,
    warnings,
    contrastRatios: {
      primary: Math.round(primaryRatio * 10) / 10, // Round to 1 decimal
      secondary: Math.round(secondaryRatio * 10) / 10,
    },
    ...(Object.keys(recommendations).length > 0 && { recommendations }),
  };
}
