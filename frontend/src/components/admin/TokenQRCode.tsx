'use client';

// TokenQRCode Component
// Feature: 005-ora-bisogna-implementare (Event Details Management)
// Displays QR code for access token with copy and revoke functionality

import React, { useState, useEffect } from 'react';

interface TokenQRCodeProps {
  eventId: string;
  tokenId: string;
  tokenType: 'organizer' | 'participant';
  token: string; // Admin auth token
  onRevoke?: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TokenQRCode({
  eventId,
  tokenId,
  tokenType,
  token,
  onRevoke,
}: TokenQRCodeProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copyUrl, setCopyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadTokenData();
  }, [eventId, tokenId]);

  const loadTokenData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch QR code
      const qrResponse = await fetch(
        `${API_BASE_URL}/api/events/${eventId}/tokens/${tokenId}/qr`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!qrResponse.ok) {
        throw new Error('Failed to load QR code');
      }

      const qrData = await qrResponse.json();
      setQrCodeDataUrl(qrData.qr_code_data_url);
      setRevoked(qrData.revoked || false);

      // Fetch copy URL
      const urlResponse = await fetch(
        `${API_BASE_URL}/api/events/${eventId}/tokens/${tokenId}/copy-url`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!urlResponse.ok) {
        throw new Error('Failed to load copy URL');
      }

      const urlData = await urlResponse.json();
      setCopyUrl(urlData.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!copyUrl) return;

    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/events/${eventId}/tokens/${tokenId}/revoke`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to revoke token');
      }

      setRevoked(true);
      onRevoke?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !qrCodeDataUrl) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Token info */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900 capitalize">
            {tokenType} Token
          </h4>
          <p className="text-xs text-gray-500">ID: {tokenId.slice(0, 8)}...</p>
        </div>
        {revoked && (
          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
            Revoked
          </span>
        )}
        {!revoked && (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
            Active
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* QR Code display */}
      {qrCodeDataUrl && (
        <div className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-lg">
          <img
            src={qrCodeDataUrl}
            alt={`${tokenType} QR Code`}
            className="w-64 h-64"
          />
          <p className="text-xs text-gray-500 mt-2">Scan to access event</p>
        </div>
      )}

      {/* Copy URL section */}
      {copyUrl && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Access URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={copyUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={handleCopyToClipboard}
              disabled={revoked}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Revoke button */}
      {!revoked && (
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Revoking...' : 'Revoke Token'}
        </button>
      )}

      {revoked && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
          <p className="text-sm text-gray-600">
            This token has been revoked and can no longer be used to access the event.
          </p>
        </div>
      )}
    </div>
  );
}
