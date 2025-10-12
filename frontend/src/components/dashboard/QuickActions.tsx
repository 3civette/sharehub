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
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary/30 dark:hover:border-primary active:scale-95 transition-all duration-200 group"
        >
          <div className="p-2 bg-primary text-white rounded-lg group-hover:scale-110 transition-transform shadow-button">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack dark:text-white">Crea Nuovo Evento</p>
            <p className="text-sm text-brandInk/70 dark:text-[#E5E7EB]">Configura un nuovo evento</p>
          </div>
        </Link>

        <Link
          href="/admin/branding"
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-secondary/20 dark:border-secondary/30 bg-secondary/5 dark:bg-secondary/10 hover:bg-secondary/10 dark:hover:bg-secondary/20 hover:border-secondary/30 dark:hover:border-secondary active:scale-95 transition-all duration-200 group"
        >
          <div className="p-2 bg-secondary dark:bg-[#0B0B0C] text-white rounded-lg group-hover:scale-110 transition-transform shadow-button">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack dark:text-white">Pubblicità</p>
            <p className="text-sm text-brandInk/70 dark:text-[#E5E7EB]">Gestisci annunci e sponsor</p>
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-brandSilver dark:border-[#374151] hover:bg-bgSoft dark:hover:bg-[#0B0B0C] hover:border-brandInk/20 dark:hover:border-[#E5E7EB]/20 active:scale-95 transition-all duration-200 group"
        >
          <div className="p-2 bg-brandInk dark:bg-[#0B0B0C] text-white rounded-lg group-hover:scale-110 transition-transform shadow-button">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack dark:text-white">Impostazioni</p>
            <p className="text-sm text-brandInk/70 dark:text-[#E5E7EB]">Configura l'account</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
