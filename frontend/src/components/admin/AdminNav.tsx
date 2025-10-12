'use client';

// AdminNav Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Navigation component for admin panel with active link highlighting and responsive burger menu

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Plus, Palette, Settings, Menu, X } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function AdminNav() {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Close sidebar when pathname changes (navigation happened)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  return (
    <>
      <nav className="bg-white dark:bg-[#0B0B0C] shadow-md border-b border-[#E5E7EB] dark:border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex-shrink-0 lg:hidden">
              <span className="text-lg font-bold text-primary">Meeting Hub</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex space-x-8">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 py-4 px-3 border-b-2 text-sm font-medium transition-all duration-150 whitespace-nowrap
                      active:scale-95 active:shadow-inner
                      ${
                        active
                          ? 'border-primary text-primary dark:text-primary bg-primary/10 dark:bg-primary/20 shadow-sm'
                          : 'border-transparent text-[#111827] dark:text-[#E5E7EB] hover:text-[#0B0B0C] dark:hover:text-white hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-sm'
                      }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Burger Menu Button - Mobile Only */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-[#111827] dark:text-[#E5E7EB]
                hover:bg-primary/10 dark:hover:bg-primary/20
                active:scale-90 active:bg-primary/20 dark:active:bg-primary/30
                transition-all duration-150 shadow-sm hover:shadow-md active:shadow-inner"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-[#0B0B0C] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden border-l border-[#E5E7EB] dark:border-[#374151] ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] dark:border-[#374151]">
          <span className="text-lg font-bold text-primary">Menu</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg text-[#111827] dark:text-[#E5E7EB]
              hover:bg-primary/10 dark:hover:bg-primary/20
              active:scale-90 active:bg-primary/20 dark:active:bg-primary/30
              transition-all duration-150 shadow-sm hover:shadow-md active:shadow-inner"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="py-4">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-4 text-base font-medium transition-all duration-150
                  active:scale-95 active:shadow-inner active:pl-8
                  ${
                    active
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border-r-4 border-primary shadow-sm'
                      : 'text-[#111827] dark:text-[#E5E7EB] hover:bg-primary/5 dark:hover:bg-primary/10 hover:pl-8 hover:shadow-sm'
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
