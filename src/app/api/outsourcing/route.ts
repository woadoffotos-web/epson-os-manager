import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sincronizarLocacoesComGestao,
  sincronizarContratoComGestaoApi,
  calcularFaturamentoLeitura,
} from '@/lib/outsourcing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'locacoes';

    if (action === 'locacoes') {
      const locacoes = await prisma.outsourcingLocacao.findMany({
        orderBy: { nomeCliente: 'asc' },
        include: {
          leituras: {
            orderBy: { dataLeitura: 'desc' },
          },
          substituicoes: {
            orderBy: { dataSubstituicao: 'desc' },
          },
        },
      });

      // Cálculo de métricas para o Dashboard
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const ativas = locacoes.filter((l) => l.situacao.toLowerCase() === 'ativo');
      const totalFranquiaPaginas = ativas.reduce((acc, l) => acc + (l.franquia || 0), 0);
      
      // MRR previsto (soma do valor mínimo garantido das franquias)
      const mrrEstimado = ativas.reduce(
        (acc, l) => acc + (l.franquia > 0 && l.valorPorPagina > 0 ? l.franquia * l.valorPorPagina : l.valorTotalContrato || 0),
        0
      );

      // Quantas já colheram leitura no mês atual
      let leiturasMesAtualCount = 0;
      ativas.forEach((l) => {
        const hasLeituraCurrentMonth = l.leituras.some((leit) => {
          const d = new Date(leit.dataLeitura);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
        if (hasLeituraCurrentMonth) leiturasMesAtualCount++;
      });

      const leiturasPendentesMes = ativas.length - leiturasMesAtualCount;

      return NextResponse.json({
        locacoes,
        dashboard: {
          totalLocacoes: locacoes.length,
          totalAtivas: ativas.length,
          totalFranquiaPaginas,
          mrrEstimado: parseFloat(mrrEstimado.toFixed(2)),
          leiturasMesAtualCount,
          leiturasPendentesMes: Math.max(0, leiturasPendentesMes),
        },
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na API de Outsourcing (GET):', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json().catch(() => ({}));

    // ================================================================
    // AÇÃO 1: SINCRONIZAR LOCAÇÕES COM GESTÃO CLICK
    // ================================================================
    if (action === 'sincronizar') {
      const syncResult = await sincronizarLocacoesComGestao();
      return NextResponse.json({
        success: true,
        message: `Sincronização concluída com o Gestão Click! ${syncResult.novosInseridos} novos contratos cadastrados e ${syncResult.atualizados} atualizados.`,
        ...syncResult,
      });
    }

    // ================================================================
    // AÇÃO 2: ATUALIZAR LEITURA RÁPIDA (Linha da Tabela)
    // ================================================================
    if (action === 'atualizar_leitura_rapida') {
      const { locacaoId, contadorAtual, dataLeitura, criadoPor } = body;

      if (!locacaoId) {
        return NextResponse.json({ error: 'locacaoId é obrigatório' }, { status: 400 });
      }
      if (contadorAtual === undefined || contadorAtual === null || isNaN(Number(contadorAtual))) {
        return NextResponse.json({ error: 'Informe um valor numérico válido para o Contador.' }, { status: 400 });
      }

      const locacao = await prisma.outsourcingLocacao.findUnique({
        where: { id: locacaoId },
        include: {
          leituras: {
            orderBy: { dataLeitura: 'desc' },
            take: 1,
          },
        },
      });

      if (!locacao) {
        return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 });
      }

      const numContadorAtual = parseInt(String(contadorAtual), 10);
      
      // O contador inicial é a última leitura registrada, ou o próprio contador atual se for a primeira
      const ultimaLeitura = locacao.leituras[0];
      const contadorInicial = ultimaLeitura ? ultimaLeitura.contadorAtual : (locacao.contadorAtual || 0);

      const faturamento = calcularFaturamentoLeitura(
        contadorInicial,
        numContadorAtual,
        locacao.franquia,
        locacao.valorPorPagina
      );

      const dataObj = dataLeitura ? new Date(dataLeitura) : new Date();

      const novaLeitura = await prisma.outsourcingLeitura.create({
        data: {
          locacaoId,
          dataLeitura: dataObj,
          contadorInicial,
          contadorAtual: numContadorAtual,
          consumo: faturamento.consumo,
          franquia: locacao.franquia,
          valorPorPagina: locacao.valorPorPagina,
          valorTotal: faturamento.valorTotal,
          equipamentoInfo: locacao.modeloEquipamento + (locacao.numeroSerie ? ` (S/N: ${locacao.numeroSerie})` : ''),
          criadoPor: criadoPor || 'Colaborador',
        },
      });

      // Atualiza o contador atual e data da última leitura na locação
      const locacaoAtualizada = await prisma.outsourcingLocacao.update({
        where: { id: locacaoId },
        data: {
          contadorAtual: numContadorAtual,
          dataUltimaLeitura: dataObj,
        },
        include: {
          leituras: {
            orderBy: { dataLeitura: 'desc' },
          },
          substituicoes: {
            orderBy: { dataSubstituicao: 'desc' },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Leitura gravada com sucesso! Consumo: ${faturamento.consumo} págs. Valor apurado: R$ ${faturamento.valorTotal.toFixed(2)}`,
        leitura: novaLeitura,
        locacao: locacaoAtualizada,
      });
    }

    // ================================================================
    // AÇÃO 3: INSERIR CONTADORES ANTERIORES / HISTÓRICO MANUAL
    // ================================================================
    if (action === 'inserir_leitura_manual') {
      const { locacaoId, contadorInicial, contadorAtual, dataLeitura, observacoes, criadoPor } = body;

      if (!locacaoId) {
        return NextResponse.json({ error: 'locacaoId é obrigatório' }, { status: 400 });
      }
      if (contadorInicial === undefined || contadorAtual === undefined) {
        return NextResponse.json({ error: 'Contador inicial e atual são obrigatórios' }, { status: 400 });
      }
      if (!dataLeitura) {
        return NextResponse.json({ error: 'Data da leitura é obrigatória' }, { status: 400 });
      }

      const locacao = await prisma.outsourcingLocacao.findUnique({
        where: { id: locacaoId },
      });

      if (!locacao) {
        return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 });
      }

      const cIni = parseInt(String(contadorInicial), 10);
      const cAtu = parseInt(String(contadorAtual), 10);

      const faturamento = calcularFaturamentoLeitura(
        cIni,
        cAtu,
        locacao.franquia,
        locacao.valorPorPagina
      );

      const dataObj = new Date(dataLeitura);

      const leitura = await prisma.outsourcingLeitura.create({
        data: {
          locacaoId,
          dataLeitura: dataObj,
          contadorInicial: cIni,
          contadorAtual: cAtu,
          consumo: faturamento.consumo,
          franquia: locacao.franquia,
          valorPorPagina: locacao.valorPorPagina,
          valorTotal: faturamento.valorTotal,
          observacoes,
          equipamentoInfo: locacao.modeloEquipamento + (locacao.numeroSerie ? ` (S/N: ${locacao.numeroSerie})` : ''),
          criadoPor: criadoPor || 'Colaborador',
        },
      });

      // Se essa leitura tiver a data mais recente, atualiza o contador atual da locação
      if (!locacao.dataUltimaLeitura || dataObj >= new Date(locacao.dataUltimaLeitura)) {
        await prisma.outsourcingLocacao.update({
          where: { id: locacaoId },
          data: {
            contadorAtual: cAtu,
            dataUltimaLeitura: dataObj,
          },
        });
      }

      const locacaoAtualizada = await prisma.outsourcingLocacao.findUnique({
        where: { id: locacaoId },
        include: {
          leituras: { orderBy: { dataLeitura: 'desc' } },
          substituicoes: { orderBy: { dataSubstituicao: 'desc' } },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Leitura histórica inserida com sucesso!',
        leitura,
        locacao: locacaoAtualizada,
      });
    }

    // ================================================================
    // AÇÃO 4: SUBSTITUIR EQUIPAMENTO NA LOCAÇÃO
    // ================================================================
    if (action === 'substituir_equipamento') {
      const {
        locacaoId,
        modeloNovo,
        numeroSerieNovo,
        contadorInicialNovo,
        contadorFinalAnterior,
        motivo,
        criadoPor,
        sincronizarGestao,
      } = body;

      if (!locacaoId || !modeloNovo) {
        return NextResponse.json({ error: 'Locação e Novo Modelo são obrigatórios' }, { status: 400 });
      }

      const locacao = await prisma.outsourcingLocacao.findUnique({
        where: { id: locacaoId },
      });

      if (!locacao) {
        return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 });
      }

      const cFimAnt = parseInt(String(contadorFinalAnterior || locacao.contadorAtual || 0), 10);
      const cIniNovo = parseInt(String(contadorInicialNovo || 0), 10);

      // Registra a substituição no histórico
      const substituicao = await prisma.outsourcingSubstituicao.create({
        data: {
          locacaoId,
          dataSubstituicao: new Date(),
          modeloAnterior: locacao.modeloEquipamento,
          numeroSerieAnterior: locacao.numeroSerie,
          contadorFinalAnterior: cFimAnt,
          modeloNovo,
          numeroSerieNovo,
          contadorInicialNovo: cIniNovo,
          motivo,
          criadoPor: criadoPor || 'Colaborador',
        },
      });

      // Atualiza a locação com o novo equipamento e o novo contador inicial
      const locacaoAtualizada = await prisma.outsourcingLocacao.update({
        where: { id: locacaoId },
        data: {
          modeloEquipamento: modeloNovo,
          numeroSerie: numeroSerieNovo || null,
          contadorAtual: cIniNovo,
          dataUltimaLeitura: new Date(),
        },
        include: {
          leituras: { orderBy: { dataLeitura: 'desc' } },
          substituicoes: { orderBy: { dataSubstituicao: 'desc' } },
        },
      });

      // Opcionalmente atualiza o Gestão Click
      if (sincronizarGestao) {
        await sincronizarContratoComGestaoApi(locacao.contratoGestaoId, {
          modeloEquipamento: modeloNovo,
          franquia: locacao.franquia,
          valorPorPagina: locacao.valorPorPagina,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Equipamento substituído com sucesso por "${modeloNovo}"! Contador inicial reiniciado para ${cIniNovo}.`,
        substituicao,
        locacao: locacaoAtualizada,
      });
    }

    return NextResponse.json({ error: 'Ação POST não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na API de Outsourcing (POST):', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json().catch(() => ({}));

    // ================================================================
    // AÇÃO 5: EDITAR LEITURA EXISTENTE
    // ================================================================
    if (action === 'editar_leitura') {
      const { leituraId, contadorInicial, contadorAtual, dataLeitura, observacoes } = body;

      if (!leituraId) {
        return NextResponse.json({ error: 'leituraId é obrigatório' }, { status: 400 });
      }

      const leituraExistente = await prisma.outsourcingLeitura.findUnique({
        where: { id: leituraId },
        include: { locacao: true },
      });

      if (!leituraExistente) {
        return NextResponse.json({ error: 'Leitura não encontrada' }, { status: 404 });
      }

      const cIni = parseInt(String(contadorInicial), 10);
      const cAtu = parseInt(String(contadorAtual), 10);
      const loc = leituraExistente.locacao;

      const faturamento = calcularFaturamentoLeitura(
        cIni,
        cAtu,
        loc.franquia,
        loc.valorPorPagina
      );

      const leituraAtualizada = await prisma.outsourcingLeitura.update({
        where: { id: leituraId },
        data: {
          contadorInicial: cIni,
          contadorAtual: cAtu,
          consumo: faturamento.consumo,
          valorTotal: faturamento.valorTotal,
          dataLeitura: dataLeitura ? new Date(dataLeitura) : leituraExistente.dataLeitura,
          observacoes: observacoes !== undefined ? observacoes : leituraExistente.observacoes,
        },
      });

      // Recarrega a locação com todas as leituras
      const locacaoAtualizada = await prisma.outsourcingLocacao.findUnique({
        where: { id: loc.id },
        include: {
          leituras: { orderBy: { dataLeitura: 'desc' } },
          substituicoes: { orderBy: { dataSubstituicao: 'desc' } },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Leitura atualizada com sucesso!',
        leitura: leituraAtualizada,
        locacao: locacaoAtualizada,
      });
    }

    // ================================================================
    // AÇÃO 6: EDITAR DADOS DA LOCAÇÃO & SINCRONIZAR COM GESTÃO CLICK
    // ================================================================
    if (action === 'editar_locacao') {
      const { locacaoId, modeloEquipamento, franquia, valorPorPagina, numeroSerie, sincronizarGestao } = body;

      if (!locacaoId) {
        return NextResponse.json({ error: 'locacaoId é obrigatório' }, { status: 400 });
      }

      const numFranquia = parseFloat(String(franquia)) || 0;
      const numVrPagina = parseFloat(String(valorPorPagina)) || 0;

      const locacaoAtualizada = await prisma.outsourcingLocacao.update({
        where: { id: locacaoId },
        data: {
          modeloEquipamento: modeloEquipamento || '',
          franquia: numFranquia,
          valorPorPagina: numVrPagina,
          numeroSerie: numeroSerie || null,
        },
        include: {
          leituras: { orderBy: { dataLeitura: 'desc' } },
          substituicoes: { orderBy: { dataSubstituicao: 'desc' } },
        },
      });

      let gestaoSyncMsg = '';
      if (sincronizarGestao) {
        const syncGestao = await sincronizarContratoComGestaoApi(locacaoAtualizada.contratoGestaoId, {
          modeloEquipamento: modeloEquipamento || '',
          franquia: numFranquia,
          valorPorPagina: numVrPagina,
        });

        if (syncGestao.success) {
          gestaoSyncMsg = ' e sincronizado com o Gestão Click com sucesso!';
        } else {
          gestaoSyncMsg = ` (Atenção: falha ao atualizar no Gestão Click: ${syncGestao.error})`;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Locação atualizada${gestaoSyncMsg}`,
        locacao: locacaoAtualizada,
      });
    }

    return NextResponse.json({ error: 'Ação PUT não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na API de Outsourcing (PUT):', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const leituraId = searchParams.get('leituraId');

    if (action === 'excluir_leitura' || leituraId) {
      if (!leituraId) {
        return NextResponse.json({ error: 'leituraId é obrigatório' }, { status: 400 });
      }

      const leitura = await prisma.outsourcingLeitura.findUnique({
        where: { id: leituraId },
      });

      if (!leitura) {
        return NextResponse.json({ error: 'Leitura não encontrada' }, { status: 404 });
      }

      const locacaoId = leitura.locacaoId;
      await prisma.outsourcingLeitura.delete({ where: { id: leituraId } });

      // Recarrega a locação com as leituras restantes para redefinir o contador atual
      const locacaoAtualizada = await prisma.outsourcingLocacao.findUnique({
        where: { id: locacaoId },
        include: {
          leituras: { orderBy: { dataLeitura: 'desc' } },
          substituicoes: { orderBy: { dataSubstituicao: 'desc' } },
        },
      });

      if (locacaoAtualizada) {
        const maisRecente = locacaoAtualizada.leituras[0];
        await prisma.outsourcingLocacao.update({
          where: { id: locacaoId },
          data: {
            contadorAtual: maisRecente ? maisRecente.contadorAtual : null,
            dataUltimaLeitura: maisRecente ? maisRecente.dataLeitura : null,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Leitura excluída com sucesso!',
        locacao: locacaoAtualizada,
      });
    }

    return NextResponse.json({ error: 'Ação DELETE não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na API de Outsourcing (DELETE):', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir' }, { status: 500 });
  }
}
