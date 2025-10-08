'use client';

// Feature 004: Public Event Page - Public Metrics Component
// Date: 2025-10-07
// Displays page views and download count with optional live polling

import { useState, useEffect } from 'react';
import { fetchPublicMetrics } from '@/services/eventClient';

interface PublicMetricsProps {
  slug: string;
  initialMetrics: {
    page_views: number;
    total_slide_downloads: number;
  };
  polling?: boolean; // Enable live updates every 30s
}

export default function PublicMetrics({
  slug,
  initialMetrics,
  polling = false,
}: PublicMetricsProps) {
  const [metrics, setMetrics] = useState(initialMetrics);

  useEffect(() => {
    if (!polling) return;

    // Poll every 30 seconds for live updates
    const interval = setInterval(async () => {
      try {
        const updated = await fetchPublicMetrics(slug);
        setMetrics(updated);
      } catch (error) {
        console.error('Failed to fetch updated metrics:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [slug, polling]);

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="flex items-center gap-1">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        {formatNumber(metrics.page_views)} views
      </span>

      <span className="text-gray-400">·</span>

      <span className="flex items-center gap-1">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {formatNumber(metrics.total_slide_downloads)} downloads
      </span>
    </div>
  );
}
