import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Integration test for 48-hour retention enforcement
// This test verifies the complete cleanup workflow
describe('48-Hour Retention Integration', () => {
  let supabase: any;
  let testSlideIds: string[] = [];
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // TODO: Setup test data
    // For now, tests will be skipped as infrastructure doesn't exist yet
  });

  afterAll(async () => {
    // TODO: Cleanup test data
    if (testSlideIds.length > 0) {
      await supabase.from('slides').delete().in('id', testSlideIds);
    }
  });

  it.skip('should not delete files younger than 48 hours', async () => {
    // Create test slide uploaded 24 hours ago
    const recentSlide = await createTestSlide({
      uploaded_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      r2_key: 'tenant-test/event-test/slide-recent.pdf',
      filename: 'recent.pdf',
    });
    testSlideIds.push(recentSlide.id);

    // Run cleanup
    const response = await fetch(`${BASE_URL}/api/cleanup`, {
      method: 'POST',
      headers: {
        'x-netlify-event': 'schedule',
      },
    });

    expect(response.status).toBe(200);
    const result = await response.json();

    // Recent slide should not be in processed count
    // (it shouldn't be selected by the cleanup query)

    // Verify slide still exists and deleted_at is null
    const { data: slide } = await supabase
      .from('slides')
      .select('deleted_at')
      .eq('id', recentSlide.id)
      .single();

    expect(slide.deleted_at).toBeNull();
  });

  it.skip('should delete files exactly 48 hours + 1 second old', async () => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000 + 1000);

    // Create test slide uploaded 48h + 1s ago
    const expiredSlide = await createTestSlide({
      uploaded_at: new Date(fortyEightHoursAgo),
      r2_key: 'tenant-test/event-test/slide-expired.pdf',
      filename: 'expired.pdf',
    });
    testSlideIds.push(expiredSlide.id);

    // Run cleanup
    const response = await fetch(`${BASE_URL}/api/cleanup`, {
      method: 'POST',
      headers: {
        'x-netlify-event': 'schedule',
      },
    });

    expect(response.status).toBe(200);
    const result = await response.json();

    expect(result.deleted_count).toBeGreaterThanOrEqual(1);

    // Verify slide is marked as deleted
    const { data: slide } = await supabase
      .from('slides')
      .select('deleted_at')
      .eq('id', expiredSlide.id)
      .single();

    expect(slide.deleted_at).not.toBeNull();
    expect(new Date(slide.deleted_at).getTime()).toBeGreaterThan(fortyEightHoursAgo);
  });

  it.skip('should delete multiple expired files in single run', async () => {
    // Create 5 expired slides
    const expiredSlides = [];
    for (let i = 0; i < 5; i++) {
      const slide = await createTestSlide({
        uploaded_at: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago
        r2_key: `tenant-test/event-test/slide-batch-${i}.pdf`,
        filename: `batch-${i}.pdf`,
      });
      expiredSlides.push(slide);
      testSlideIds.push(slide.id);
    }

    // Run cleanup
    const response = await fetch(`${BASE_URL}/api/cleanup`, {
      method: 'POST',
      headers: {
        'x-netlify-event': 'schedule',
      },
    });

    expect(response.status).toBe(200);
    const result = await response.json();

    expect(result.deleted_count).toBeGreaterThanOrEqual(5);
    expect(result.processed_count).toBeGreaterThanOrEqual(5);

    // Verify all are marked as deleted
    const { data: slides } = await supabase
      .from('slides')
      .select('deleted_at')
      .in('id', expiredSlides.map(s => s.id));

    slides.forEach((slide: any) => {
      expect(slide.deleted_at).not.toBeNull();
    });
  });

  it.skip('should not process already deleted slides', async () => {
    // Create slide that's already deleted
    const alreadyDeleted = await createTestSlide({
      uploaded_at: new Date(Date.now() - 50 * 60 * 60 * 1000),
      deleted_at: new Date(),
      r2_key: 'tenant-test/event-test/slide-already-deleted.pdf',
      filename: 'already-deleted.pdf',
    });
    testSlideIds.push(alreadyDeleted.id);

    // Run cleanup
    const response = await fetch(`${BASE_URL}/api/cleanup`, {
      method: 'POST',
      headers: {
        'x-netlify-event': 'schedule',
      },
    });

    expect(response.status).toBe(200);
    const result = await response.json();

    // Already-deleted slide should not be in processed count
    // (Query filters WHERE deleted_at IS NULL)
  });

  it.skip('should skip legacy slides without r2_key', async () => {
    // Create legacy slide (no R2 key)
    const legacySlide = await createTestSlide({
      uploaded_at: new Date(Date.now() - 50 * 60 * 60 * 1000),
      r2_key: null,
      filename: 'legacy.pdf',
    });
    testSlideIds.push(legacySlide.id);

    const initialDeletedAt = legacySlide.deleted_at;

    // Run cleanup
    await fetch(`${BASE_URL}/api/cleanup`, {
      method: 'POST',
      headers: {
        'x-netlify-event': 'schedule',
      },
    });

    // Verify legacy slide was not touched
    const { data: slide } = await supabase
      .from('slides')
      .select('deleted_at')
      .eq('id', legacySlide.id)
      .single();

    expect(slide.deleted_at).toBe(initialDeletedAt);
  });

  it.skip('should be idempotent (safe to run multiple times)', async () => {
    // Create expired slide
    const expiredSlide = await createTestSlide({
      uploaded_at: new Date(Date.now() - 50 * 60 * 60 * 1000),
      r2_key: 'tenant-test/event-test/slide-idempotent.pdf',
      filename: 'idempotent.pdf',
    });
    testSlideIds.push(expiredSlide.id);

    // Run cleanup first time
    const response1 = await fetch(`${BASE_URL}/api/cleanup`, {
      method: 'POST',
      headers: {
        'x-netlify-event': 'schedule',
      },
    });
    const result1 = await response1.json();
    expect(result1.deleted_count).toBeGreaterThanOrEqual(1);

    // Run cleanup second time
    const response2 = await fetch(`${BASE_URL}/api/cleanup`, {
      method: 'POST',
      headers: {
        'x-netlify-event': 'schedule',
      },
    });
    const result2 = await response2.json();

    // Second run should find nothing to delete
    // (slide was already marked as deleted in first run)
    expect(result2.deleted_count).toBe(0);
  });

  it.skip('should work correctly across tenant boundaries', async () => {
    // Create expired slides for different tenants
    const tenant1Slide = await createTestSlide({
      tenant_id: 'tenant-1',
      uploaded_at: new Date(Date.now() - 50 * 60 * 60 * 1000),
      r2_key: 'tenant-1/event-test/slide-t1.pdf',
      filename: 't1.pdf',
    });

    const tenant2Slide = await createTestSlide({
      tenant_id: 'tenant-2',
      uploaded_at: new Date(Date.now() - 50 * 60 * 60 * 1000),
      r2_key: 'tenant-2/event-test/slide-t2.pdf',
      filename: 't2.pdf',
    });

    testSlideIds.push(tenant1Slide.id, tenant2Slide.id);

    // Run cleanup
    await fetch(`${BASE_URL}/api/cleanup`, {
      method: 'POST',
      headers: {
        'x-netlify-event': 'schedule',
      },
    });

    // Both should be deleted regardless of tenant
    const { data: slides } = await supabase
      .from('slides')
      .select('deleted_at')
      .in('id', [tenant1Slide.id, tenant2Slide.id]);

    slides.forEach((slide: any) => {
      expect(slide.deleted_at).not.toBeNull();
    });
  });
});

// Helper function to create test slides
async function createTestSlide(data: any) {
  // TODO: Implement when Supabase schema is ready
  // This is a placeholder for TDD
  return {
    id: 'test-id',
    ...data,
  };
}
