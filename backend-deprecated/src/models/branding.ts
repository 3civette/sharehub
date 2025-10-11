// Branding Types
// Feature: 001-voglio-creare-l

export interface Advertisement {
  image_url: string;
  link_url: string;
}

export interface BrandingColors {
  primary: string;   // Hex color format #RRGGBB
  secondary: string; // Hex color format #RRGGBB
}

export interface BrandingConfig {
  colors: BrandingColors;
  logo_url: string | null;
  advertisements: Advertisement[];
}

export interface BrandingOverrideValue<T> {
  value: T;
  customizable: boolean;
}

export interface BrandingOverrides {
  colors?: BrandingOverrideValue<BrandingColors>;
  logo_url?: BrandingOverrideValue<string | null>;
  advertisements?: BrandingOverrideValue<Advertisement[]>;
}

// Helper type for resolved branding (after merging hotel + event overrides)
export interface ResolvedBranding {
  colors: BrandingColors;
  logo_url: string | null;
  advertisements: Advertisement[];
  customizable_elements: {
    colors: boolean;
    logo_url: boolean;
    advertisements: boolean;
  };
}
