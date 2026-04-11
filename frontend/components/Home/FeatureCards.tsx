import React from 'react';
import Card from '@/components/UI/Card';

export default function FeatureCards() {
  const features = [
    {
      title: "Community Verified Routes",
      description: "Get real-time updates from other users about blockages, broken streetlights, or unsafe areas.",
      icon: (
        <svg className="w-6 h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      title: "Smart Safety Scores",
      description: "Our AI evaluates dynamically illuminated areas, police patrols, and historical data to assign safety scores.",
      icon: (
        <svg className="w-6 h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: "Seamless Navigation",
      description: "Experience clean, responsive layout designed like modern native apps tailored precisely for ease of use.",
      icon: (
        <svg className="w-6 h-6 text-[#111827]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
      {features.map((feature, idx) => (
        <Card key={idx} className="p-8 group group-hover:border-[#e5e7eb] border-transparent bg-white shadow-sm hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-white border border-[#e5e7eb] flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform duration-300">
            {feature.icon}
          </div>
          <h3 className="text-lg font-semibold text-[#111827] mb-3">{feature.title}</h3>
          <p className="text-sm text-[#6b7280] font-medium leading-relaxed">
            {feature.description}
          </p>
        </Card>
      ))}
    </div>
  );
}
