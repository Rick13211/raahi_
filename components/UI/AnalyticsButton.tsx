'use client';

import { useRouter } from 'next/navigation';

interface AnalyticsButtonProps {
  className?: string;
}

export default function AnalyticsButton({ className = '' }: AnalyticsButtonProps) {
  const router = useRouter();

  return (
    <button
      id="analytics-button"
      onClick={() => router.push('/analytics')}
      className={`
        rounded-[14px] flex items-center justify-center transition-all
        bg-white hover:bg-[#f9fafb] border border-[#e5e7eb] text-[#2563eb]
        shadow-sm hover:scale-105 active:scale-95
        focus:outline-none focus:ring-4 focus:ring-[#2563eb]/15
        ${className}
      `}
      title="Analytics"
      aria-label="View analytics"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    </button>
  );
}