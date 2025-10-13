'use client';

// BrandingPreview Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Live preview using CSS custom properties (research.md decision 3)

import React from 'react';

interface BrandingPreviewProps {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
}

export default function BrandingPreview({
  primaryColor,
  secondaryColor,
  logoUrl
}: BrandingPreviewProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Live Preview
      </label>

      <div
        className="p-6 border-2 border-gray-800 rounded-lg bg-gray-900"
        style={{
          '--color-primary': primaryColor,
          '--color-secondary': secondaryColor
        } as React.CSSProperties}
      >
        {/* Header with logo and primary background */}
        <div
          className="p-4 rounded-md mb-4 flex items-center justify-between"
          style={{ backgroundColor: primaryColor }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 object-contain"
            />
          ) : (
            <div className="h-10 w-32 bg-white/30 rounded flex items-center justify-center">
              <span className="text-white text-xs font-medium">Your Logo</span>
            </div>
          )}

          <span className="text-white font-medium">Admin Panel</span>
        </div>

        {/* Sample content */}
        <div className="space-y-3">
          <h3
            className="text-lg font-semibold"
            style={{ color: primaryColor }}
          >
            Welcome to Your Dashboard
          </h3>

          <p className="text-gray-400 text-sm">
            This is how your branding will appear across the admin panel and attendee-facing pages.
          </p>

          {/* Sample button with secondary color */}
          <button
            className="px-4 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: secondaryColor }}
          >
            Sample Button
          </button>

          {/* Sample card */}
          <div className="border border-gray-700 rounded-md p-4 bg-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-sm font-medium text-gray-200">
                Event Card
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Your events will use these colors for visual elements.
            </p>
          </div>
        </div>

        {/* Color indicators */}
        <div className="mt-4 pt-4 border-t border-gray-700 flex gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-gray-600"
              style={{ backgroundColor: primaryColor }}
            />
            <span>Primary: {primaryColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-gray-600"
              style={{ backgroundColor: secondaryColor }}
            />
            <span>Secondary: {secondaryColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
