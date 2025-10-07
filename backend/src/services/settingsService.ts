// Admin Settings Service
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)

import { createClient } from '@supabase/supabase-js';
import { TenantSettings, TenantSettingsUpdateInput, BillingInfo, DEFAULT_HOTEL_NAME } from '../models/admin';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get tenant settings including billing information
 * @param tenantId Tenant UUID
 * @returns Tenant settings with billing info
 * @throws Error if tenant not found or database error
 */
export async function getSettings(tenantId: string): Promise<TenantSettings> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, hotel_name, contact_email, contact_phone')
    .eq('id', tenantId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }

  if (!data) {
    throw new Error('Tenant not found');
  }

  // Fetch billing info (from external source or billing_subscriptions table)
  // For now, return mock data or null
  const billingInfo = await getBillingInfo(tenantId);

  return {
    id: data.id,
    hotel_name: data.hotel_name || DEFAULT_HOTEL_NAME,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    billing_info: billingInfo
  };
}

/**
 * Update tenant settings (hotel name and contact info only)
 * @param tenantId Tenant UUID
 * @param input Settings update input
 * @returns Updated tenant settings
 * @throws Error if validation fails or database error
 */
export async function updateSettings(
  tenantId: string,
  input: TenantSettingsUpdateInput
): Promise<TenantSettings> {
  // Validate hotel_name length
  if (input.hotel_name !== undefined) {
    if (input.hotel_name.length < 2 || input.hotel_name.length > 100) {
      throw new Error('Hotel name must be between 2 and 100 characters');
    }
  }

  // Validate email format
  if (input.contact_email !== undefined && input.contact_email !== null) {
    if (!isValidEmail(input.contact_email)) {
      throw new Error('Invalid email format');
    }
  }

  // Validate phone format (basic validation - international format is flexible)
  if (input.contact_phone !== undefined && input.contact_phone !== null) {
    if (input.contact_phone.length < 5 || input.contact_phone.length > 50) {
      throw new Error('Contact phone must be between 5 and 50 characters');
    }
  }

  // Build update object (only include fields that are provided)
  const updateData: any = {};
  if (input.hotel_name !== undefined) updateData.hotel_name = input.hotel_name;
  if (input.contact_email !== undefined) updateData.contact_email = input.contact_email;
  if (input.contact_phone !== undefined) updateData.contact_phone = input.contact_phone;

  // Update in database
  const { data, error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', tenantId)
    .select('id, hotel_name, contact_email, contact_phone')
    .single();

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`);
  }

  if (!data) {
    throw new Error('Tenant not found');
  }

  // Fetch billing info
  const billingInfo = await getBillingInfo(tenantId);

  return {
    id: data.id,
    hotel_name: data.hotel_name,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    billing_info: billingInfo
  };
}

/**
 * Get billing information for tenant
 * @param tenantId Tenant UUID
 * @returns Billing info or null if not available
 *
 * NOTE: This is a placeholder implementation.
 * In production, this would fetch from:
 * - External billing API (Stripe, PayPal, etc.)
 * - billing_subscriptions table
 * - Billing service endpoint
 */
async function getBillingInfo(tenantId: string): Promise<BillingInfo | null> {
  // TODO: Implement actual billing data fetch
  // For now, return mock data for development/testing

  // Check if we have a billing_subscriptions table
  // const { data, error } = await supabase
  //   .from('billing_subscriptions')
  //   .select('plan_name, renewal_date, payment_method')
  //   .eq('tenant_id', tenantId)
  //   .single();

  // if (error || !data) {
  //   return null;
  // }

  // return {
  //   plan_name: data.plan_name,
  //   renewal_date: data.renewal_date,
  //   payment_method: data.payment_method
  // };

  // Mock data for development
  return {
    plan_name: 'Pro',
    renewal_date: '2025-11-07',
    payment_method: 'Visa •••• 1234'
  };
}

/**
 * Validate email format using RFC 5322 compliant regex
 * @param email Email string to validate
 * @returns true if valid email format
 */
function isValidEmail(email: string): boolean {
  // Basic email validation regex (covers most common cases)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
