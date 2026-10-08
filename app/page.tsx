import React from 'react';
import Navbar from '@/components/Home/Navbar';
import Hero from '@/components/Home/Hero';
import FeatureCards from '@/components/Home/FeatureCards';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#ffffff] text-[#111827] font-sans overflow-hidden relative">
      {/* Background Grid System */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '100px 100px'
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/80 via-transparent to-white/90 pointer-events-none" />

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-start w-full relative z-10">
        <Hero />
        
        {/* Feature Cards below Hero */}
        <div className="w-full relative z-20 px-6 pb-24">
           <FeatureCards />
        </div>
      </main>
    </div>
  );
}
