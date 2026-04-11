import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="relative w-full z-50 bg-transparent pt-8 pb-4">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl font-extrabold tracking-tight text-[#111827]">Raahi</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm font-medium text-[#111827] hover:text-[#2563eb] bg-white border border-[#e5e7eb] px-4 py-2 rounded-lg transition-all shadow-sm"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium text-white hover:bg-[#1d4ed8] bg-[#2563eb] border border-[#2563eb] px-4 py-2 rounded-lg transition-all shadow-sm"
          >
            Sign Up
          </Link>
          <Link
            href="/map"
            className="text-sm font-medium text-[#111827] hover:text-white hover:bg-[#111827] bg-white border border-[#e5e7eb] px-5 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            Open Map
          </Link>
        </nav>
      </div>
    </header>
  );
}
