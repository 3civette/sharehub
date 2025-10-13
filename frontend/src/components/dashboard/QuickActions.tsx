'use client';

import Link from 'next/link';
import { Plus, Palette, Settings } from 'lucide-react';

export default function QuickActions() {
  return (
    <div className="bg-white dark:bg-[#111827] rounded-lg shadow-card p-6 border border-transparent dark:border-[#374151]">
      <h3 className="text-lg font-semibold text-brandBlack dark:text-white mb-4">Azioni Rapide</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/events/new"
          className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-yellow-400 hover:border-yellow-400 dark:hover:bg-yellow-400 dark:hover:border-yellow-400 hover:shadow-md active:scale-[0.98] active:shadow-sm transition-all duration-200 group"
        >
          <div className="p-2 rounded-lg transition-transform group-hover:scale-110">
            <Plus className="w-6 h-6 text-brandBlack dark:text-white group-hover:text-black" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack dark:text-white group-hover:text-black">Crea Nuovo Evento</p>
            <p className="text-sm text-brandInk/70 dark:text-[#E5E7EB] group-hover:text-black">Configura un nuovo evento</p>
          </div>
        </Link>

        <Link
          href="/admin/pubblicita"
          className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-yellow-400 hover:border-yellow-400 dark:hover:bg-yellow-400 dark:hover:border-yellow-400 hover:shadow-md active:scale-[0.98] active:shadow-sm transition-all duration-200 group"
        >
          <div className="p-2 rounded-lg transition-transform group-hover:scale-110">
            <Palette className="w-6 h-6 text-brandBlack dark:text-white group-hover:text-black" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack dark:text-white group-hover:text-black">Pubblicità</p>
            <p className="text-sm text-brandInk/70 dark:text-[#E5E7EB] group-hover:text-black">Gestisci annunci e sponsor</p>
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-yellow-400 hover:border-yellow-400 dark:hover:bg-yellow-400 dark:hover:border-yellow-400 hover:shadow-md active:scale-[0.98] active:shadow-sm transition-all duration-200 group"
        >
          <div className="p-2 rounded-lg transition-transform group-hover:scale-110">
            <Settings className="w-6 h-6 text-brandBlack dark:text-white group-hover:text-black" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack dark:text-white group-hover:text-black">Impostazioni</p>
            <p className="text-sm text-brandInk/70 dark:text-[#E5E7EB] group-hover:text-black">Configura l'account e il branding</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
