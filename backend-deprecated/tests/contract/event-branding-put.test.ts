import { describe, it, expect } from 'vitest';
import request from 'supertest';

// This test will fail until T023 implements the endpoint
describe('PUT /api/events/:eventId/branding', () => {
  const testEventId = '00000000-0000-0000-0000-000000000001'; // Replace with actual test event

  it('should update event branding overrides with customizable flags', async () => {
    const brandingOverrides = {
      branding_overrides: {
        colors: {
          value: {
            primary: '#EF4444',
            secondary: '#F59E0B'
          },
          customizable: false
        },
        logo_url: {
          value: 'https://example.com/event-logo.png',
          customizable: true
        },
        advertisements: {
          value: [
            {
              image_url: 'https://example.com/event-ad.jpg',
              link_url: 'https://example.com/sponsor'
            }
          ],
          customizable: false
        }
      }
    };

    const response = await request('http://localhost:3001')
      .put(`/api/events/${testEventId}/branding`)
      .send(brandingOverrides)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
  });

  it('should validate customizable flag is boolean', async () => {
    const invalidOverrides = {
      branding_overrides: {
        logo_url: {
          value: 'https://example.com/logo.png',
          customizable: 'not-a-boolean' // Invalid
        }
      }
    };

    await request('http://localhost:3001')
      .put(`/api/events/${testEventId}/branding`)
      .send(invalidOverrides)
      .expect(400);
  });

  it('should validate override structure has value and customizable fields', async () => {
    const invalidStructure = {
      branding_overrides: {
        logo_url: {
          value: 'https://example.com/logo.png'
          // Missing customizable field
        }
      }
    };

    await request('http://localhost:3001')
      .put(`/api/events/${testEventId}/branding`)
      .send(invalidStructure)
      .expect(400);
  });

  it('should allow partial overrides (not all elements)', async () => {
    const partialOverrides = {
      branding_overrides: {
        logo_url: {
          value: 'https://example.com/custom-logo.png',
          customizable: false
        }
        // Only overriding logo, not colors or advertisements
      }
    };

    const response = await request('http://localhost:3001')
      .put(`/api/events/${testEventId}/branding`)
      .send(partialOverrides)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should validate color hex format in overrides', async () => {
    const invalidColors = {
      branding_overrides: {
        colors: {
          value: {
            primary: 'invalid-color',
            secondary: '#3B82F6'
          },
          customizable: true
        }
      }
    };

    await request('http://localhost:3001')
      .put(`/api/events/${testEventId}/branding`)
      .send(invalidColors)
      .expect(400);
  });

  it('should return 404 for non-existent event', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const overrides = {
      branding_overrides: {
        logo_url: {
          value: 'https://example.com/logo.png',
          customizable: true
        }
      }
    };

    await request('http://localhost:3001')
      .put(`/api/events/${fakeId}/branding`)
      .send(overrides)
      .expect(404);
  });
});
