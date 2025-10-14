'use client';

// Feature 004: Public Event Page - Token Form Component
// Date: 2025-10-07
// Form for entering access token for private events

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateToken } from '@/services/eventClient';

interface TokenFormProps {
  slug: string;
}

export default function TokenForm({ slug }: TokenFormProps) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (token.length !== 21) {
      setError('Access token must be exactly 21 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await validateToken(slug, token);

      if (result.valid && result.token_id) {
        // Store token in sessionStorage
        sessionStorage.setItem(`event-token-${slug}`, token);
        sessionStorage.setItem(`event-token-id-${slug}`, result.token_id);

        // Redirect with token in URL
        router.push(`/events/${slug}?token=${encodeURIComponent(token)}`);
      } else {
        setError(result.message || 'Invalid token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Private Event</h2>
        <p className="mt-1 text-sm text-gray-400">
          This event requires an access token to view. Please enter your token below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="access-token"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Access Token
          </label>
          <input
            id="access-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter 21-character token"
            maxLength={21}
            className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-describedby={error ? 'token-error' : undefined}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Token length: {token.length}/21
          </p>
        </div>

        {error && (
          <div
            id="token-error"
            className="p-3 bg-red-900/20 border border-red-200 rounded-md"
            role="alert"
          >
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || token.length !== 21}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Validating...' : 'Access Event'}
        </button>
      </form>
    </div>
  );
}
