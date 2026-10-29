import { prisma } from '@/lib/prisma';
import { fetchGestaoApi } from '@/lib/gestao';

export interface ContratoGestaoItem {
  contratoGestaoId: string;
  codigoContrato: string;
  clienteId: string | null;
  nomeCliente: string;
  modeloEquipamento: string;
  numeroSerie: string | null;
  franquia: number;
  valorPorPagina: number;
  valorTotalContrato: number;
  situacao: string;
  dataInicio: string | null;
  proximoVencimento: string | null;
  diaVencimento: string | null;
  periodicidade: string | null;
  observacoes: string | null;
  servicoIdGestao: string | null;
  servicoCatalogoId: string | null;
}

/**
 * Regra de cálculo de faturamento da leitura:
 * - Subtrai contador atual pelo contador inicial -> consumo
 * - Se consumo > franquia -> consumo * valorPorPagina
 * - Se consumo <= franquia -> franquia * valorPorPagina (valor mínimo garantido da franquia)
 */
export function calcularFaturamentoLeitura(
  contadorInicial: number,
  contadorAtual: number,
  franquia: number,
  valorPorPagina: number
) {
  const cIni = Number(contadorInicial) || 0;
  const cAtu = Number(contadorAtual) || 0;
  const fran = Number(franquia) || 0;
  const vrPag = Number(valorPorPagina) || 0;

  const consumo = Math.max(0, cAtu - cIni);
  const paginasFaturadas = consumo > fran ? consumo : fran;
  const valorTotal = paginasFaturadas * vrPag;

  return {
    consumo,
    paginasFaturadas,
    valorTotal: parseFloat(valorTotal.toFixed(2)),
  };
}

/**
 * Busca todos os contratos ativos no Gestão Click via API
 */
export async function buscarContratosAtivosGestao(): Promise<ContratoGestaoItem[]> {
  try {
    const p1 = await fetchGestaoApi('/contratos?limite=100&pagina=1');
    if (!p1.ok || !p1.data?.data) {
      console.warn('[Outsourcing] Não foi possível consultar /contratos no Gestão Click:', p1);
      return [];
    }

    let allContracts: any[] = p1.data.data;
    const totalPaginas = p1.data.meta?.total_paginas || 1;

    if (totalPaginas > 1) {
      const promises = [];
      for (let p = 2; p <= totalPaginas; p++) {
        promises.push(fetchGestaoApi(`/contratos?limite=100&pagina=${p}`));
      }
      const results = await Promise.all(promises);
      for (const r of results) {
        if (r.ok && r.data?.data) {
          allContracts = allContracts.concat(r.data.data);
        }
      }
    }

    // Filtra contratos com situação "Ativo"
    const ativos = allContracts.filter(
      (c) => c.nome_situacao && c.nome_situacao.toLowerCase().trim() === 'ativo'
    );

    return ativos.map((c) => {
      // Localiza o serviço de locação/outsourcing
      let servicoObj: any = null;
      if (Array.isArray(c.servicos) && c.servicos.length > 0) {
        // Tenta achar o que tem "Outsourcing" no nome ou pega o primeiro
        const found = c.servicos.find(
          (s: any) => s.servico?.nome_servico?.toLowerCase().includes('outsourcing')
        );
        servicoObj = found?.servico || c.servicos[0]?.servico;
      }

      // Tenta extrair número de série das observações se existir (ex: S/N: 35C77837)
      let numSerie: string | null = null;
      if (c.observacoes) {
        const match = c.observacoes.match(/S\/N[:\s]*([A-Z0-9]+)/i);
        if (match) numSerie = match[1];
      }

      const modelo = servicoObj?.detalhes || '';
      const franquia = parseFloat(servicoObj?.quantidade) || 0;
      const valorPorPagina = parseFloat(servicoObj?.valor_venda) || 0;
      const valorTotal = parseFloat(c.valor_total) || (franquia * valorPorPagina);

      return {
        contratoGestaoId: String(c.id),
        codigoContrato: String(c.codigo || c.id),
        clienteId: c.cliente_id ? String(c.cliente_id) : null,
        nomeCliente: c.nome_cliente || 'Cliente Sem Nome',
        modeloEquipamento: modelo,
        numeroSerie: numSerie,
        franquia,
        valorPorPagina,
        valorTotalContrato: valorTotal,
        situacao: c.nome_situacao || 'Ativo',
        dataInicio: c.data || null,
        proximoVencimento: c.proximo_vencimento || null,
        diaVencimento: c.dia_vencimento || null,
        periodicidade: c.periodicidade || '1 month',
        observacoes: c.observacoes || null,
        servicoIdGestao: servicoObj?.id ? String(servicoObj.id) : null,
        servicoCatalogoId: servicoObj?.servico_id ? String(servicoObj.servico_id) : null,
      };
    });
  } catch (error) {
    console.error('[Outsourcing] Erro ao buscar contratos ativos no Gestão Click:', error);
    return [];
  }
}

/**
 * Atualiza ou insere locações ativas vindas do Gestão Click no banco de dados
 */
export async function sincronizarLocacoesComGestao() {
  const contratosAtivos = await buscarContratosAtivosGestao();
  let novosCount = 0;
  let atualizadosCount = 0;

  for (const c of contratosAtivos) {
    const existing = await prisma.outsourcingLocacao.findUnique({
      where: { contratoGestaoId: c.contratoGestaoId },
    });

    if (!existing) {
      await prisma.outsourcingLocacao.create({
        data: {
          contratoGestaoId: c.contratoGestaoId,
          codigoContrato: c.codigoContrato,
          clienteId: c.clienteId,
          nomeCliente: c.nomeCliente,
          modeloEquipamento: c.modeloEquipamento,
          numeroSerie: c.numeroSerie,
          franquia: c.franquia,
          valorPorPagina: c.valorPorPagina,
          valorTotalContrato: c.valorTotalContrato,
          situacao: c.situacao,
          dataInicio: c.dataInicio ? new Date(c.dataInicio) : null,
          proximoVencimento: c.proximoVencimento,
          diaVencimento: c.diaVencimento,
          periodicidade: c.periodicidade,
          observacoes: c.observacoes,
          servicoIdGestao: c.servicoIdGestao,
          servicoCatalogoId: c.servicoCatalogoId,
        },
      });
      novosCount++;
    } else {
      // Atualiza dados contratuais respeitando customizações já salvas
      await prisma.outsourcingLocacao.update({
        where: { id: existing.id },
        data: {
          codigoContrato: c.codigoContrato,
          nomeCliente: c.nomeCliente,
          situacao: c.situacao,
          proximoVencimento: c.proximoVencimento,
          diaVencimento: c.diaVencimento,
          periodicidade: c.periodicidade,
          valorTotalContrato: c.valorTotalContrato,
          servicoIdGestao: c.servicoIdGestao || existing.servicoIdGestao,
          servicoCatalogoId: c.servicoCatalogoId || existing.servicoCatalogoId,
          // Se o modelo local estiver vazio e o gestão tiver valor, preenche
          modeloEquipamento: existing.modeloEquipamento || c.modeloEquipamento,
          franquia: existing.franquia > 0 ? existing.franquia : c.franquia,
          valorPorPagina: existing.valorPorPagina > 0 ? existing.valorPorPagina : c.valorPorPagina,
        },
      });
      atualizadosCount++;
    }
  }

  // Retorna todas as locações atualizadas com suas últimas leituras
  const todasLocacoes = await prisma.outsourcingLocacao.findMany({
    orderBy: { nomeCliente: 'asc' },
    include: {
      leituras: {
        orderBy: { dataLeitura: 'desc' },
        take: 12,
      },
      substituicoes: {
        orderBy: { dataSubstituicao: 'desc' },
      },
    },
  });

  return {
    totalGestaoAtivos: contratosAtivos.length,
    novosInseridos: novosCount,
    atualizados: atualizadosCount,
    locacoes: todasLocacoes,
  };
}

/**
 * Atualiza contrato no Gestão Click via PUT /contratos/{id}
 */
export async function sincronizarContratoComGestaoApi(
  contratoGestaoId: string,
  dados: {
    modeloEquipamento: string;
    franquia: number;
    valorPorPagina: number;
    observacoes?: string;
  }
) {
  try {
    // 1. Busca os dados atuais do contrato no Gestão Click para preservar os nós obrigatórios
    const getRes = await fetchGestaoApi(`/contratos/${contratoGestaoId}`);
    if (!getRes.ok || !getRes.data?.data) {
      return { success: false, error: 'Contrato não encontrado no Gestão Click' };
    }

    const current = getRes.data.data;

    // 2. Monta o payload de serviços atualizado
    let servicosPayload: any[] = [];
    if (Array.isArray(current.servicos) && current.servicos.length > 0) {
      servicosPayload = current.servicos.map((s: any, idx: number) => {
        const item = s.servico;
        // Se for o primeiro serviço ou o de Outsourcing, atualiza detalhes, quantidade e valor
        if (idx === 0 || item.nome_servico?.toLowerCase().includes('outsourcing')) {
          return {
            servico: {
              servico_id: item.servico_id,
              detalhes: dados.modeloEquipamento,
              quantidade: dados.franquia.toFixed(2),
              valor_venda: dados.valorPorPagina.toFixed(2),
            },
          };
        }
        return {
          servico: {
            servico_id: item.servico_id,
            detalhes: item.detalhes || '',
            quantidade: item.quantidade,
            valor_venda: item.valor_venda,
          },
        };
      });
    } else {
      // Fallback
      servicosPayload = [
        {
          servico: {
            servico_id: '7871188', // ID de Outsourcing de impressão no catálogo
            detalhes: dados.modeloEquipamento,
            quantidade: dados.franquia.toFixed(2),
            valor_venda: dados.valorPorPagina.toFixed(2),
          },
        },
      ];
    }

    const payload = {
      cliente_id: current.cliente_id,
      data: current.data,
      proximo_vencimento: current.proximo_vencimento,
      periodicidade: current.periodicidade,
      situacao_id: current.situacao_id,
      observacoes: dados.observacoes !== undefined ? dados.observacoes : current.observacoes,
      servicos: servicosPayload,
    };

    const putRes = await fetchGestaoApi(`/contratos/${contratoGestaoId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (putRes.ok && putRes.data?.status === 'success') {
      return { success: true, data: putRes.data.data };
    } else {
      console.warn('[GestãoClick PUT Erro]:', putRes);
      return {
        success: false,
        error: putRes.data?.message || 'Erro ao atualizar contrato no Gestão Click',
      };
    }
  } catch (err: any) {
    console.error('[GestãoClick Sincronização Erro]:', err);
    return { success: false, error: err.message || 'Falha de comunicação com Gestão Click' };
  }
}
