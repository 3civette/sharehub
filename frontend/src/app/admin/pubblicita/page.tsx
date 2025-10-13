'use client';

import AdminHeader from '@/components/admin/AdminHeader';

export default function PubblicitaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
      <AdminHeader
        title="Pubblicità"
        subtitle="Gestisci annunci e sponsor per i tuoi eventi"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-800 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <svg
                className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-brandBlack dark:text-white mb-4">
              Gestione Pubblicità
            </h2>
            <p className="text-brandInk/70 dark:text-gray-400 mb-6">
              Questa sezione permette di gestire annunci pubblicitari e sponsor per i tuoi eventi.
              La funzionalità sarà disponibile a breve.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Prossimamente:</strong> Potrai creare banner pubblicitari, gestire sponsor e configurare
                la visualizzazione degli annunci nei tuoi eventi.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
