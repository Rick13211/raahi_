'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ProfileMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userInitial, setUserInitial] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch user session on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email ?? '';
        const name =
          session.user.user_metadata?.full_name ??
          session.user.user_metadata?.name ??
          email;
        setUserEmail(email);
        setUserInitial(name.charAt(0).toUpperCase());
      }
    };
    getUser();

    // Listen for auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email ?? '';
        const name =
          session.user.user_metadata?.full_name ??
          session.user.user_metadata?.name ??
          email;
        setUserEmail(email);
        setUserInitial(name.charAt(0).toUpperCase());
      } else {
        setUserInitial(null);
        setUserEmail('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Don't render anything if user isn't logged in
  if (!userInitial) return null;

  return (
    <div ref={menuRef} className="relative">
      {/* Profile Avatar Button */}
      <button
        id="profile-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        className="
          w-11 h-11 rounded-full flex items-center justify-center
          bg-gradient-to-br from-[#2563eb] to-[#7c3aed]
          text-white text-base font-bold tracking-wide
          shadow-[0_4px_14px_rgba(37,99,235,0.35)]
          hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)]
          hover:scale-105 active:scale-95
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:ring-offset-2
          select-none cursor-pointer
        "
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Open user menu"
        title={userEmail}
      >
        {userInitial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="profile-dropdown"
          className="
            absolute right-0 mt-2.5 w-56
            bg-white border border-[#e5e7eb] rounded-2xl
            shadow-[0_12px_48px_rgba(0,0,0,0.12)]
            py-1.5 z-[9999]
            animate-[dropdownIn_0.18s_ease-out]
            origin-top-right
          "
          role="menu"
          aria-labelledby="profile-menu-trigger"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-[#f3f4f6]">
            <p className="text-sm font-semibold text-[#111827] truncate">
              {userEmail}
            </p>
            <p className="text-xs text-[#9ca3af] mt-0.5">Signed in</p>
          </div>

          {/* Menu Items */}
          <div className="py-1.5">
            <MenuItem
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              }
              label="Admin Dashboard"
              onClick={() => {
                setIsOpen(false);
                router.push('/admin');
              }}
            />
            <MenuItem
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
              label="User Dashboard"
              onClick={() => {
                setIsOpen(false);
                router.push('/profile');
              }}
            />
          </div>

          {/* Divider + Logout */}
          <div className="border-t border-[#f3f4f6] pt-1.5 pb-0.5">
            <MenuItem
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              }
              label="Log out"
              onClick={handleLogout}
              danger
            />
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Reusable dropdown menu item ──────────────────────────────────────────── */
function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
        transition-colors duration-150
        ${
          danger
            ? 'text-red-600 hover:bg-red-50'
            : 'text-[#374151] hover:bg-[#f3f4f6] hover:text-[#111827]'
        }
      `}
    >
      <span className={danger ? 'text-red-400' : 'text-[#9ca3af]'}>{icon}</span>
      {label}
    </button>
  );
}
