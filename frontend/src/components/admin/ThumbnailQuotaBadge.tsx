'use client';

/**
 * ThumbnailQuotaBadge Component
 * Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
 * Purpose: Display thumbnail quota status in admin UI
 */

import React, { useEffect, useState } from 'react';

interface QuotaData {
  available: boolean;
  used: number;
  total: number;
  remaining: number;
}

interface ThumbnailQuotaBadgeProps {
  /**
   * If true, fetches quota data from API on mount
   * If false, must provide quotaData prop
   */
  autoFetch?: boolean;
  /**
   * Pre-fetched quota data (optional if autoFetch is true)
   */
  quotaData?: QuotaData;
  /**
   * Show detailed quota stats (vs compact badge)
   */
  detailed?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export default function ThumbnailQuotaBadge({
  autoFetch = false,
  quotaData: initialQuotaData,
  detailed = false,
  className = '',
}: ThumbnailQuotaBadgeProps) {
  const [quotaData, setQuotaData] = useState<QuotaData | null>(
    initialQuotaData || null
  );
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoFetch) {
      fetchQuota();
    }
  }, [autoFetch]);

  const fetchQuota = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/thumbnails/quota');

      if (!response.ok) {
        throw new Error('Failed to fetch quota');
      }

      const data = await response.json();
      setQuotaData(data.quota);
    } catch (err) {
      console.error('Error fetching thumbnail quota:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`inline-flex items-center px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-600 ${className}`}
      >
        <span className="animate-pulse">Caricamento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`inline-flex items-center px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 ${className}`}
        title={error}
      >
        <span>Errore quota</span>
      </div>
    );
  }

  if (!quotaData) {
    return null;
  }

  // Calculate percentage and color coding
  const usagePercent = (quotaData.used / quotaData.total) * 100;
  const isLow = usagePercent >= 80; // 80%+ usage = warning
  const isExhausted = !quotaData.available;

  // Color scheme based on quota status
  const bgColor = isExhausted
    ? 'bg-red-100 dark:bg-red-900/20'
    : isLow
    ? 'bg-yellow-100 dark:bg-yellow-900/20'
    : 'bg-green-100 dark:bg-green-900/20';

  const textColor = isExhausted
    ? 'text-red-700 dark:text-red-300'
    : isLow
    ? 'text-yellow-700 dark:text-yellow-300'
    : 'text-green-700 dark:text-green-300';

  const borderColor = isExhausted
    ? 'border-red-200 dark:border-red-800'
    : isLow
    ? 'border-yellow-200 dark:border-yellow-800'
    : 'border-green-200 dark:border-green-800';

  if (detailed) {
    // Detailed view with progress bar
    return (
      <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-sm font-medium ${textColor}`}>
            Quota Thumbnail
          </h4>
          <span className={`text-xs font-semibold ${textColor}`}>
            {quotaData.remaining} rimanenti
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-300 ${
              isExhausted
                ? 'bg-red-500'
                : isLow
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={textColor}>
            {quotaData.used} / {quotaData.total} utilizzati
          </span>
          <span className={textColor}>{Math.round(usagePercent)}%</span>
        </div>

        {isExhausted && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            Quota esaurita.{' '}
            <a
              href="/admin/settings/billing?upgrade=thumbnail-quota"
              className="underline hover:no-underline"
            >
              Aggiorna piano
            </a>
          </p>
        )}
      </div>
    );
  }

  // Compact badge view
  return (
    <div
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${bgColor} ${textColor} ${borderColor} ${className}`}
      title={`${quotaData.used} / ${quotaData.total} thumbnail utilizzate`}
    >
      <svg
        className="w-3 h-3 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      {quotaData.remaining}/{quotaData.total}
    </div>
  );
}
