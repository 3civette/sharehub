// Admin Panel Types
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)

/**
 * Event interfaces
 */
export interface Event {
  id: string;
  tenant_id: string;
  event_name: string;
  event_date: string;  // ISO date (YYYY-MM-DD)
  description: string | null;
  visibility: 'public' | 'private';
  status: 'active' | 'past';  // Computed from event_date
  created_by: string;
  created_at: string;
  updated_at: string;
  branding_overrides?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  } | null;
}

export interface EventCreateInput {
  event_name: string;
  event_date: string;
  description?: string;
  visibility: 'public' | 'private';
}

export interface EventUpdateInput {
  event_name?: string;
  event_date?: string;
  description?: string;
  visibility?: 'public' | 'private';
}

export interface EventListParams {
  sort?: 'date-asc' | 'date-desc' | 'created-desc';
  filter?: 'all' | 'active' | 'past';
}

export interface EventListResponse {
  events: Event[];
  total: number;
}

/**
 * Branding interfaces
 */
export interface Branding {
  primary_color: string;    // Hex color (e.g., "#3B82F6")
  secondary_color: string;  // Hex color
  logo_url: string | null;  // Supabase Storage path or null
}

export interface BrandingUpdateInput {
  primary_color?: string;
  secondary_color?: string;
}

export interface TenantWithBranding {
  id: string;
  subdomain: string;
  hotel_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  branding: Branding;
}

export interface LogoUploadResponse {
  logo_url: string;
}

/**
 * Settings interfaces
 */
export interface TenantSettings {
  id: string;
  hotel_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  billing_info: BillingInfo | null;
}

export interface TenantSettingsUpdateInput {
  hotel_name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export interface BillingInfo {
  plan_name: string;         // e.g., "Pro", "Enterprise"
  renewal_date: string;      // ISO date (YYYY-MM-DD)
  payment_method: string;    // e.g., "Visa •••• 1234"
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  message: string;
  errors?: ValidationError[];
}

/**
 * Default values
 */
export const DEFAULT_BRANDING: Branding = {
  primary_color: '#3B82F6',    // Tailwind blue-500
  secondary_color: '#10B981',  // Tailwind green-500
  logo_url: null
};

export const DEFAULT_HOTEL_NAME = 'Unnamed Hotel';
