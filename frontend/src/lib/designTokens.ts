/**
 * 3Civette Design System Tokens
 * Central source of truth for Meeting Hub design values
 */

export interface DesignTokens {
  colors: {
    brand: {
      black: string;
      ink: string;
      gold: string;
      silver: string;
    };
    bg: string;
    bgSoft: string;
    ok: string;
    warn: string;
    error: string;
  };
  spacing: {
    1: string;
    2: string;
    3: string;
    4: string;
    6: string;
    8: string;
    12: string;
    16: string;
  };
  fonts: {
    display: string;
    sans: string;
  };
  radius: {
    default: string;
    lg: string;
  };
  shadow: {
    brand: string;
  };
  typography: {
    h1Desktop: string;
    h1Mobile: string;
    h2: string;
    h3: string;
    body: string;
    caption: string;
    lineHeight: number;
  };
}

export const designTokens: DesignTokens = {
  colors: {
    brand: {
      black: '#0B0B0C',
      ink: '#111827',
      gold: '#D4AF37',
      silver: '#E5E7EB',
    },
    bg: '#FFFFFF',
    bgSoft: '#F8FAFC',
    ok: '#16a34a',
    warn: '#f59e0b',
    error: '#dc2626',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    16: '64px',
  },
  fonts: {
    display: '"Archivo Black", "Bebas Neue", system-ui, sans-serif',
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  radius: {
    default: '16px',
    lg: '20px',
  },
  shadow: {
    brand: '0 8px 24px rgba(0, 0, 0, 0.08)',
  },
  typography: {
    h1Desktop: '48px',
    h1Mobile: '36px',
    h2: '32px',
    h3: '24px',
    body: '16px',
    caption: '14px',
    lineHeight: 1.6,
  },
};

/**
 * Default branding colors (3Civette)
 * Used as fallback when tenant has no custom branding
 */
export const defaultBrandingColors = {
  primary: designTokens.colors.brand.gold,
  secondary: designTokens.colors.brand.black,
};
