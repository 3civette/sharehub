'use client';

import { useState } from 'react';

interface TokenDisplayProps {
  label: string;
  token: string;
  description?: string;
}

export default function TokenDisplay({ label, token, description }: TokenDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {copied ? (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copiato!
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copia
            </span>
          )}
        </button>
      </div>
      <div className="bg-gray-50 rounded-md p-3 font-mono text-sm text-gray-700 break-all border border-gray-200">
        {token}
      </div>
    </div>
  );
}
