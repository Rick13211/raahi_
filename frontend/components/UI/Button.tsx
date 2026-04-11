import React from 'react';
import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
  onClick?: () => void;
}

export default function Button({ children, href, className = '', onClick }: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#2563eb]/20 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:bg-[#1d4ed8] bg-[#2563eb] text-white";
  const mergedClasses = `${baseClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={mergedClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={mergedClasses}>
      {children}
    </button>
  );
}
