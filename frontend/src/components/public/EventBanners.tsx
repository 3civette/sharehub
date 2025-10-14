'use client';

/**
 * EventBanners Component
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 *
 * Displays active advertisement banners on public event pages.
 * Each banner is positioned according to its slot configuration.
 * Banners are clickable if a click_url is configured.
 */

import React, { useState, useEffect } from 'react';
import { BANNER_SLOTS, type BannerSlotConfig } from '@/lib/banners';

interface PublicBanner {
  id: string;
  event_id: string;
  slot_number: number;
  filename: string;
  click_url: string | null;
  image_url: string;
  created_at: string;
}

interface EventBannersProps {
  eventSlug: string;
  position?: 'header' | 'sidebar' | 'footer' | 'content' | 'all';
}

export default function EventBanners({ eventSlug, position = 'all' }: EventBannersProps) {
  const [banners, setBanners] = useState<PublicBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBanners();
  }, [eventSlug]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/public/events/${eventSlug}/banners`);

      if (!response.ok) {
        throw new Error('Failed to load banners');
      }

      const data: PublicBanner[] = await response.json();
      setBanners(data);
    } catch (err) {
      console.error('Error loading banners:', err);
      setError(err instanceof Error ? err.message : 'Failed to load banners');
      setBanners([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Filter banners by position if specified
  const filteredBanners = position === 'all'
    ? banners
    : banners.filter((banner) => {
        const slot = BANNER_SLOTS[banner.slot_number as keyof typeof BANNER_SLOTS];
        return slot?.position === position;
      });

  // If loading or error, return nothing (fail silently for public display)
  if (loading || error || filteredBanners.length === 0) {
    return null;
  }

  return (
    <div className="event-banners space-y-4">
      {filteredBanners.map((banner) => {
        const slot = BANNER_SLOTS[banner.slot_number as keyof typeof BANNER_SLOTS];
        if (!slot) return null;

        return (
          <BannerSlot
            key={banner.id}
            banner={banner}
            slot={slot}
          />
        );
      })}
    </div>
  );
}

// Individual banner slot component
interface BannerSlotProps {
  banner: PublicBanner;
  slot: BannerSlotConfig;
}

function BannerSlot({ banner, slot }: BannerSlotProps) {
  const handleClick = () => {
    if (banner.click_url) {
      // Track click if analytics are enabled
      window.open(banner.click_url, '_blank', 'noopener,noreferrer');
    }
  };

  const content = (
    <div
      className={`banner-slot relative overflow-hidden rounded-lg bg-gray-100 ${
        banner.click_url ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      }`}
      style={{
        aspectRatio: `${slot.width} / ${slot.height}`,
        maxWidth: `${slot.width}px`,
      }}
      onClick={banner.click_url ? handleClick : undefined}
      role={banner.click_url ? 'button' : undefined}
      tabIndex={banner.click_url ? 0 : undefined}
      onKeyDown={(e) => {
        if (banner.click_url && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <img
        src={banner.image_url}
        alt={`Advertisement banner ${slot.slotNumber}`}
        className="w-full h-full object-contain"
        loading="lazy"
      />
      {banner.click_url && (
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-5 transition-all" />
      )}
    </div>
  );

  return content;
}

// Export named components for specific positions
export function HeaderBanner({ eventSlug }: { eventSlug: string }) {
  return <EventBanners eventSlug={eventSlug} position="header" />;
}

export function SidebarBanner({ eventSlug }: { eventSlug: string }) {
  return <EventBanners eventSlug={eventSlug} position="sidebar" />;
}

export function FooterBanner({ eventSlug }: { eventSlug: string }) {
  return <EventBanners eventSlug={eventSlug} position="footer" />;
}

export function ContentBanner({ eventSlug }: { eventSlug: string }) {
  return <EventBanners eventSlug={eventSlug} position="content" />;
}
