'use client';

import React from 'react';

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  target?: number;
  unit?: string;
  size?: number;
}

export default function GaugeChart({
  value,
  min = 0,
  max = 100,
  target,
  unit = '',
  size = 140,
}: GaugeChartProps) {
  // Normalizar valor entre 0 e 1
  const clampedValue = Math.min(Math.max(value, min), max);
  const normalized = (clampedValue - min) / (max - min || 1);

  // Ângulo de 180° (esquerda) até 0° (direita)
  // Semicírculo: startAngle = Math.PI, endAngle = 0
  const angle = Math.PI - normalized * Math.PI;

  const strokeWidth = 24;
  const radius = 50;
  const cx = 70;
  const cy = 70;

  // Coordenadas da agulha
  const needleLength = 46;
  const nx = cx + needleLength * Math.cos(angle);
  const ny = cy - needleLength * Math.sin(angle);

  // Coordenadas do marcador de meta
  let targetCoords: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (target !== undefined) {
    const clampedTarget = Math.min(Math.max(target, min), max);
    const normTarget = (clampedTarget - min) / (max - min || 1);
    const tAngle = Math.PI - normTarget * Math.PI;
    const rInner = radius - strokeWidth / 2 - 2;
    const rOuter = radius + strokeWidth / 2 + 2;
    targetCoords = {
      x1: cx + rInner * Math.cos(tAngle),
      y1: cy - rInner * Math.sin(tAngle),
      x2: cx + rOuter * Math.cos(tAngle),
      y2: cy - rOuter * Math.sin(tAngle),
    };
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div style={{ width: size, height: size * 0.65 }} className="relative overflow-hidden flex justify-center">
        <svg viewBox="0 0 140 85" className="w-full h-full">
          {/* Arco de Fundo Azul Epson */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#003B64"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {/* Marcador de Meta (Tick preto) */}
          {targetCoords && (
            <line
              x1={targetCoords.x1}
              y1={targetCoords.y1}
              x2={targetCoords.x2}
              y2={targetCoords.y2}
              stroke="#0f172a"
              strokeWidth="3.5"
            />
          )}

          {/* Agulha Vermelha */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="#EF4444"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Pivô central preto */}
          <circle cx={cx} cy={cy} r="10" fill="#0f172a" />
          <circle cx={cx} cy={cy} r="4" fill="#ffffff" />
        </svg>
      </div>

      {/* Valor Numérico Centralizado Logo Abaixo */}
      <div className="text-xl font-bold text-slate-800 tracking-tight mt-1">
        {value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{unit}
      </div>
    </div>
  );
}
