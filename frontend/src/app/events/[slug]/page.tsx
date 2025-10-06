'use client';

import { useParams } from 'next/navigation';

export default function EventPage() {
  const params = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Event Details</h1>
        <p className="text-gray-600">Event ID: {params.slug}</p>
      </main>
    </div>
  );
}
