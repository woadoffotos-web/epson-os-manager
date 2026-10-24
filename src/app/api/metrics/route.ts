import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evaluateMonthlyScore, getTierFromScore } from '@/lib/metrics-calculator';
import { MonthlyIndicatorKPIs } from '@/lib/types';
import { computeTmfDays } from '@/lib/sla-alerts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedMonth = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10); // 1-12
    const selectedYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

    // Identificar o Ano Fiscal (FY) da Epson:
    // Se o mês for Jan (1), Fev (2) ou Mar (3), o FY começou em Abril do ano anterior.
    // Se o mês for Abril (4) a Dez (12), o FY começou em Abril deste ano.
    const fiscalYear = selectedMonth >= 4 ? selectedYear : selectedYear - 1;

    // Buscar a nota anual de auditoria cadastrada para este FY
    const auditRecord = await prisma.annualAudit.findUnique({
      where: { fiscalYear },
    });
    const auditoriaScore = auditRecord?.score ?? 80.0;

    // Função interna para calcular os 7 KPIs de um mês específico
    const calculateKpisForMonth = async (mIndex: number, y: number): Promise<MonthlyIndicatorKPIs> => {
      // Início e fim do mês em UTC para precisão absoluta e independência de fuso horário
      const startOfMonth = new Date(Date.UTC(y, mIndex, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, mIndex + 1, 0, 23, 59, 59, 999));
      
      const now = new Date();
      const isCurrentActiveMonth =
        now.getFullYear() === y && now.getMonth() === mIndex;

      // Buscar ordens abertas no mês de referência (excluindo situação 'Anulada')
      const openInMonth = await prisma.workOrder.findMany({
        where: {
          entryDate: { gte: startOfMonth, lte: endOfMonth },
          situation: { isCanceled: false },
        },
        include: { model: { include: { type: true } } },
      });

      // Denominador oficial do TMF: Quantidade de O.S. abertas no mês de referência, excluindo as com situação "Anulada".
      // As ordens que vieram de meses anteriores não entram no divisor (só levam seus dias para o numerador).
      const ordensAtendidas = openInMonth.length;

      // 1. Cálculo do TMF:
      // Numerador: Soma dos dias de TMF das O.S. elegíveis no mês.
      let tmfSumDays = 0;

      // 1º Caso: Consertado no mesmo mês da entrada (Data Conserto e Data Entrada no mesmo mês/ano)
      for (const o of openInMonth) {
        if (o.repairDate && o.repairDate >= startOfMonth && o.repairDate <= endOfMonth) {
          tmfSumDays += computeTmfDays(o.entryDate, o.repairDate);
        } else if (!o.repairDate && isCurrentActiveMonth) {
          // 2º Caso: Ainda sem data de conserto, dentro do mês vigente de entrada (provisório)
          tmfSumDays += computeTmfDays(o.entryDate, null);
        }
      }

      // 3º Caso: Consertado em mês posterior ao da entrada (Ex.: entrada em Setembro, conserto em Outubro)
      // Entra no TMF do mês do conserto, calculando o tempo total decorrido desde a data de entrada.
      const repairsInMonthFromPast = await prisma.workOrder.findMany({
        where: {
          repairDate: { gte: startOfMonth, lte: endOfMonth },
          entryDate: { lt: startOfMonth },
          situation: { isCanceled: false },
        },
      });

      for (const o of repairsInMonthFromPast) {
        tmfSumDays += computeTmfDays(o.entryDate, o.repairDate);
      }

      // 2º Caso (Continuação): Ordens de meses anteriores que continuam sem conserto no mês ativo
      // "Ao virar o mês, se continuar sem conserto, não entra mais no TMF daquele mês passa a contar
      // no TMF do mês seguinte também provisóriamente até ter uma data de conserto"
      if (isCurrentActiveMonth) {
        const openFromPastStillUnrepaired = await prisma.workOrder.findMany({
          where: {
            entryDate: { lt: startOfMonth },
            repairDate: null,
            situation: { isCanceled: false },
          },
        });

        for (const o of openFromPastStillUnrepaired) {
          tmfSumDays += computeTmfDays(o.entryDate, null);
        }
      }

      // Divisão: Soma dos dias das O.S. elegíveis dividida pela quantidade de O.S. abertas no mês de referência
      const tmf = ordensAtendidas > 0 ? Number((tmfSumDays / ordensAtendidas).toFixed(2)) : 0;

      // 2. Consumo de Cabeças CISS (%) e 4. Consumo Geral de Peças (%)
      const ecotankOrdersInMonth = openInMonth.filter(
        (o) => o.model?.type?.name?.toLowerCase().includes('ecotank')
      );
      const ecotankBase = ecotankOrdersInMonth.length;

      // Buscar ordens com consumo de peças no mês:
      // Conforme regra rigorosa Epson: Só são somadas se estiverem com o campo Data de Faturamento preenchido dentro do mês!
      const partsOrdersInMonth = await prisma.workOrder.findMany({
        where: {
          partsInvoiceDate: { gte: startOfMonth, lte: endOfMonth },
          situation: { isCanceled: false },
        },
      });

      const totalCabecasFaturadas = partsOrdersInMonth.reduce((sum, o) => sum + (o.partsHeadQty || 0), 0);
      const cabecaPercent =
        ecotankBase > 0 ? Number(((totalCabecasFaturadas / ecotankBase) * 100).toFixed(2)) : 0;

      // 3. Reincidência (%)
      const reincidentesCount = openInMonth.filter((o) => o.isRecurrent).length;
      const reincidenciaPercent =
        ordensAtendidas > 0 ? Number(((reincidentesCount / ordensAtendidas) * 100).toFixed(2)) : 0;

      // 4. Consumo Geral de Peças (%)
      const totalPecasFaturadas = partsOrdersInMonth.reduce((sum, o) => sum + (o.partsTotalQty || 0), 0);
      const pecasPercent =
        ordensAtendidas > 0 ? Number(((totalPecasFaturadas / ordensAtendidas) * 100).toFixed(2)) : 0;

      // 5. Ordens Encerradas até 30 Dias (%)
      const closedInMonth = await prisma.workOrder.findMany({
        where: {
          systemExitDate: { gte: startOfMonth, lte: endOfMonth },
          situation: { isCanceled: false },
        },
      });

      const closedWithin30D = closedInMonth.filter((o) => {
        const diffDays = Math.round(
          (o.systemExitDate!.getTime() - o.entryDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays <= 30;
      });

      const ordensEnc30DPercent =
        closedInMonth.length > 0
          ? Number(((closedWithin30D.length / closedInMonth.length) * 100).toFixed(2))
          : 100.0; // Se não houver ordens encerradas, SLA permanece 100%

      // Quanto de cabeça pode pedir sem perder ponto no indicador (Meta <= 18%)
      const maxCabecas5Pts = 0.18 * ecotankBase;
      const saldoCabecasPedir = Number((maxCabecas5Pts - totalCabecasFaturadas).toFixed(2));

      // Quanto de peças totais pode pedir sem perder ponto no indicador (Meta <= 95%)
      const maxPecas5Pts = 0.95 * ordensAtendidas;
      const saldoPecasPedir = Number((maxPecas5Pts - totalPecasFaturadas).toFixed(2));

      return {
        ordensAtendidas,
        tmf,
        cabecaPercent,
        reincidenciaPercent,
        pecasPercent,
        ordensEnc30DPercent,
        auditoriaScore,
        saldoCabecasPedir,
        saldoPecasPedir,
      };
    }

    // Calcular KPIs do Mês Selecionado
    const currentKpis = await calculateKpisForMonth(selectedMonth - 1, selectedYear);
    const weightEvaluation = evaluateMonthlyScore(currentKpis);

    // Calcular Linha do Tempo do Ano Fiscal Epson (Abril a Março)
    const monthNames = [
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
      'janeiro',
      'fevereiro',
      'março',
    ];

    const monthlyTimeline: any[] = [];
    let annualScoresSum = 0;
    let evaluatedMonthsCount = 0;
    let annualOrdersSum = 0;

    for (let i = 0; i < 12; i++) {
      // Meses de 0 a 8 são Abril a Dezembro do fiscalYear
      // Meses de 9 a 11 são Janeiro a Março do fiscalYear + 1
      const calMonth = (i + 3) % 12; // 3 = Abril, 4 = Maio, ..., 0 = Jan, 1 = Fev, 2 = Mar
      const calYear = i < 9 ? fiscalYear : fiscalYear + 1;

      const mKpis = await calculateKpisForMonth(calMonth, calYear);
      const mEval = evaluateMonthlyScore(mKpis);

      annualOrdersSum += mKpis.ordensAtendidas;

      // Se há ordens atendidas ou é o mês selecionado ou meses passados do FY
      const isPastOrCurrent =
        calYear < selectedYear || (calYear === selectedYear && calMonth <= selectedMonth - 1);

      if (isPastOrCurrent && mKpis.ordensAtendidas > 0) {
        annualScoresSum += mEval.totalScore;
        evaluatedMonthsCount++;
      }

      monthlyTimeline.push({
        index: i,
        monthName: monthNames[i],
        calMonth: calMonth + 1,
        calYear,
        kpis: mKpis,
        score: mKpis.ordensAtendidas > 0 ? mEval.totalScore : 0,
        tier: mKpis.ordensAtendidas > 0 ? mEval.tier : '-',
      });
    }

    // Nota Class Anual (Média dos meses com ordens avaliadas no FY)
    const notaClassAnual =
      evaluatedMonthsCount > 0
        ? Number((annualScoresSum / evaluatedMonthsCount).toFixed(2))
        : weightEvaluation.totalScore;
    const classAnual = getTierFromScore(notaClassAnual);

    // TMPP Médio (Tempo Médio de Pedido de Peça em dias)
    const ordersWithPartsOrder = await prisma.workOrder.findMany({
      where: {
        partsOrderDate: { not: null },
        situation: { isCanceled: false },
      },
    });

    let tmppSum = 0;
    let tmppCount = 0;
    for (const po of ordersWithPartsOrder) {
      if (po.partsOrderDate && po.entryDate) {
        const diff = Math.max(
          0,
          Math.round((po.partsOrderDate.getTime() - po.entryDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        tmppSum += diff;
        tmppCount++;
      }
    }
    const tmpp = tmppCount > 0 ? Number((tmppSum / tmppCount).toFixed(1)) : 0.0;

    // Percentual de Cursos Obrigatórios Cobertos pela Empresa
    const mandatoryCourses = await prisma.course.findMany({
      where: { isMandatory: true },
      include: { technicianCourses: { where: { completed: true } } },
    });

    const totalMandatory = mandatoryCourses.length;
    const coveredCourses = mandatoryCourses.filter((c) => c.technicianCourses.length > 0).length;
    const coursesPercent =
      totalMandatory > 0 ? Math.round((coveredCourses / totalMandatory) * 100) : 100;

    return NextResponse.json({
      selectedMonth,
      selectedYear,
      fiscalYear,
      kpis: currentKpis,
      evaluation: weightEvaluation,
      notaClassMensal: weightEvaluation.totalScore,
      classMensal: weightEvaluation.tier,
      saldoCabecasPedir: currentKpis.saldoCabecasPedir,
      saldoPecasPedir: currentKpis.saldoPecasPedir,
      notaClassAnual,
      classAnual,
      annualTotalOrders: annualOrdersSum,
      coursesPercent,
      tmpp,
      monthlyTimeline,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao calcular métricas' }, { status: 500 });
  }
}
