/**
 * Rate Limit Middleware
 * Purpose: Apply rate limiting to public routes
 * Feature: 003-ora-facciamo-il
 */

import { Request, Response, NextFunction } from 'express';
import {
  rateLimiter,
  uploadRateLimiter,
  authenticatedRateLimiter,
} from '../services/rateLimitService';

/**
 * Apply standard rate limiting (100 req/hour)
 * Use for public event pages, downloads, etc.
 */
export function applyRateLimit(req: Request, res: Response, next: NextFunction): void {
  rateLimiter(req, res, next);
}

/**
 * Apply strict upload rate limiting (20 uploads/hour)
 * Use for slide upload endpoints
 */
export function applyUploadRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  uploadRateLimiter(req, res, next);
}

/**
 * Apply lenient authenticated rate limiting (500 req/hour)
 * Use for organizer dashboard and authenticated endpoints
 */
export function applyAuthenticatedRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  authenticatedRateLimiter(req, res, next);
}

/**
 * Conditional rate limiter based on authentication status
 * - Authenticated users: 500 req/hour
 * - Anonymous users: 100 req/hour
 */
export function applyConditionalRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if request has token authentication
  if (req.tokenData || req.headers['x-admin-token']) {
    // Use lenient rate limit for authenticated users
    authenticatedRateLimiter(req, res, next);
  } else {
    // Use standard rate limit for anonymous users
    rateLimiter(req, res, next);
  }
}

// Export default
export default {
  applyRateLimit,
  applyUploadRateLimit,
  applyAuthenticatedRateLimit,
  applyConditionalRateLimit,
};
