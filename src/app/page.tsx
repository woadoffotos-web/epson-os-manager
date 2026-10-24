'use client';

import React, { useState, useEffect } from 'react';
import GaugeChart from '@/components/GaugeChart';
import MonthlyTrendChart from '@/components/MonthlyTrendChart';
import { Award, AlertCircle, RefreshCw, Calendar, TrendingUp, Info } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/metrics?month=${selectedMonth}&year=${selectedYear}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedMonth, selectedYear]);

  const kpis = data?.kpis || {
    ordensAtendidas: 0,
    tmf: 0,
    cabecaPercent: 0,
    reincidenciaPercent: 0,
    pecasPercent: 0,
    ordensEnc30DPercent: 100,
    auditoriaScore: 80,
  };

  const evalWeights = data?.evaluation || {
    tmfWeight: 5,
    reincidenciaWeight: 5,
    cabecaWeight: 5,
    pecasWeight: 5,
    auditoriaWeight: 4,
    ordens30DWeight: 5,
    totalScore: 29,
    tier: 'PLATINUM',
  };

  // Cores de Tiers
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'PLATINUM':
        return 'bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-md border-cyan-400';
      case 'GOLD':
        return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md border-amber-300';
      case 'SILVER':
        return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-md border-slate-300';
      default:
        return 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-md border-red-400';
    }
  };

  // Gerar dados para os gráficos de tendência mensal
  const timeline = data?.monthlyTimeline || [];
  const tmfChartData = timeline.map((m: any) => ({
    month: `${m.calYear} ${m.monthName}`,
    realizado: m.kpis?.tmf ?? 0,
    meta: 8.0,
  }));

  const reincidenciaChartData = timeline.map((m: any) => ({
    month: `${m.calYear} ${m.monthName}`,
    realizado: m.kpis?.reincidenciaPercent ?? 0,
    meta: 5.0,
  }));

  const cabecaChartData = timeline.map((m: any) => ({
    month: `${m.calYear} ${m.monthName}`,
    realizado: m.kpis?.cabecaPercent ?? 0,
    meta: 18.0,
  }));

  const auditoriaChartData = timeline.map((m: any) => ({
    month: `${m.calYear} ${m.monthName}`,
    realizado: m.kpis?.auditoriaScore ?? 80.0,
    meta: 80.0,
  }));

  const pecasChartData = timeline.map((m: any) => ({
    month: `${m.calYear} ${m.monthName}`,
    realizado: m.kpis?.pecasPercent ?? 0,
    meta: 95.0,
  }));

  const oss30DChartData = timeline.map((m: any) => ({
    month: `${m.calYear} ${m.monthName}`,
    realizado: m.kpis?.ordensEnc30DPercent ?? 100.0,
    meta: 100.0,
  }));

  return (
    <div className="space-y-4">
      {/* 1. Faixa Superior de Métricas Corporativas Epson (Idêntica à Imagem de Referência) */}
      <div className="bg-[#002B49] text-white rounded-lg p-3 shadow-md grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center divide-x divide-blue-900/50">
        <div className="px-2">
          <div className="text-[11px] text-slate-300 font-semibold">% Cursos obrigatórios</div>
          <div className="text-xl md:text-2xl font-black text-white mt-0.5">
            {data?.coursesPercent ?? 100}%
          </div>
        </div>

        <div className="px-2">
          <div className="text-[11px] text-slate-300 font-semibold">Qtd OS Consumer</div>
          <div className="text-xl md:text-2xl font-black text-white mt-0.5">
            {data?.annualTotalOrders ?? 0}
          </div>
        </div>

        <div className="px-2">
          <div className="text-[11px] text-slate-300 font-semibold">TMR</div>
          <div className="text-xl md:text-2xl font-black text-cyan-300 mt-0.5">
            {(kpis.tmf ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
          </div>
        </div>

        <div className="px-2">
          <div className="text-[11px] text-slate-300 font-semibold">TMPP</div>
          <div className="text-xl md:text-2xl font-black text-cyan-300 mt-0.5">
            {(data?.tmpp ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
          </div>
        </div>

        <div className="px-2">
          <div className="text-[11px] text-slate-300 font-semibold">Nota Class Anual</div>
          <div className="text-xl md:text-2xl font-black text-emerald-400 mt-0.5">
            {(data?.notaClassAnual ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="px-2 flex flex-col items-center justify-center">
          <div className="text-[11px] text-slate-300 font-semibold">Class Anual</div>
          <div className="text-xl md:text-2xl font-black tracking-wider text-cyan-300 mt-0.5 drop-shadow">
            {data?.classAnual ?? '-'}
          </div>
        </div>
      </div>

      {/* 2. Barra da Linha do Tempo Mensal (Ano Fiscal Epson - Abril a Março) */}
      <div className="bg-[#001B30] text-white rounded-lg p-2.5 shadow-sm overflow-x-auto flex items-center justify-between gap-2 border border-blue-900/80">
        <div className="flex items-center gap-2 pl-2 shrink-0">
          <span className="font-bold text-sm text-cyan-300">{data?.fiscalYear || selectedYear}</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {timeline.map((m: any) => {
            const isSelected = m.calMonth === selectedMonth && m.calYear === selectedYear;
            return (
              <button
                key={`${m.calYear}-${m.monthName}`}
                onClick={() => {
                  setSelectedMonth(m.calMonth);
                  setSelectedYear(m.calYear);
                }}
                className={`px-3 py-1 rounded text-center transition flex flex-col items-center min-w-[70px] ${
                  isSelected
                    ? 'bg-cyan-600 text-white ring-2 ring-cyan-300 shadow'
                    : 'bg-[#002B49] text-slate-300 hover:bg-blue-900/60'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-tight">{m.monthName}</span>
                <span className="text-[9px] font-black tracking-wider mt-0.5 text-cyan-200">
                  {m.tier}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo do Mês Selecionado: Nota Class Mensal, Class Mensal e Saldos Disponíveis */}
      {(() => {
        const notaMensal = data?.notaClassMensal ?? evalWeights.totalScore;
        const clsMensal = data?.classMensal ?? evalWeights.tier;
        const saldoCab = data?.saldoCabecasPedir ?? kpis.saldoCabecasPedir ?? 0;
        const saldoPcs = data?.saldoPecasPedir ?? kpis.saldoPecasPedir ?? 0;

        return (
          <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded bg-blue-50/60 border border-blue-100">
              <span className="text-[11px] font-bold text-blue-900 block">Nota Class Mensal</span>
              <span className="text-xl font-black text-blue-900 mt-0.5">
                {notaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-blue-700 block">de 30,00 pontos</span>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-slate-700 block">Class Mensal</span>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full mt-1 tracking-wider uppercase ${getTierBadge(
                  clsMensal
                )}`}
              >
                {clsMensal}
              </span>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span
                className="text-[11px] font-bold text-slate-700 block"
                title="Quantidade de cabeças que ainda pode faturar no mês sem perder pontos (Meta <= 18,0%)"
              >
                Cabeças a Pedir (Saldo 5 pts)
              </span>
              <span
                className={`text-xl font-black mt-0.5 ${
                  saldoCab >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {saldoCab >= 0 ? '+' : ''}
                {saldoCab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {saldoCab >= 0 ? 'Permitido sem perder nota' : 'Excedente (perdendo pontos)'}
              </span>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span
                className="text-[11px] font-bold text-slate-700 block"
                title="Quantidade de peças totais que ainda pode faturar no mês sem perder pontos (Meta <= 95,0%)"
              >
                Peças a Pedir (Saldo 5 pts)
              </span>
              <span
                className={`text-xl font-black mt-0.5 ${
                  saldoPcs >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {saldoPcs >= 0 ? '+' : ''}
                {saldoPcs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {saldoPcs >= 0 ? 'Permitido sem perder nota' : 'Excedente (perdendo pontos)'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* 3. Grid dos 6 Manômetros & Gráficos de Tendência (Estrutura Fiel ao Modelo Oficial) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna Esquerda - Card 1: TMF Consumer e Meta */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-44 shrink-0 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-1 text-center">
              TMF Consumer
            </span>
            <GaugeChart value={kpis.tmf ?? 0} min={0} max={15} target={8.0} unit="" />
            <span className="text-[10px] text-slate-400 mt-1">Meta: $\le$ 8,0 dias</span>
          </div>
          <div className="w-full flex-1">
            <MonthlyTrendChart
              data={tmfChartData}
              title="TMF Consumer e Meta"
              metaLegend="Média de TMF"
              realizadoLegend="Média de TMF Consumer"
            />
          </div>
        </div>

        {/* Coluna Direita - Card 4: Nota da Última Auditoria e Meta */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-44 shrink-0 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-1 text-center">
              Auditoria
            </span>
            <GaugeChart value={kpis.auditoriaScore ?? 80.0} min={0} max={100} target={80.0} unit="" />
            <span className="text-[10px] text-slate-400 mt-1">Meta: $\ge$ 80,0 pts</span>
          </div>
          <div className="w-full flex-1">
            <MonthlyTrendChart
              data={auditoriaChartData}
              title="Nota da Última Auditoria e Meta"
              metaLegend="Audit target"
              realizadoLegend="Nota Auditoria"
            />
          </div>
        </div>

        {/* Coluna Esquerda - Card 2: Reincidência Consumer e Meta */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-44 shrink-0 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-1 text-center">
              Reincidência
            </span>
            <GaugeChart value={kpis.reincidenciaPercent ?? 0} min={0} max={15} target={5.0} unit="%" />
            <span className="text-[10px] text-slate-400 mt-1">Meta: $\le$ 5,0%</span>
          </div>
          <div className="w-full flex-1">
            <MonthlyTrendChart
              data={reincidenciaChartData}
              title="Reincidência Consumer e Meta"
              unit="%"
              metaLegend="Meta Reincidência"
              realizadoLegend="Média REI <90D"
            />
          </div>
        </div>

        {/* Coluna Direita - Card 5: Consumo Geral de Peças */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-44 shrink-0 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-1 text-center">
              Consumo Geral
            </span>
            <GaugeChart value={kpis.pecasPercent ?? 0} min={0} max={150} target={95.0} unit="%" />
            <span className="text-[10px] text-slate-400 mt-1">Meta: $\le$ 95,0%</span>
          </div>
          <div className="w-full flex-1">
            <MonthlyTrendChart
              data={pecasChartData}
              title="Consumo Geral de Peças"
              unit="%"
              metaLegend="Target Pçs"
              realizadoLegend="Média Consumo Pçs"
            />
          </div>
        </div>

        {/* Coluna Esquerda - Card 3: Consumo de Cabeças - CISS e Meta */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-44 shrink-0 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-1 text-center">
              Consumo Cabeça
            </span>
            <GaugeChart value={kpis.cabecaPercent ?? 0} min={0} max={35} target={18.0} unit="%" />
            <span className="text-[10px] text-slate-400 mt-1">Meta: $\le$ 18,0%</span>
          </div>
          <div className="w-full flex-1">
            <MonthlyTrendChart
              data={cabecaChartData}
              title="Consumo de Cabeças - CISS e Meta"
              unit="%"
              metaLegend="Cabeça Target"
              realizadoLegend="Média Cab CISS"
            />
          </div>
        </div>

        {/* Coluna Direita - Card 6: Percentual de OS encerradas até 30 dias */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-44 shrink-0 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-1 text-center">
              OS $\le$ 30 Dias
            </span>
            <GaugeChart value={kpis.ordensEnc30DPercent ?? 100.0} min={80} max={100} target={100.0} unit="%" />
            <span className="text-[10px] text-slate-400 mt-1">Meta: 100%</span>
          </div>
          <div className="w-full flex-1">
            <MonthlyTrendChart
              data={oss30DChartData}
              title="Percentual de OS encerradas até 30 dias"
              unit="%"
              metaLegend="OS 30D Target"
              realizadoLegend="Média OS <30D"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
