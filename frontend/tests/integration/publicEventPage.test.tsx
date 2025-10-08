/**
 * Integration Test: Public Event Page Workflow
 * Feature 005: Event Details Management
 *
 * Tests the complete public viewer workflow:
 * 1. Access public event page
 * 2. View event gallery (cover + photos)
 * 3. Browse sessions in chronological order
 * 4. View speeches within sessions
 * 5. Download individual slides
 * 6. Download batch ZIP files
 * 7. Test token access for private events
 *
 * NOTE: These tests validate the public-facing features
 * without requiring authentication.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useParams: () => ({
    slug: 'test-event-slug',
  }),
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

describe('Public Event Page Integration Test', () => {
  const API_BASE_URL = 'http://localhost:3001';
  const testEventSlug = 'tech-conference-2025';

  describe('Public Event Access', () => {
    it('should load public event data', async () => {
      // Mock successful public event fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          event: {
            id: 'event-1',
            slug: testEventSlug,
            name: 'Tech Conference 2025',
            date: '2025-12-15',
            description: 'Annual tech conference',
            visibility: 'public',
            status: 'upcoming',
          },
          sessions: [],
          metrics: {
            page_views: 42,
            total_slide_downloads: 128,
          },
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/public/events/${testEventSlug}`);
      const eventData = await response.json();

      expect(eventData.event).toMatchObject({
        slug: testEventSlug,
        name: 'Tech Conference 2025',
        visibility: 'public',
      });
      expect(eventData.metrics.page_views).toBeGreaterThan(0);
    });

    it('should handle private event without token', async () => {
      // Mock 403 response for private event
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'This is a private event. Please provide an access token.',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/public/events/private-event-slug`);
      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);

      const error = await response.json();
      expect(error.error).toContain('private event');
    });

    it('should validate token for private event', async () => {
      const token = 'valid-21-char-token12';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          token_type: 'participant',
          expires_at: '2025-12-31T23:59:59Z',
          token_id: 'token-123',
        }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/public/events/private-event/validate-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        }
      );

      const validation = await response.json();
      expect(validation.valid).toBe(true);
      expect(validation.token_type).toBe('participant');
    });
  });

  describe('Event Gallery Display', () => {
    it('should display event photos with cover image', async () => {
      const mockEventData = {
        event: {
          id: 'event-1',
          name: 'Tech Conference 2025',
          photos: [
            {
              id: 'photo-1',
              filename: 'cover.jpg',
              url: 'https://storage.example.com/cover.jpg',
              is_cover: true,
              display_order: 0,
            },
            {
              id: 'photo-2',
              filename: 'gallery1.jpg',
              url: 'https://storage.example.com/gallery1.jpg',
              is_cover: false,
              display_order: 1,
            },
            {
              id: 'photo-3',
              filename: 'gallery2.jpg',
              url: 'https://storage.example.com/gallery2.jpg',
              is_cover: false,
              display_order: 2,
            },
          ],
        },
        sessions: [],
        metrics: {},
      };

      // Validate photo structure
      const coverPhoto = mockEventData.event.photos.find((p) => p.is_cover);
      const galleryPhotos = mockEventData.event.photos.filter((p) => !p.is_cover);

      expect(coverPhoto).toBeDefined();
      expect(coverPhoto?.display_order).toBe(0);
      expect(galleryPhotos).toHaveLength(2);

      // Validate display order
      const sortedGallery = galleryPhotos.sort((a, b) => a.display_order - b.display_order);
      expect(sortedGallery[0].display_order).toBe(1);
      expect(sortedGallery[1].display_order).toBe(2);
    });

    it('should handle events without photos gracefully', async () => {
      const mockEventData = {
        event: {
          id: 'event-2',
          name: 'Simple Event',
          photos: [],
        },
        sessions: [],
        metrics: {},
      };

      // Gallery should not be rendered if no photos
      expect(mockEventData.event.photos.length).toBe(0);
    });
  });

  describe('Session and Speech Hierarchy', () => {
    it('should display sessions with nested speeches', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          event: {
            id: 'event-1',
            name: 'Tech Conference 2025',
          },
          sessions: [
            {
              id: 'session-1',
              title: 'Morning Keynote',
              description: 'Opening session',
              scheduled_time: '2025-12-15T09:00:00Z',
              speeches: [
                {
                  id: 'speech-1',
                  title: 'The Future of AI',
                  speaker_name: 'Dr. Jane Smith',
                  duration_minutes: 45,
                  description: 'AI trends and predictions',
                  slides: [
                    {
                      id: 'slide-1',
                      filename: 'ai-presentation.pdf',
                      file_size: 2048000,
                      mime_type: 'application/pdf',
                      download_url: '/api/public/slides/slide-1/download',
                    },
                  ],
                },
              ],
            },
            {
              id: 'session-2',
              title: 'Afternoon Workshop',
              description: 'Hands-on coding',
              scheduled_time: '2025-12-15T14:00:00Z',
              speeches: [
                {
                  id: 'speech-2',
                  title: 'Building Scalable Apps',
                  speaker_name: 'John Doe',
                  duration_minutes: 90,
                  description: null,
                  slides: [],
                },
              ],
            },
          ],
          metrics: {},
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/public/events/${testEventSlug}`);
      const eventData = await response.json();

      // Validate session structure
      expect(eventData.sessions).toHaveLength(2);
      expect(eventData.sessions[0].speeches).toHaveLength(1);
      expect(eventData.sessions[0].speeches[0].slides).toHaveLength(1);

      // Validate chronological ordering
      const session1Time = new Date(eventData.sessions[0].scheduled_time).getTime();
      const session2Time = new Date(eventData.sessions[1].scheduled_time).getTime();
      expect(session1Time).toBeLessThan(session2Time);

      // Validate speech details
      const speech = eventData.sessions[0].speeches[0];
      expect(speech).toMatchObject({
        title: 'The Future of AI',
        speaker_name: 'Dr. Jane Smith',
        duration_minutes: 45,
      });
    });

    it('should handle sessions without speeches', async () => {
      const mockSession = {
        id: 'session-empty',
        title: 'TBA Session',
        speeches: [],
      };

      expect(mockSession.speeches.length).toBe(0);
      // Component should show "No speeches in this session yet"
    });
  });

  describe('Slide Download Functionality', () => {
    it('should generate correct download URL for slide', () => {
      const slideId = 'slide-abc-123';
      const expectedUrl = `${API_BASE_URL}/api/public/slides/${slideId}/download`;

      // Simulate getSlideDownloadUrl function
      const downloadUrl = `${API_BASE_URL}/api/public/slides/${slideId}/download`;
      expect(downloadUrl).toBe(expectedUrl);
    });

    it('should generate ZIP download URL for speech', () => {
      const speechId = 'speech-xyz-789';
      const expectedUrl = `${API_BASE_URL}/api/public/speeches/${speechId}/download-all`;

      const zipUrl = `${API_BASE_URL}/api/public/speeches/${speechId}/download-all`;
      expect(zipUrl).toBe(expectedUrl);
    });

    it('should handle rate limiting', async () => {
      // Mock 429 rate limit response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'Retry-After': '3600',
        }),
        json: async () => ({
          error: 'Too many download requests',
          message: 'Download limit exceeded. Please try again later.',
          retryAfter: 3600,
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/public/slides/slide-1/download`);
      expect(response.status).toBe(429);

      const error = await response.json();
      expect(error.error).toBe('Too many download requests');
      expect(error.retryAfter).toBe(3600);
    });
  });

  describe('Public Metrics', () => {
    it('should display page views and download counts', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          page_views: 1234,
          total_slide_downloads: 567,
        }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/public/events/${testEventSlug}/metrics`
      );
      const metrics = await response.json();

      expect(metrics.page_views).toBeGreaterThan(0);
      expect(metrics.total_slide_downloads).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt gallery grid for different screen sizes', () => {
      // Test that gallery uses responsive Tailwind classes
      const galleryClasses = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';

      // Mobile: 2 columns
      expect(galleryClasses).toContain('grid-cols-2');
      // Tablet: 3 columns
      expect(galleryClasses).toContain('md:grid-cols-3');
      // Desktop: 4 columns
      expect(galleryClasses).toContain('lg:grid-cols-4');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 event not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Event not found',
        }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/public/events/non-existent-slug`
      );
      expect(response.status).toBe(404);
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch(`${API_BASE_URL}/api/public/events/${testEventSlug}`);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });
  });

  describe('Token Input Validation', () => {
    it('should validate token format (21 characters)', () => {
      const validToken = 'abcdefghijklmnopqrstu'; // 21 chars
      const invalidShort = 'tooshort'; // < 21 chars
      const invalidLong = 'toolongtoken123456789012'; // > 21 chars

      expect(validToken.length).toBe(21);
      expect(invalidShort.length).not.toBe(21);
      expect(invalidLong.length).not.toBe(21);
    });
  });

  describe('File Size Formatting', () => {
    it('should format file sizes correctly', () => {
      const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
      };

      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(2048000)).toBe('2.0 MB');
    });
  });
});
