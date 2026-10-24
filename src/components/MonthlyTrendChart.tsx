'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface TrendDataPoint {
  month: string;
  realizado: number;
  meta: number;
}

interface MonthlyTrendChartProps {
  data: TrendDataPoint[];
  unit?: string;
  title: string;
  metaLegend?: string;
  realizadoLegend?: string;
}

export default function MonthlyTrendChart({
  data,
  unit = '',
  title,
  metaLegend = 'Meta',
  realizadoLegend = 'Realizado',
}: MonthlyTrendChartProps) {
  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1 px-1">
        <span className="truncate">{title}</span>
        <div className="flex items-center gap-3 text-[11px] font-normal">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span>
            {realizadoLegend}
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block"></span>
            {metaLegend}
          </span>
        </div>
      </div>

      <div className="w-full h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}${unit}`}
            />
            <Tooltip
              formatter={(value: any, name: string) => [
                `${Number(value).toFixed(1)}${unit}`,
                name === 'realizado' ? realizadoLegend : metaLegend,
              ]}
              labelStyle={{ fontWeight: 'bold', color: '#1E293B' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#CBD5E1',
                borderRadius: '6px',
                fontSize: '11px',
              }}
            />
            {/* Linha da Meta */}
            <Line
              type="monotone"
              dataKey="meta"
              stroke="#334155"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#334155' }}
              activeDot={{ r: 4 }}
            />
            {/* Linha Realizada */}
            <Line
              type="monotone"
              dataKey="realizado"
              stroke="#06B6D4"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#06B6D4' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
