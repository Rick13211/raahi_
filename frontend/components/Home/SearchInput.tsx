import React from 'react';
import Card from '@/components/UI/Card';
import Link from 'next/link';

export default function SearchInput() {
  return (
    <div className="w-full max-w-3xl mx-auto px-6 mt-12 mb-20 relative z-20">
      <Card className="p-8 md:p-10 flex flex-col justify-between min-h-[220px]">
        {/* Input prompt simulation */}
        <div className="flex items-center text-[#6b7280] font-medium text-lg mt-2 mb-8 bg-transparent">
           <span className="w-0.5 h-6 bg-[#2563eb] mr-2 rounded-full opacity-60" />
           Where do you want to navigate safely?
        </div>
        
        {/* Search Input Simulation bottom controls */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            <Link href="/map" className="px-5 py-2.5 rounded-full border border-[#e5e7eb] text-xs font-semibold text-[#111827] bg-white hover:bg-[#f9fafb] transition-colors shadow-sm">
              Try a Route
            </Link>
            <Link href="/map" className="px-5 py-2.5 rounded-full border border-transparent text-xs font-semibold text-[#6b7280] hover:text-[#111827] transition-colors">
              Help Me Navigate
            </Link>
          </div>
          
          <Link href="/map" className="w-9 h-9 rounded-lg bg-[#e5e7eb] text-[#6b7280] flex items-center justify-center hover:bg-[#d1d5db] transition-colors cursor-pointer">
            <svg className="w-4 h-4 -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </Card>
    </div>
  );
}
