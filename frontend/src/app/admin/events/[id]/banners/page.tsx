/**
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 * Page: Banner management for admin
 *
 * Allows event admins to upload, manage, and configure advertisement banners
 * across 5 predefined slots with different dimensions and positioning.
 */

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import type { Database } from '@/types/database.types';
import BannerManager from '@/components/admin/BannerManager';

// Disable caching for this page - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function BannersManagementPage({ params }: PageProps) {
  const supabase = createServerComponentClient<Database>({ cookies });

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  try {
    // Verify event exists and user has access (via RLS)
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, name, slug, tenant_id')
      .eq('id', params.id)
      .single();

    if (eventError || !eventData) {
      throw new Error('Event not found or access denied');
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <a
              href={`/admin/events/${params.id}/dashboard`}
              className="text-primary hover:text-primary/90 flex items-center gap-2"
            >
              ← Back to Event Dashboard
            </a>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-brandBlack mb-2">Advertisement Banners</h1>
            <p className="text-brandInk/70">
              Manage banners for <span className="font-medium">{eventData.name}</span>
            </p>
          </div>

          {/* Banner Manager Component */}
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <BannerManager eventId={params.id} />
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Banner management page error:', error);

    // Event not found or access denied
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C] flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-8 max-w-md border border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-brandInk mb-4">
            {error.message || 'You do not have permission to access this page.'}
          </p>
          <a
            href="/admin/events"
            className="block text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Back to Event Management
          </a>
        </div>
      </div>
    );
  }
}
