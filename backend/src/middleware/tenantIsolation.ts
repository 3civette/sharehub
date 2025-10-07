/**
 * Tenant Isolation Middleware
 * Purpose: Set tenant context for RLS policy enforcement
 * Feature: 003-ora-facciamo-il
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Middleware to set tenant context for RLS policies
 * Uses tenant_id from tokenData (set by authenticateToken middleware)
 */
export async function setTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if token data is available
    if (!req.tokenData?.tenantId) {
      // If no token data, check for admin authentication
      const adminToken = req.headers['x-admin-token'];

      if (adminToken) {
        // Admin requests should set tenant context from subdomain or request body
        // This is handled by the admin middleware from feature 002
        next();
        return;
      }

      // No tenant context available - RLS will block access
      res.status(401).json({
        error: 'Tenant context required',
        message: 'Authentication required to access this resource',
      });
      return;
    }

    // Set tenant context in PostgreSQL session
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.rpc('set_config', {
      setting: 'app.current_tenant_id',
      value: req.tokenData.tenantId,
      is_local: true,
    });

    if (error) {
      console.error('Failed to set tenant context:', error);
      res.status(500).json({
        error: 'Failed to set tenant context',
        message: 'Internal server error',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Tenant isolation error:', error);
    res.status(500).json({
      error: 'Tenant isolation error',
      message: 'Failed to establish tenant context',
    });
  }
}

/**
 * Middleware to set tenant context from admin authentication
 * Used for admin routes that need tenant isolation
 */
export async function setTenantContextFromAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // This assumes admin middleware has already set req.admin with tenant_id
    const tenantId = (req as any).admin?.tenant_id;

    if (!tenantId) {
      res.status(401).json({
        error: 'Admin authentication required',
        message: 'No tenant context available',
      });
      return;
    }

    // Set tenant context
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.rpc('set_config', {
      setting: 'app.current_tenant_id',
      value: tenantId,
      is_local: true,
    });

    if (error) {
      console.error('Failed to set tenant context:', error);
      res.status(500).json({
        error: 'Failed to set tenant context',
        message: 'Internal server error',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Tenant isolation error:', error);
    res.status(500).json({
      error: 'Tenant isolation error',
      message: 'Failed to establish tenant context',
    });
  }
}

/**
 * Middleware to optionally set tenant context if available
 * Doesn't fail if no tenant context exists
 */
export async function optionalTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.tokenData?.tenantId || (req as any).admin?.tenant_id;

    if (tenantId) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.rpc('set_config', {
        setting: 'app.current_tenant_id',
        value: tenantId,
        is_local: true,
      });
    }

    // Continue regardless of whether context was set
    next();
  } catch (error) {
    console.error('Optional tenant context error:', error);
    // Don't fail on optional context errors
    next();
  }
}

// Export all middleware functions
export default {
  setTenantContext,
  setTenantContextFromAdmin,
  optionalTenantContext,
};
