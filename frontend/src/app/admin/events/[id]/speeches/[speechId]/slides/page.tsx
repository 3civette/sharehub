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
    // Fetch speech details from Supabase
    const { data: speech, error: speechError } = await supabase
      .from('speeches')
      .select('*')
      .eq('id', params.speechId)
      .single();

    if (speechError || !speech) {
      throw new Error('Failed to fetch speech');
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <a
              href={`/admin/events/${params.id}/dashboard`}
              className="text-primary hover:text-primary/90 flex items-center gap-2"
            >
              ← Torna alla Dashboard
            </a>
          </div>

          {/* Page Title */}
          <h1 className="text-3xl font-bold text-brandBlack mb-2">Upload Slide</h1>
          <p className="text-brandInk/70 mb-8">
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C] flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-8 max-w-md border border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
          <p className="text-brandInk mb-4">
            Impossibile caricare la pagina di upload slide.
          </p>
          <a
            href={`/admin/events/${params.id}/dashboard`}
            className="block text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Torna alla Dashboard
          </a>
        </div>
      </div>
    );
  }
}
