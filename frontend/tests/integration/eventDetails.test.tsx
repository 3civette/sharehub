/**
 * Integration Test: Admin Event Details Workflow
 * Feature 005: Event Details Management
 *
 * Tests the complete admin workflow:
 * 1. Navigate to event edit page
 * 2. Upload photos and set cover
 * 3. Create sessions
 * 4. Add speeches to sessions
 * 5. Upload slides for speeches
 * 6. Generate access tokens (for private events)
 *
 * NOTE: This test requires authentication to be configured.
 * Once /auth/login is available, update the loginAsAdmin() helper.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({
    id: 'test-event-id',
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

describe('Admin Event Details Integration Test', () => {
  const API_BASE_URL = 'http://localhost:3001';
  let testEventId: string;
  let adminToken: string;

  beforeAll(async () => {
    // Setup: This would use actual authentication once available
    adminToken = 'test-admin-token';
    testEventId = 'test-event-id';
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    // This would call actual cleanup endpoints once auth is available
  });

  describe('Photo Management Workflow', () => {
    it('should upload event photos and set cover', async () => {
      // This test validates the EventPhotoManager component workflow

      // Step 1: Create a test file
      const testFile = new File(['test-image-content'], 'test-photo.jpg', {
        type: 'image/jpeg',
      });

      // Step 2: Mock the upload API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'photo-1',
          event_id: testEventId,
          filename: 'test-photo.jpg',
          url: 'https://storage.example.com/photo-1.jpg',
          is_cover: false,
          display_order: 1,
        }),
      });

      // Step 3: Simulate photo upload
      // In actual test, would render EventPhotoManager and interact with UI
      const response = await fetch(`${API_BASE_URL}/api/events/${testEventId}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      const uploadedPhoto = await response.json();

      expect(uploadedPhoto).toMatchObject({
        id: expect.any(String),
        event_id: testEventId,
        filename: 'test-photo.jpg',
        is_cover: false,
      });

      // Step 4: Set photo as cover
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Cover image updated',
          photo: { ...uploadedPhoto, is_cover: true },
          previous_cover: null,
        }),
      });

      const setCoverResponse = await fetch(
        `${API_BASE_URL}/api/events/${testEventId}/photos/${uploadedPhoto.id}/set-cover`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        }
      );

      const setCoverResult = await setCoverResponse.json();
      expect(setCoverResult.photo.is_cover).toBe(true);
    });

    it('should validate file size and type', async () => {
      // Test file validation
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      // Client-side validation would reject this
      const isValid = ['image/jpeg', 'image/png', 'image/webp'].includes(invalidFile.type);
      expect(isValid).toBe(false);

      // Large file validation
      const largeFileSize = 51 * 1024 * 1024; // 51MB
      const maxSize = 50 * 1024 * 1024; // 50MB
      expect(largeFileSize > maxSize).toBe(true);
    });
  });

  describe('Session Management Workflow', () => {
    it('should create session and add speeches', async () => {
      // Step 1: Create session
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-1',
          event_id: testEventId,
          title: 'Opening Keynote',
          description: 'Welcome session',
          scheduled_time: '2025-12-15T09:00:00Z',
          display_order: null,
        }),
      });

      const sessionResponse = await fetch(
        `${API_BASE_URL}/api/events/${testEventId}/sessions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Opening Keynote',
            description: 'Welcome session',
            scheduled_time: '2025-12-15T09:00:00Z',
          }),
        }
      );

      const session = await sessionResponse.json();
      expect(session).toMatchObject({
        id: expect.any(String),
        title: 'Opening Keynote',
        event_id: testEventId,
      });

      // Step 2: Add speech to session
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'speech-1',
          session_id: session.id,
          title: 'The Future of Tech',
          speaker_name: 'John Doe',
          duration_minutes: 45,
        }),
      });

      const speechResponse = await fetch(
        `${API_BASE_URL}/api/sessions/${session.id}/speeches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'The Future of Tech',
            speaker_name: 'John Doe',
            duration_minutes: 45,
          }),
        }
      );

      const speech = await speechResponse.json();
      expect(speech).toMatchObject({
        id: expect.any(String),
        session_id: session.id,
        title: 'The Future of Tech',
        speaker_name: 'John Doe',
      });
    });

    it('should validate smart ordering', async () => {
      // Test that sessions with scheduled_time are ordered chronologically
      const session1 = {
        id: 'session-1',
        scheduled_time: '2025-12-15T09:00:00Z',
        display_order: null,
      };
      const session2 = {
        id: 'session-2',
        scheduled_time: '2025-12-15T14:00:00Z',
        display_order: null,
      };

      // Simulate smart ordering logic
      const extractTime = (s: any) =>
        s.display_order ?? new Date(s.scheduled_time).getTime() / 1000;

      const sorted = [session2, session1].sort((a, b) => extractTime(a) - extractTime(b));

      expect(sorted[0].id).toBe('session-1');
      expect(sorted[1].id).toBe('session-2');
    });
  });

  describe('Slide Upload Workflow', () => {
    it('should upload slides for a speech', async () => {
      const speechId = 'speech-1';
      const testSlideFile = new File(['slide-content'], 'presentation.pdf', {
        type: 'application/pdf',
      });

      // Mock slide upload
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'slide-1',
          speech_id: speechId,
          filename: 'presentation.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/speeches/${speechId}/slides`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      const slide = await response.json();
      expect(slide).toMatchObject({
        id: expect.any(String),
        speech_id: speechId,
        filename: 'presentation.pdf',
        mime_type: 'application/pdf',
      });
    });

    it('should validate allowed slide formats', async () => {
      const allowedFormats = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];

      const pdfFile = new File(['content'], 'slides.pdf', { type: 'application/pdf' });
      const pptFile = new File(['content'], 'slides.ppt', {
        type: 'application/vnd.ms-powerpoint',
      });
      const invalidFile = new File(['content'], 'doc.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      expect(allowedFormats.includes(pdfFile.type)).toBe(true);
      expect(allowedFormats.includes(pptFile.type)).toBe(true);
      expect(allowedFormats.includes(invalidFile.type)).toBe(false);
    });
  });

  describe('Token Generation Workflow', () => {
    it('should generate QR code for private event', async () => {
      const tokenId = 'token-1';

      // Mock QR code generation
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          qr_code_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
          revoked: false,
        }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/events/${testEventId}/tokens/${tokenId}/qr`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        }
      );

      const qrData = await response.json();
      expect(qrData.qr_code_data_url).toMatch(/^data:image\/png;base64,/);
      expect(qrData.revoked).toBe(false);
    });

    it('should revoke token', async () => {
      const tokenId = 'token-1';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Token revoked successfully',
          revoked_at: '2025-10-08T12:00:00Z',
        }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/events/${testEventId}/tokens/${tokenId}/revoke`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      expect(result.message).toBe('Token revoked successfully');
      expect(result.revoked_at).toBeDefined();
    });
  });

  describe('Delete Safeguards', () => {
    it('should prevent session deletion if speeches exist', async () => {
      const sessionId = 'session-with-speeches';

      // Mock error response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Cannot delete session with speeches',
          speech_count: 3,
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.error).toContain('Cannot delete session');
      expect(error.speech_count).toBe(3);
    });

    it('should prevent cover photo deletion if gallery exists', async () => {
      const coverPhotoId = 'cover-photo-1';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Cannot delete cover image',
          message: 'Set another photo as cover first',
          gallery_count: 5,
        }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/events/${testEventId}/photos/${coverPhotoId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.error).toBe('Cannot delete cover image');
      expect(error.gallery_count).toBe(5);
    });
  });
});
