'use client';

import Link from 'next/link';
import { Plus, Palette, Settings } from 'lucide-react';

export default function QuickActions() {
  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      <h3 className="text-lg font-semibold text-brandBlack mb-4">Azioni Rapide</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/events/create"
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 active:scale-95 transition-all duration-200 group"
        >
          <div className="p-2 bg-primary text-white rounded-lg group-hover:scale-110 transition-transform shadow-button">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack">Crea Nuovo Evento</p>
            <p className="text-sm text-brandInk/70">Configura un nuovo evento</p>
          </div>
        </Link>

        <Link
          href="/admin/branding"
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-secondary/20 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary/30 active:scale-95 transition-all duration-200 group"
        >
          <div className="p-2 bg-secondary text-white rounded-lg group-hover:scale-110 transition-transform shadow-button">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack">Personalizza Branding</p>
            <p className="text-sm text-brandInk/70">Colori, logo e pubblicità</p>
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-brandSilver hover:bg-bgSoft hover:border-brandInk/20 active:scale-95 transition-all duration-200 group"
        >
          <div className="p-2 bg-brandInk text-white rounded-lg group-hover:scale-110 transition-transform shadow-button">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-brandBlack">Impostazioni</p>
            <p className="text-sm text-brandInk/70">Configura l'account</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
