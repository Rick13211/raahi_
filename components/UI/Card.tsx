import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-[#f9fafb] rounded-[16px] border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
