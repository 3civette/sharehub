'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Home } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || '');
    };
    getUserEmail();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="bg-white dark:bg-[#0B0B0C] shadow-sm border-b border-[#E5E7EB] dark:border-[#374151]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Title and subtitle */}
          <div>
            <h1 className="text-2xl font-bold text-[#111827] dark:text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-[#E5E7EB] mt-1">{subtitle}</p>
            )}
          </div>

          {/* Right: User email + Actions + Dashboard + Logout */}
          <div className="flex items-center gap-3">
            {/* User email */}
            {userEmail && (
              <span className="text-sm text-gray-600 dark:text-[#E5E7EB]">
                Loggato come: <span className="font-semibold text-[#111827] dark:text-white">{userEmail}</span>
              </span>
            )}

            {/* Custom actions (optional - e.g., "Nuovo Evento" button) */}
            {actions}

            {/* Dashboard button */}
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 text-sm font-medium text-[#111827] dark:text-[#E5E7EB] bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1F2937] transition-colors flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Dashboard
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-[#111827] dark:text-[#E5E7EB] bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1F2937] transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
