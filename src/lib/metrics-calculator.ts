import { MetricWeightBreakdown, MonthlyIndicatorKPIs, TierLevel } from './types';

export function calculateTmfWeight(tmf: number): number {
  if (tmf <= 0) return 5.0; // Se não houver demoras
  if (tmf <= 8.0) return 5.0;
  if (tmf <= 9.0) return 4.0;
  if (tmf <= 10.0) return 3.0;
  if (tmf <= 11.01) return 2.0;
  if (tmf <= 12.0) return 1.0;
  return 0.0;
}

export function calculateReincidenciaWeight(percent: number): number {
  if (percent <= 5.0) return 5.0;
  if (percent <= 7.0) return 4.0;
  if (percent <= 9.0) return 3.0;
  if (percent <= 10.0) return 2.0;
  if (percent <= 12.0) return 1.0;
  return 0.0;
}

export function calculateCabecaWeight(percent: number): number {
  if (percent <= 18.0) return 5.0;
  if (percent <= 19.0) return 4.0;
  if (percent <= 20.0) return 3.0;
  if (percent <= 25.0) return 2.0;
  if (percent <= 30.0) return 1.0;
  return 0.0;
}

export function calculatePecasWeight(percent: number): number {
  if (percent <= 95.0) return 5.0;
  if (percent <= 105.0) return 4.0;
  if (percent <= 115.0) return 3.0;
  if (percent <= 125.0) return 2.0;
  if (percent <= 135.0) return 1.0;
  return 0.0;
}

export function calculateAuditoriaWeight(score: number): number {
  if (score >= 95.01) return 5.0;
  if (score >= 80.01) return 4.0;
  if (score >= 70.01) return 3.0;
  if (score >= 60.01) return 2.0;
  if (score >= 1.0) return 1.0;
  return 0.0;
}

export function calculateOS30DWeight(percent: number): number {
  if (percent >= 99.0) return 5.0;
  if (percent >= 98.0) return 4.0;
  if (percent >= 97.0) return 3.0;
  if (percent >= 96.0) return 2.0;
  if (percent >= 95.0) return 1.0;
  return 0.0;
}

export function getTierFromScore(score: number): TierLevel {
  if (score >= 28.01) return 'PLATINUM';
  if (score >= 26.0) return 'GOLD';
  if (score >= 20.0) return 'SILVER';
  return 'BASIC';
}

export function evaluateMonthlyScore(kpis: MonthlyIndicatorKPIs): MetricWeightBreakdown {
  const tmfWeight = calculateTmfWeight(kpis.tmf);
  const reincidenciaWeight = calculateReincidenciaWeight(kpis.reincidenciaPercent);
  const cabecaWeight = calculateCabecaWeight(kpis.cabecaPercent);
  const pecasWeight = calculatePecasWeight(kpis.pecasPercent);
  const auditoriaWeight = calculateAuditoriaWeight(kpis.auditoriaScore);
  const ordens30DWeight = calculateOS30DWeight(kpis.ordensEnc30DPercent);

  const totalScore = Number(
    (
      tmfWeight +
      reincidenciaWeight +
      cabecaWeight +
      pecasWeight +
      auditoriaWeight +
      ordens30DWeight
    ).toFixed(2)
  );

  const tier = getTierFromScore(totalScore);

  return {
    tmfWeight,
    reincidenciaWeight,
    cabecaWeight,
    pecasWeight,
    auditoriaWeight,
    ordens30DWeight,
    totalScore,
    tier,
  };
}
