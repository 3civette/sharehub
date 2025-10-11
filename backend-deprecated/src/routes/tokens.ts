/**
 * Tokens Routes
 * Feature: 003-ora-facciamo-il (enhanced by 005-ora-bisogna-implementare)
 * Purpose: API endpoints for token management with QR code generation
 * Contract: specs/005-ora-bisogna-implementare/contracts/tokens-api.md
 */

import express, { Request, Response } from 'express';
import { tokenService } from '../services/tokenService';

const router = express.Router();

/**
 * POST /api/events/:eventId/tokens
 * Generate a token for a private event
 */
router.post('/events/:eventId/tokens', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { type, expires_at } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    if (!expires_at) {
      return res.status(400).json({ error: 'expires_at is required' });
    }

    // Create tokens for event (returns both organizer and participant)
    const tokens = await tokenService.createTokensForEvent(eventId, expires_at);

    // Get the token ID from database for the requested type
    const tokenList = await tokenService.getTokensForEvent(eventId);
    const createdToken = tokenList.find(t => t.type === type && t.token === tokens[type as 'organizer' | 'participant']);

    if (!createdToken) {
      throw new Error('Token created but not found in database');
    }

    res.status(201).json(createdToken);
  } catch (error) {
    console.error('Token generation error:', error);
    const statusCode = error instanceof Error && error.message.includes('not private') ? 403 : 500;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to generate token',
    });
  }
});

/**
 * GET /api/events/:eventId/tokens
 * Get all tokens for an event (with optional status filter)
 */
router.get('/events/:eventId/tokens', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    const statusFilter = status as 'active' | 'revoked' | 'expired' | 'all' | undefined;
    const tokens = await tokenService.getTokensByStatus(eventId, statusFilter);

    res.json({
      tokens,
      total: tokens.length,
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get tokens',
    });
  }
});

/**
 * POST /api/tokens/validate
 * Validate a token (public endpoint for token entry)
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { token, event_id } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const result = event_id
      ? await tokenService.validateTokenForEvent(token, event_id)
      : await tokenService.validateToken(token);

    if (result.valid) {
      // Update last_used_at and use_count
      if (result.token?.id) {
        await tokenService.updateLastUsed(result.token.id);
      }

      res.json({
        valid: true,
        token: result.token,
      });
    } else {
      res.status(401).json({
        valid: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to validate token',
    });
  }
});

/**
 * GET /api/events/:eventId/tokens/:tokenId/qr
 * Generate QR code for a token
 * Feature 005: Supports PNG (data URL) and SVG formats
 */
router.get('/events/:eventId/tokens/:tokenId/qr', async (req: Request, res: Response) => {
  try {
    const { eventId, tokenId } = req.params;
    const { format = 'png', size = 300, token, event_slug } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token query parameter is required' });
    }

    if (!event_slug || typeof event_slug !== 'string') {
      return res.status(400).json({ error: 'event_slug query parameter is required' });
    }

    const formatStr = format as string;
    const sizeNum = typeof size === 'string' ? parseInt(size) : size as number;

    if (formatStr !== 'png' && formatStr !== 'svg') {
      return res.status(400).json({ error: 'format must be "png" or "svg"' });
    }

    if (sizeNum < 100 || sizeNum > 1000) {
      return res.status(400).json({ error: 'size must be between 100 and 1000 pixels' });
    }

    const qrCode = await tokenService.generateQRCode(token, event_slug, formatStr, sizeNum);

    // If PNG, save data URL to database
    if (formatStr === 'png') {
      await tokenService.saveQRCode(tokenId, qrCode);
    }

    res.json({
      qr_code: qrCode,
      format: formatStr,
      size: sizeNum,
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate QR code',
    });
  }
});

/**
 * GET /api/events/:eventId/tokens/:tokenId/copy-url
 * Get formatted token URL for copy-to-clipboard
 * Feature 005: Returns full public URL with token parameter
 */
router.get('/events/:eventId/tokens/:tokenId/copy-url', async (req: Request, res: Response) => {
  try {
    const { eventId, tokenId } = req.params;
    const { token, event_slug } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token query parameter is required' });
    }

    if (!event_slug || typeof event_slug !== 'string') {
      return res.status(400).json({ error: 'event_slug query parameter is required' });
    }

    const url = tokenService.formatTokenUrl(token, event_slug);

    res.json({
      url,
      token,
      short_url: url // For compatibility with contract
    });
  } catch (error) {
    console.error('Format token URL error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to format token URL',
    });
  }
});

/**
 * POST /api/events/:eventId/tokens/:tokenId/revoke
 * Revoke a token (soft delete with audit trail)
 * Feature 005: Tracks who revoked and when
 */
router.post('/events/:eventId/tokens/:tokenId/revoke', async (req: Request, res: Response) => {
  try {
    const { eventId, tokenId } = req.params;
    const { revoked_by } = req.body;

    if (!revoked_by) {
      return res.status(400).json({ error: 'revoked_by (admin ID) is required' });
    }

    const token = await tokenService.revokeToken(tokenId, revoked_by);

    res.json({
      message: 'Token revoked successfully',
      token,
    });
  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to revoke token',
    });
  }
});

/**
 * DELETE /api/tokens/event/:eventId
 * Delete all tokens for an event (when event is deleted)
 */
router.delete('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const success = await tokenService.deleteTokensForEvent(eventId);

    if (success) {
      res.json({
        message: 'All tokens deleted successfully',
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete tokens',
      });
    }
  } catch (error) {
    console.error('Delete tokens error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete tokens',
    });
  }
});

export default router;
