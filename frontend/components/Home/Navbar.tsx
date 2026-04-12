import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 pt-5 px-4 sm:px-6 pointer-events-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between bg-white/70 backdrop-blur-2xl border border-[#e5e7eb]/50 shadow-[0_4px_24px_rgba(0,0,0,0.06),_0_1px_2px_rgba(0,0,0,0.04)] px-7 py-3.5 rounded-2xl pointer-events-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-[#111827] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-8.557l3.594 3.22a.75.75 0 01-.326 1.275l-3.97.993a.75.75 0 01-.634-.147L9.39 10.238a.75.75 0 00-.634-.147l-3.97.993a.75.75 0 01-.326-1.275l3.594-3.22a.75.75 0 01.634-.147L13.465 7.435a.75.75 0 00.634-.147z" />
            </svg>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-[#111827]">Raahi</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/register"
            className="text-sm font-semibold text-[#111827] border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] hover:border-[#d1d5db] hover:-translate-y-0.5 hover:shadow-md px-5 py-2.5 rounded-xl transition-all duration-200"
          >
            Get Started
          </Link>
          <Link
            href="/map"
            className="text-sm font-bold text-white bg-[#111827] hover:bg-[#1f2937] hover:-translate-y-0.5 hover:shadow-lg pl-5 pr-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
          >
            Open Map
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}
