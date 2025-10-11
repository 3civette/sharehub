/**
 * Contract Tests: Access Tokens API (Enhanced)
 *
 * PURPOSE: Verify Enhanced Access Tokens API with QR codes, copy URLs, and revocation
 * APPROACH: Test-Driven Development (TDD) - these tests MUST fail initially
 * LOCATION: backend/tests/contract/tokens.test.ts
 * CONTRACT: specs/005-ora-bisogna-implementare/contracts/tokens-api.md
 *
 * Constitution Principle III: Tests written first, implementation second
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const API_BASE_URL = 'http://localhost:3001/api';
let adminToken: string;
let testTenantId: string;
let testEventId: string;
let testTokenId: string;
let testTokenValue: string;

describe('Access Tokens API Contract Tests (Enhanced)', () => {
  beforeAll(async () => {
    // Setup: Create test tenant, admin, and private event
    const tenantRes = await request(API_BASE_URL)
      .post('/tenants')
      .send({ subdomain: 'test-tokens', name: 'Test Tokens Hotel' });
    testTenantId = tenantRes.body.tenant.id;

    const adminRes = await request(API_BASE_URL)
      .post('/auth/login')
      .send({ email: 'admin@test-tokens.com', password: 'password123' });
    adminToken = adminRes.body.token;

    // Create private event (tokens only work for private events)
    const eventRes = await request(API_BASE_URL)
      .post('/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Token Test Event',
        event_date: '2025-12-15',
        visibility: 'private',
        token_expiration_date: '2025-12-20T23:59:59Z'
      });
    testEventId = eventRes.body.event.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    // TODO: Implement cleanup logic
  });

  describe('POST /api/events/:eventId/tokens - Generate Token', () => {
    it('should generate a participant token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'participant',
          expires_at: '2025-12-20T23:59:59Z'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        event_id: testEventId,
        type: 'participant',
        expires_at: '2025-12-20T23:59:59Z',
        last_used_at: null,
        use_count: 0,
        is_active: true
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body.token).toHaveLength(21); // nanoid length

      testTokenId = response.body.id;
      testTokenValue = response.body.token;
    });

    it('should generate an organizer token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'organizer',
          expires_at: '2025-12-20T23:59:59Z'
        });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('organizer');
    });

    it('should reject token with expiration in the past', async () => {
      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'participant',
          expires_at: '2020-01-01T00:00:00Z'
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toContainEqual({
        field: 'expires_at',
        message: 'Expiration date must be in the future'
      });
    });

    it('should reject token for public event', async () => {
      // Create a public event
      const publicEventRes = await request(API_BASE_URL)
        .post('/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Public Event',
          event_date: '2025-12-15',
          visibility: 'public'
        });
      const publicEventId = publicEventRes.body.event.id;

      const response = await request(API_BASE_URL)
        .post(`/events/${publicEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'participant',
          expires_at: '2025-12-20T23:59:59Z'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Event is not private');
      expect(response.body.message).toBe('Tokens can only be generated for private events');
    });
  });

  describe('GET /api/events/:eventId/tokens - List Tokens', () => {
    it('should list all tokens for an event', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('active_count');
      expect(response.body).toHaveProperty('revoked_count');
      expect(response.body).toHaveProperty('expired_count');
      expect(Array.isArray(response.body.tokens)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);

      // Check token structure
      const token = response.body.tokens[0];
      expect(token).toHaveProperty('id');
      expect(token).toHaveProperty('token');
      expect(token).toHaveProperty('type');
      expect(token).toHaveProperty('expires_at');
      expect(token).toHaveProperty('is_active');
      expect(token).toHaveProperty('status');
    });

    it('should filter tokens by status - active only', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens?status=active`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.tokens.forEach((token: any) => {
        expect(token.status).toBe('active');
        expect(token.is_active).toBe(true);
      });
    });

    it('should filter tokens by status - revoked only', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens?status=revoked`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.tokens.forEach((token: any) => {
        expect(token.status).toBe('revoked');
        expect(token.revoked_at).not.toBeNull();
      });
    });
  });

  describe('GET /api/events/:eventId/tokens/:tokenId/qr - Get QR Code', () => {
    it('should generate QR code for token (PNG format)', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/${testTokenId}/qr`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        token_id: testTokenId,
        format: 'png',
        size: 300
      });
      expect(response.body).toHaveProperty('qr_code');
      expect(response.body).toHaveProperty('url');
      expect(response.body.qr_code).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate QR code with custom size', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/${testTokenId}/qr?size=500`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.size).toBe(500);
    });

    it('should generate QR code in SVG format', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/${testTokenId}/qr?format=svg`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.format).toBe('svg');
      expect(response.body.qr_code).toContain('<svg');
    });

    it('should reject QR generation for non-existent token', async () => {
      const fakeTokenId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/${fakeTokenId}/qr`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Token not found');
    });

    it('should reject QR generation for revoked token', async () => {
      // First, create and revoke a token
      const createRes = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'participant',
          expires_at: '2025-12-20T23:59:59Z'
        });
      const revokedTokenId = createRes.body.id;

      await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens/${revokedTokenId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/${revokedTokenId}/qr`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(410);
      expect(response.body.error).toBe('Token is no longer active');
      expect(response.body.status).toBe('revoked');
    });
  });

  describe('GET /api/events/:eventId/tokens/:tokenId/copy-url - Get Copy URL', () => {
    it('should get formatted URL for clipboard', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/${testTokenId}/copy-url`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        token_id: testTokenId,
        token: testTokenValue
      });
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('short_url');
      expect(response.body.url).toContain(testTokenValue);
      expect(response.body.url).toMatch(/^https:\/\//);
    });

    it('should return 404 for non-existent token', async () => {
      const fakeTokenId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/${fakeTokenId}/copy-url`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Token not found');
    });
  });

  describe('POST /api/events/:eventId/tokens/:tokenId/revoke - Revoke Token', () => {
    it('should revoke a token', async () => {
      // Create a new token to revoke
      const createRes = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'participant',
          expires_at: '2025-12-20T23:59:59Z'
        });
      const tokenToRevoke = createRes.body.id;

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens/${tokenToRevoke}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token revoked successfully');
      expect(response.body.token).toMatchObject({
        id: tokenToRevoke,
        is_active: false
      });
      expect(response.body.token.revoked_at).not.toBeNull();
      expect(response.body.token.revoked_by).not.toBeNull();
    });

    it('should be idempotent - revoking already revoked token', async () => {
      // Create and revoke a token
      const createRes = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'participant',
          expires_at: '2025-12-20T23:59:59Z'
        });
      const tokenId = createRes.body.id;

      // First revocation
      const firstRevoke = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens/${tokenId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(firstRevoke.status).toBe(200);
      const firstRevokedAt = firstRevoke.body.token.revoked_at;

      // Second revocation (should be idempotent)
      const secondRevoke = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens/${tokenId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(secondRevoke.status).toBe(200);
      expect(secondRevoke.body.token.revoked_at).toBe(firstRevokedAt);
    });

    it('should return 404 for non-existent token', async () => {
      const fakeTokenId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens/${fakeTokenId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Token not found');
    });
  });

  describe('GET /api/tokens/validate - Validate Token (Public)', () => {
    it('should validate active token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/tokens/validate?token=${testTokenValue}&event_id=${testEventId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        valid: true,
        token_id: testTokenId,
        event_id: testEventId,
        type: 'participant'
      });
      expect(response.body).toHaveProperty('expires_at');
    });

    it('should reject revoked token', async () => {
      // Create and revoke a token
      const createRes = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'participant',
          expires_at: '2025-12-20T23:59:59Z'
        });
      const revokedToken = createRes.body.token;

      await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens/${createRes.body.id}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      const response = await request(API_BASE_URL)
        .get(`/tokens/validate?token=${revokedToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.reason).toBe('Token has been revoked');
      expect(response.body).toHaveProperty('revoked_at');
    });

    it('should reject non-existent token', async () => {
      const fakeToken = 'abcdefghijklmnopqrstu'; // 21 chars

      const response = await request(API_BASE_URL)
        .get(`/tokens/validate?token=${fakeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.reason).toBe('Token not found');
    });

    it('should reject token for different event', async () => {
      // Create another event
      const otherEventRes = await request(API_BASE_URL)
        .post('/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Other Event',
          event_date: '2025-12-16',
          visibility: 'private',
          token_expiration_date: '2025-12-20T23:59:59Z'
        });
      const otherEventId = otherEventRes.body.event.id;

      const response = await request(API_BASE_URL)
        .get(`/tokens/validate?token=${testTokenValue}&event_id=${otherEventId}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.reason).toBe('Token does not belong to this event');
    });
  });
});
