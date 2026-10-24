export type TierLevel = 'BASIC' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface MonthlyIndicatorKPIs {
  ordensAtendidas: number;
  tmf: number;
  cabecaPercent: number;
  reincidenciaPercent: number;
  pecasPercent: number;
  ordensEnc30DPercent: number;
  auditoriaScore: number;
  saldoCabecasPedir?: number;
  saldoPecasPedir?: number;
}

export interface MetricWeightBreakdown {
  tmfWeight: number;
  reincidenciaWeight: number;
  cabecaWeight: number;
  pecasWeight: number;
  auditoriaWeight: number;
  ordens30DWeight: number;
  totalScore: number;
  tier: TierLevel;
}

export interface AnnualPerformance {
  fiscalYear: number;
  averageScore: number;
  annualTier: TierLevel;
  totalOrders: number;
  coursesCompletionRate: number;
  monthlyHistory: {
    monthIndex: number;
    monthName: string;
    kpis: MonthlyIndicatorKPIs;
    score: number;
    tier: TierLevel;
  }[];
}
