import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getGruposProdutos,
  getFornecedores,
  getVendasPeriodo,
  getPurchasesProductIndex,
  getProdutosGestao,
} from '@/lib/gestao';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'ultimas_vendas';

    // ================================================================
    // AÇÃO 1: CONFIG (Grupos e Fornecedores para os filtros de busca)
    // ================================================================
    if (action === 'config') {
      const [grupos, fornecedores] = await Promise.all([
        getGruposProdutos(),
        getFornecedores(),
      ]);

      const now = new Date();
      const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const defaultDataInicio = firstDay.toISOString().split('T')[0];
      const defaultDataFim = now.toISOString().split('T')[0];

      return NextResponse.json({
        grupos,
        fornecedores,
        defaultDataInicio,
        defaultDataFim,
      });
    }

    // ================================================================
    // AÇÃO 2: ÚLTIMAS VENDAS (Menu 1 - Tela Principal)
    // ================================================================
    if (action === 'ultimas_vendas') {
      const now = new Date();
      const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const defaultDataInicio = firstDay.toISOString().split('T')[0];
      const defaultDataFim = now.toISOString().split('T')[0];

      const dataInicio = searchParams.get('data_inicio') || defaultDataInicio;
      const dataFim = searchParams.get('data_fim') || defaultDataFim;
      const filtroCodigo = (searchParams.get('codigo') || '').trim().toLowerCase();
      const filtroNome = (searchParams.get('nome') || '').trim().toLowerCase();
      const filtroFornecedor = (searchParams.get('fornecedor') || '').trim().toLowerCase();
      const filtroGrupo = (searchParams.get('grupo_id') || '').trim();

      // 1. Buscar vendas e indexar compras para obter fornecedores
      const [vendas, purchasesMap, prodResult] = await Promise.all([
        getVendasPeriodo(dataInicio, dataFim),
        getPurchasesProductIndex(),
        getProdutosGestao(100, 1),
      ]);

      // Mapear produtos base por ID para enriquecer código, grupo etc.
      const productLookup = new Map<string, any>();
      for (const p of prodResult.produtos) {
        productLookup.set(String(p.id), p);
      }

      // 2. Consolidar quantidade vendida por produto no período
      const salesMap = new Map<string, {
        produtoId: string;
        codigo: string;
        nome: string;
        grupoId: string;
        nomeGrupo: string;
        fornecedores: string[];
        quantidadeVendida: number;
      }>();

      for (const venda of vendas) {
        if (!Array.isArray(venda.produtos)) continue;

        for (const item of venda.produtos) {
          const p = item.produto || item;
          const pId = String(p.produto_id || p.id);
          if (!pId) continue;

          const qtd = parseFloat(p.quantidade) || 0;
          const prodBase = productLookup.get(pId);
          const purchaseInfo = purchasesMap.get(pId);

          const existing = salesMap.get(pId);
          if (!existing) {
            const suppliers = purchaseInfo?.fornecedores?.length
              ? purchaseInfo.fornecedores
              : [];

            salesMap.set(pId, {
              produtoId: pId,
              codigo: prodBase?.codigo_interno || p.codigo_interno || p.codigo || pId,
              nome: prodBase?.nome || p.nome_produto || p.nome || 'Produto sem nome',
              grupoId: String(prodBase?.grupo_id || ''),
              nomeGrupo: prodBase?.nome_grupo || 'Diversos',
              fornecedores: suppliers,
              quantidadeVendida: qtd,
            });
          } else {
            existing.quantidadeVendida += qtd;
          }
        }
      }

      let lista = Array.from(salesMap.values());

      // 3. Aplicar filtros combinados
      if (filtroCodigo) {
        lista = lista.filter((item) =>
          item.codigo.toLowerCase().includes(filtroCodigo)
        );
      }
      if (filtroNome) {
        lista = lista.filter((item) =>
          item.nome.toLowerCase().includes(filtroNome)
        );
      }
      if (filtroGrupo) {
        lista = lista.filter((item) => item.grupoId === filtroGrupo);
      }
      if (filtroFornecedor) {
        lista = lista.filter((item) =>
          item.fornecedores.some((f) => f.toLowerCase().includes(filtroFornecedor))
        );
      }

      // Ordenar por maior quantidade vendida
      lista.sort((a, b) => b.quantidadeVendida - a.quantidadeVendida);

      return NextResponse.json({
        dataInicio,
        dataFim,
        totalProdutos: lista.length,
        produtos: lista,
      });
    }

    // ================================================================
    // AÇÃO 3: MONTAR COTAÇÃO (Menu 2)
    // ================================================================
    if (action === 'montar_cotacao') {
      const filtroCodigo = (searchParams.get('codigo') || '').trim().toLowerCase();
      const filtroNome = (searchParams.get('nome') || '').trim().toLowerCase();
      const filtroFornecedor = (searchParams.get('fornecedor') || '').trim().toLowerCase();
      const filtroGrupo = (searchParams.get('grupo_id') || '').trim();

      // Buscar produtos do Gestão Click, limites salvos no banco local e histórico de compras
      const [prodResult, limits, purchasesMap] = await Promise.all([
        getProdutosGestao(100, 1),
        prisma.productStockLimit.findMany(),
        getPurchasesProductIndex(),
      ]);

      const limitsMap = new Map<string, any>();
      for (const l of limits) {
        limitsMap.set(l.produtoId, l);
      }

      let lista = prodResult.produtos.map((p: any) => {
        const pId = String(p.id);
        const limit = limitsMap.get(pId);
        const purchase = purchasesMap.get(pId);

        const valorUltima = purchase?.valorUltimaCompra || parseFloat(p.valor_custo) || 0;

        return {
          produtoId: pId,
          codigo: p.codigo_interno || p.codigo_barra || pId,
          nome: p.nome,
          grupoId: String(p.grupo_id || ''),
          nomeGrupo: p.nome_grupo || 'Diversos',
          fornecedores: purchase?.fornecedores?.length ? purchase.fornecedores : [],
          estoqueAtual: parseFloat(p.estoque) || 0,
          estoqueMinimo: limit?.estoqueMinimo ?? 0,
          estoqueMaximo: limit?.estoqueMaximo ?? 0,
          dataUltimaCompra: purchase?.dataUltimaCompra || null,
          quantidadeUltimaCompra: purchase?.quantidadeUltimaCompra ?? null,
          valorUltimaCompra: valorUltima,
          valorCotacao: valorUltima, // Inicializa com o valor da última compra, mas editável pelo usuário
          quantidadePedida: '', // Vem em branco para digitação do usuário
        };
      });

      // Aplicar filtros
      if (filtroCodigo) {
        lista = lista.filter((item: any) => item.codigo.toLowerCase().includes(filtroCodigo));
      }
      if (filtroNome) {
        lista = lista.filter((item: any) => item.nome.toLowerCase().includes(filtroNome));
      }
      if (filtroGrupo) {
        lista = lista.filter((item: any) => item.grupoId === filtroGrupo);
      }
      if (filtroFornecedor) {
        lista = lista.filter((item: any) =>
          item.fornecedores.some((f: string) => f.toLowerCase().includes(filtroFornecedor))
        );
      }

      return NextResponse.json({
        totalProdutos: lista.length,
        produtos: lista,
      });
    }

    // ================================================================
    // AÇÃO 4: COTAÇÕES FEITAS (Menu 3)
    // ================================================================
    if (action === 'cotacoes') {
      const cotacoes = await prisma.productQuotation.findMany({
        orderBy: { sequencial: 'desc' },
      });

      const parsed = cotacoes.map((c) => ({
        ...c,
        itens: JSON.parse(c.itens || '[]'),
      }));

      return NextResponse.json({ cotacoes: parsed });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na API de Pedidos:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    // ================================================================
    // AÇÃO 5: SALVAR LIMITES (Estoque Mínimo e Máximo no Banco da App)
    // ================================================================
    if (action === 'salvar_limites') {
      const { produtoId, codigoInterno, nome, estoqueMinimo, estoqueMaximo, userAuthor = 'Usuário' } = body;

      if (!produtoId) {
        return NextResponse.json({ error: 'produtoId é obrigatório' }, { status: 400 });
      }

      const minVal = parseFloat(estoqueMinimo) || 0;
      const maxVal = parseFloat(estoqueMaximo) || 0;

      const saved = await prisma.productStockLimit.upsert({
        where: { produtoId: String(produtoId) },
        update: {
          codigoInterno: codigoInterno ? String(codigoInterno) : null,
          nome: nome ? String(nome) : null,
          estoqueMinimo: minVal,
          estoqueMaximo: maxVal,
          updatedBy: userAuthor,
        },
        create: {
          produtoId: String(produtoId),
          codigoInterno: codigoInterno ? String(codigoInterno) : null,
          nome: nome ? String(nome) : null,
          estoqueMinimo: minVal,
          estoqueMaximo: maxVal,
          updatedBy: userAuthor,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Limites do produto "${nome || produtoId}" salvos com sucesso (Mín: ${minVal}, Máx: ${maxVal})!`,
        limit: saved,
      });
    }

    // ================================================================
    // AÇÃO 6: FINALIZAR COTAÇÃO (Cria Cotação numerada 0001, 0002...)
    // ================================================================
    if (action === 'finalizar_cotacao') {
      const {
        nomeFornecedor = 'Cotação Geral',
        fornecedorId = null,
        valorTotal = 0,
        observacoes = '',
        itens = [],
        criadoPor = 'Usuário',
      } = body;

      if (!Array.isArray(itens) || itens.length === 0) {
        return NextResponse.json(
          { error: 'Para finalizar a cotação, adicione ao menos um produto com quantidade a ser pedida.' },
          { status: 400 }
        );
      }

      // Obter o próximo sequencial da numeração crescente
      const lastQuotation = await prisma.productQuotation.findFirst({
        orderBy: { sequencial: 'desc' },
      });

      const nextSeq = (lastQuotation?.sequencial ?? 0) + 1;
      const numeroFormatado = String(nextSeq).padStart(4, '0'); // ex: 0001, 0002, 0003

      const novaCotacao = await prisma.productQuotation.create({
        data: {
          numero: numeroFormatado,
          sequencial: nextSeq,
          nomeFornecedor: nomeFornecedor || 'Múltiplos Fornecedores',
          fornecedorId: fornecedorId ? String(fornecedorId) : null,
          valorTotal: parseFloat(valorTotal) || 0,
          quantidadeItens: itens.length,
          observacoes,
          itens: JSON.stringify(itens),
          status: 'FINALIZADA',
          criadoPor,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Cotação nº ${numeroFormatado} finalizada com sucesso!`,
        cotacao: {
          ...novaCotacao,
          itens,
        },
      });
    }

    return NextResponse.json({ error: 'Ação POST não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no POST /api/pedidos:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar requisição' }, { status: 500 });
  }
}
