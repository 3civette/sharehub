'use client';

import { useTenant } from '@/contexts/TenantContext';
import Link from 'next/link';

export default function HomePage() {
  const { tenant, loading } = useTenant();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {tenant?.branding?.logo_url && (
              <img src={tenant.branding.logo_url} alt="Logo" className="h-10" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{tenant?.hotel_name || 'ShareHub'}</h1>
          </div>
          <Link
            href="/admin/branding"
            className="text-sm text-gray-600 hover:text-primary transition-colors"
          >
            Admin Panel
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to {tenant?.hotel_name || 'ShareHub'}
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Access event presentations, download slides, and stay connected with our latest content.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/events/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
              className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View Sample Event
            </Link>
            <Link
              href="/admin/events"
              className="px-8 py-3 bg-white text-primary border-2 border-primary rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Manage Events
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Platform Features
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="📅"
              title="Event Management"
              description="Create and manage public or private events with custom access controls."
            />
            <FeatureCard
              icon="📊"
              title="Slide Sharing"
              description="Upload, organize, and share presentation slides with attendees."
            />
            <FeatureCard
              icon="🎨"
              title="Custom Branding"
              description="Customize colors, logos, and fonts to match your brand identity."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">
            © 2025 {tenant?.hotel_name || 'ShareHub'}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h4 className="text-xl font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
