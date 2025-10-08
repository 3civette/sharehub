// Feature 004: Download Rate Limiting Middleware
// Date: 2025-10-07
// Middleware to prevent abuse of slide download endpoints

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for slide downloads
 * Limits: 50 downloads per hour per IP address
 * Applies to: /api/public/slides/:id/download and ZIP generation endpoints
 */
export const downloadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour per IP

  // Use default IP-based key generator (handles IPv6 correctly)
  // No custom keyGenerator needed

  // Custom error message
  message: {
    error: 'Too many download requests',
    message: 'You have exceeded the download limit of 50 files per hour. Please try again later.',
    retryAfter: '1 hour'
  },

  // Standard headers (Retry-After will be set automatically)
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers

  // Skip successful requests in count (only count failed attempts)
  skipSuccessfulRequests: false,

  // Skip failed requests in count
  skipFailedRequests: false,

  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many download requests',
      message: 'You have exceeded the download limit of 50 files per hour. Please try again later.',
      retryAfter: Math.ceil(60 * 60) // seconds until reset
    });
  }
});
