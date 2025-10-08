// Feature 005: Slide Upload Page
// Upload and manage slides for a speech

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import SlideUpload from '@/components/admin/SlideUpload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
    speechId: string;
  };
}

export default async function SlidesUploadPage({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies });

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  try {
    // Fetch speech details
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/speeches/${params.speechId}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch speech');
    }

    const speech = await response.json();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <a
              href={`/admin/events/${params.id}/dashboard`}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← Torna alla Dashboard
            </a>
          </div>

          {/* Page Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Slide</h1>
          <p className="text-gray-600 mb-8">
            Intervento: <span className="font-semibold">{speech.title}</span>
            {speech.speaker_name && ` - ${speech.speaker_name}`}
          </p>

          {/* Slide Upload Component */}
          <SlideUpload
            eventId={params.id}
            speechId={params.speechId}
            accessToken={session.access_token}
          />
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Slides page error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
          <p className="text-gray-700 mb-4">
            Impossibile caricare la pagina di upload slide.
          </p>
          <a
            href={`/admin/events/${params.id}/dashboard`}
            className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Torna alla Dashboard
          </a>
        </div>
      </div>
    );
  }
}
