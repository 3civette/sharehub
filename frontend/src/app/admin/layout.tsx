'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Apply dark mode from localStorage
    const applyDarkMode = () => {
      const savedDarkMode = localStorage.getItem('darkMode');
      // Default to dark mode if no preference is saved
      const shouldBeDark = savedDarkMode === null ? true : savedDarkMode === 'true';

      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Save default preference if not set
      if (savedDarkMode === null) {
        localStorage.setItem('darkMode', 'true');
      }
    };

    applyDarkMode();

    // Listen for storage changes (when dark mode is toggled in another tab or page)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'darkMode') {
        applyDarkMode();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Check auth only once on mount
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth check error:', error);
          // Don't redirect on error, could be temporary
          setIsChecking(false);
          return;
        }

        if (!session) {
          router.push('/login');
          return;
        }

        setIsChecking(false);
      } catch (err) {
        console.error('Auth check exception:', err);
        setIsChecking(false);
      }
    };

    checkAuth();

    // Listen for auth changes (logout only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Rimuovo dipendenze per evitare re-render infiniti

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-[#E5E7EB]">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
      <AdminNav />
      {children}
    </div>
  );
}
