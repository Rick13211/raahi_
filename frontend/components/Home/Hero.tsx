import React from 'react';
import Button from '@/components/UI/Button';

export default function Hero() {
  return (
    <div className="max-w-3xl mx-auto text-center space-y-8 px-6 w-full flex flex-col items-center pt-24 pb-8 relative z-20">
      
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#e5e7eb] text-[#6b7280] text-xs font-semibold uppercase tracking-widest shadow-sm">
        YOUR PATH, PERFECTLY SAFE
      </div>
      
      <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.1] text-[#111827]">
        Navigate With <br />
        <span className="text-[#2563eb]">Absolute Confidence.</span>
      </h1>
      
      <p className="text-lg md:text-xl text-[#6b7280] max-w-xl mx-auto leading-relaxed mt-4">
        Raahi is a beautiful, safety-aware navigation engine that routes you through well-lit, populated, and community-verified paths.
      </p>

      <div className="pt-8">
        <Button href="/map">
          Plan Safe Route
          <svg className="w-5 h-5 ml-2 -mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
