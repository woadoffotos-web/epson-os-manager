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
  // Se white for true, usa a versão transparente com letras e ícone em branco puro
  // Se for false, usa a versão colorida oficial
  const imageSrc = white ? '/infoged-white.png' : '/infoged-color.png';

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        style={{
          height: `${height}px`,
          width: 'auto',
        }}
        className="transition-all duration-300 object-contain drop-shadow-sm select-none"
      />
    </div>
  );
}
