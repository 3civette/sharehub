/**
 * Token Authentication Middleware
 * Purpose: Validate access tokens and attach user context to requests
 * Feature: 003-ora-facciamo-il
 */

import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/tokenService';
import type { AccessToken } from '../models/accessToken';

// Extend Express Request interface to include token data
declare global {
  namespace Express {
    interface Request {
      tokenData?: {
        token: AccessToken;
        eventId: string;
        tenantId: string;
        isOrganizer: boolean;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using access tokens
 * Token can be provided via query parameter or Authorization header
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from query param or Authorization header
    let token: string | undefined;

    // Check query parameter first (e.g., ?token=xxx)
    if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    // Check Authorization header (Bearer token)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No access token provided',
      });
      return;
    }

    // Validate token
    const validation = await tokenService.validateToken(token);

    if (!validation.valid || !validation.token) {
      res.status(403).json({
        error: 'Invalid or expired token',
        message: validation.error || 'Token validation failed',
      });
      return;
    }

    // Update last used timestamp (non-blocking)
    tokenService.updateLastUsed(validation.token.id).catch((err) => {
      console.error('Failed to update token usage:', err);
    });

    // Get event to retrieve tenant_id
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: event } = await supabase
      .from('events')
      .select('tenant_id')
      .eq('id', validation.token.event_id)
      .single();

    if (!event) {
      res.status(404).json({
        error: 'Event not found',
        message: 'The event associated with this token does not exist',
      });
      return;
    }

    // Attach token data to request
    req.tokenData = {
      token: validation.token,
      eventId: validation.token.event_id,
      tenantId: event.tenant_id,
      isOrganizer: validation.token.type === 'organizer',
    };

    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to authenticate token',
    });
  }
}

/**
 * Middleware to require organizer permissions
 * Must be used after authenticateToken middleware
 */
export function requireOrganizer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tokenData) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'No token data found',
    });
    return;
  }

  if (!req.tokenData.isOrganizer) {
    res.status(403).json({
      error: 'Insufficient permissions',
      message: 'This action requires organizer access',
    });
    return;
  }

  next();
}

/**
 * Middleware to optionally authenticate token (doesn't fail if no token)
 * Used for public endpoints that benefit from token data when available
 */
export async function optionalTokenAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token
    let token: string | undefined;

    if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    // If no token, continue without authentication
    if (!token) {
      next();
      return;
    }

    // Validate token
    const validation = await tokenService.validateToken(token);

    if (validation.valid && validation.token) {
      // Get event to retrieve tenant_id
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: event } = await supabase
        .from('events')
        .select('tenant_id')
        .eq('id', validation.token.event_id)
        .single();

      if (event) {
        req.tokenData = {
          token: validation.token,
          eventId: validation.token.event_id,
          tenantId: event.tenant_id,
          isOrganizer: validation.token.type === 'organizer',
        };

        // Update usage
        tokenService.updateLastUsed(validation.token.id).catch(() => {});
      }
    }

    // Continue regardless of validation result
    next();
  } catch (error) {
    // Don't fail on optional auth errors
    console.error('Optional token auth error:', error);
    next();
  }
}
