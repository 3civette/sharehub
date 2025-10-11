// Admin Authentication Middleware
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extend Express Request to include user and tenantId
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      tenantId?: string;
    }
  }
}

/**
 * Middleware to verify JWT token and check if user is an admin
 * Attaches user and tenantId to request object
 */
export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Check if user is an admin
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id, tenant_id')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData) {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Attach user and tenantId to request
    req.user = {
      id: user.id,
      email: user.email || ''
    };
    req.tenantId = adminData.tenant_id;

    next();
  } catch (error: any) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
}

/**
 * Middleware to verify tenant ID in route param matches authenticated user's tenant
 * Must be used AFTER adminAuth middleware
 */
export function verifyTenantAccess(req: Request, res: Response, next: NextFunction) {
  const tenantIdParam = req.params.tenantId;

  if (!req.tenantId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (tenantIdParam && tenantIdParam !== req.tenantId) {
    return res.status(403).json({ message: 'Access denied to this tenant' });
  }

  next();
}
