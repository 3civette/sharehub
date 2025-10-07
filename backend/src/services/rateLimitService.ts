/**
 * Rate Limit Service
 * Purpose: Configure rate limiting for public API endpoints
 * Feature: 003-ora-facciamo-il
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter configuration
 * - 100 requests per hour per IP
 * - Memory store for development
 * - Redis store recommended for production
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers

  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response) => {
    const retryAfter = 3600; // 1 hour in seconds

    res.status(429).set('Retry-After', retryAfter.toString()).json({
      error: 'Too many requests from this IP address',
      message: 'You have exceeded the rate limit of 100 requests per hour',
      retryAfter: `${Math.ceil(retryAfter / 60)} minutes`,
    });
  },

  // Skip rate limiting for certain conditions
  skip: (req: Request) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    // Skip for admin requests (identified by X-Admin-Token header)
    if (req.headers['x-admin-token']) {
      return true;
    }

    return false;
  },
});

/**
 * Stricter rate limiter for file uploads
 * - 20 uploads per hour per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    error: 'Too many upload requests, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req: Request, res: Response) => {
    const retryAfter = 3600; // 1 hour in seconds

    res.status(429).set('Retry-After', retryAfter.toString()).json({
      error: 'Too many upload requests',
      message: 'You have exceeded the upload rate limit of 20 files per hour',
      retryAfter: `${Math.ceil(retryAfter / 60)} minutes`,
    });
  },

  skip: (req: Request) => {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    // Don't skip uploads even for admins (prevents abuse)
    return false;
  },
});

/**
 * Lenient rate limiter for authenticated organizers
 * - 500 requests per hour
 */
export const authenticatedRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // Higher limit for authenticated users
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,

  skip: (req: Request) => {
    return process.env.NODE_ENV === 'test';
  },
});

// Export for use in routes
export default rateLimiter;
