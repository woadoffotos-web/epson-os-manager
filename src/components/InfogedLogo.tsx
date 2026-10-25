'use client';

import React from 'react';

interface InfogedLogoProps {
  className?: string;
  white?: boolean;
  height?: number;
  alt?: string;
}

export default function InfogedLogo({
  className = '',
  white = true,
  height = 36,
  alt = 'INFOGED Soluções Tecnológicas',
}: InfogedLogoProps) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src="/infoged-logo.png"
        alt={alt}
        style={{
          height: `${height}px`,
          width: 'auto',
          filter: white ? 'brightness(0) invert(1)' : 'none',
        }}
        className="transition-all duration-300 object-contain drop-shadow-sm select-none"
      />
    </div>
  );
}
