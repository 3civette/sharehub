'use client';

// AdminNav Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Navigation component for admin panel with active link highlighting

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Plus, Palette, Settings } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function AdminNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: <Home className="w-5 h-5" />
    },
    {
      label: 'Eventi',
      href: '/admin/events',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      label: 'Nuovo Evento',
      href: '/admin/events/new',
      icon: <Plus className="w-5 h-5" />
    },
    {
      label: 'Branding',
      href: '/admin/branding',
      icon: <Palette className="w-5 h-5" />
    },
    {
      label: 'Impostazioni',
      href: '/admin/settings',
      icon: <Settings className="w-5 h-5" />
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white dark:bg-[#0B0B0C] shadow-md border-b border-[#E5E7EB] dark:border-[#374151]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 py-4 px-3 border-b-2 text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  active
                    ? 'border-primary text-primary dark:text-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-transparent text-[#111827] dark:text-[#E5E7EB] hover:text-[#0B0B0C] dark:hover:text-white hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
