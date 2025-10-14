'use client';

/**
 * BannerManager Component
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 *
 * Manages advertisement banners for events with 5 predefined slots.
 * Each slot has unique dimensions and positioning.
 */

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database.types';
import BannerSlotCard from './BannerSlotCard';
import BannerUploadForm from './BannerUploadForm';
import { BANNER_SLOTS } from '@/lib/banners';

type Banner = Database['public']['Tables']['banners']['Row'];

interface BannerManagerProps {
  eventId: string;
  onUpdate?: () => void;
}

export default function BannerManager({ eventId, onUpdate }: BannerManagerProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const supabase = createClientComponentClient<Database>();

  // Load banners on mount
  useEffect(() => {
    loadBanners();
  }, [eventId]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/events/${eventId}/banners`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load banners');
      }

      const data: Banner[] = await response.json();
      setBanners(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = async () => {
    setSelectedSlot(null);
    await loadBanners();
    onUpdate?.();
  };

  const handleToggleActive = async (bannerId: string, currentState: boolean) => {
    try {
      setError(null);

      const response = await fetch(`/api/banners/${bannerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update banner');
      }

      await loadBanners();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update banner');
    }
  };

  const handleUpdateClickUrl = async (bannerId: string, clickUrl: string | null) => {
    try {
      setError(null);

      const response = await fetch(`/api/banners/${bannerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ click_url: clickUrl || null }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update click URL');
      }

      await loadBanners();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update click URL');
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this banner? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const response = await fetch(`/api/banners/${bannerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete banner');
      }

      await loadBanners();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete banner');
    } finally {
      setLoading(false);
    }
  };

  // Find banner for each slot
  const getBannerForSlot = (slotNumber: number): Banner | undefined => {
    return banners.find((b) => b.slot_number === slotNumber && !b.deleted_at);
  };

  // Get signed URL for banner image
  const getSignedUrl = async (storagePath: string): Promise<string> => {
    const { data } = await supabase.storage
      .from('banners')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry
    return data?.signedUrl || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Advertisement Banners</h3>
        <p className="text-sm text-gray-600">
          Manage advertisement banners for this event. Each slot has predefined dimensions and positioning.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Upload form modal */}
      {selectedSlot !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Upload Banner for Slot {selectedSlot}
                </h4>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <BannerUploadForm
                eventId={eventId}
                slotNumber={selectedSlot}
                onSuccess={handleUploadSuccess}
                onCancel={() => setSelectedSlot(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Banner slots grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(BANNER_SLOTS).map((slot) => {
          const banner = getBannerForSlot(slot.slotNumber);

          return (
            <BannerSlotCard
              key={slot.slotNumber}
              slot={slot}
              banner={banner}
              loading={loading}
              onUploadClick={() => setSelectedSlot(slot.slotNumber)}
              onToggleActive={handleToggleActive}
              onUpdateClickUrl={handleUpdateClickUrl}
              onDelete={handleDelete}
              getSignedUrl={getSignedUrl}
            />
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading banners...</p>
        </div>
      )}
    </div>
  );
}
