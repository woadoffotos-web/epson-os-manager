import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getGruposProdutos,
  getFornecedores,
  getVendasPeriodo,
  getPurchasesProductIndex,
  getProdutosGestao,
  getProductDetailsBatch,
  searchProdutosGestao,
} from '@/lib/gestao';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'ultimas_vendas';

    // ================================================================
    // AÇÃO 0: BUSCA DINÂMICA DE PRODUTOS (Para o campo Produtos digitável)
    // ================================================================
    if (action === 'buscar_produtos') {
      const termo = searchParams.get('termo') || '';
      const produtos = await searchProdutosGestao(termo, 30);
      return NextResponse.json({ produtos });
    }

    // ================================================================
    // AÇÃO 0.1: BUSCA DE FORNECEDORES DO GESTÃO CLICK
    // ================================================================
    if (action === 'fornecedores') {
      const termo = searchParams.get('termo') || '';
      const fornecedores = await getFornecedores(termo);
      return NextResponse.json({ fornecedores });
    }

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

      // Múltiplos grupos (separados por vírgula)
      const gruposParam = searchParams.get('grupos') || searchParams.get('grupo_id') || '';
      const filtroGrupos = gruposParam
        ? gruposParam.split(',').map((g) => g.trim().toLowerCase()).filter(Boolean)
        : [];

      // Múltiplos fornecedores (separados por vírgula)
      const fornecedoresParam = searchParams.get('fornecedores') || searchParams.get('fornecedor') || '';
      const filtroFornecedores = fornecedoresParam
        ? fornecedoresParam.split(',').map((f) => f.trim().toLowerCase()).filter(Boolean)
        : [];

      // Múltiplos produtos selecionados (IDs separados por vírgula)
      const produtosParam = searchParams.get('produtos') || '';
      const filtroProdutoIds = produtosParam
        ? produtosParam.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

      // 1. Buscar vendas e compras em paralelo
      const [vendas, purchasesMap] = await Promise.all([
        getVendasPeriodo(dataInicio, dataFim),
        getPurchasesProductIndex(),
      ]);

      // 2. Extrair todos os IDs únicos de produtos vendidos para buscar os dados cadastrais reais
      const uniqueProductIds = new Set<string>();
      for (const venda of vendas) {
        if (!Array.isArray(venda.produtos)) continue;
        for (const item of venda.produtos) {
          const p = item.produto || item;
          const pId = String(p.produto_id || p.id);
          if (pId) uniqueProductIds.add(pId);
        }
      }

      // 3. Buscar os detalhes completos de cada produto vendido (garante codigo_interno e nome_grupo reais)
      const productsMap = await getProductDetailsBatch(Array.from(uniqueProductIds));

      // 4. Consolidar quantidade vendida por produto no período
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
          const prodDetails = productsMap.get(pId);
          const purchaseInfo = purchasesMap.get(pId);

          const existing = salesMap.get(pId);
          if (!existing) {
            const suppliers = purchaseInfo?.fornecedores?.length
              ? purchaseInfo.fornecedores
              : [];

            // Utiliza o codigo_interno real (ex: "130000") e nome_grupo real (ex: "Suprimentos")
            salesMap.set(pId, {
              produtoId: pId,
              codigo: prodDetails?.codigo_interno || p.codigo_interno || p.codigo || pId,
              nome: prodDetails?.nome || p.nome_produto || p.nome || 'Produto sem nome',
              grupoId: String(prodDetails?.grupo_id || ''),
              nomeGrupo: prodDetails?.nome_grupo || 'Diversos',
              fornecedores: suppliers,
              quantidadeVendida: qtd,
            });
          } else {
            existing.quantidadeVendida += qtd;
          }
        }
      }

      let lista = Array.from(salesMap.values());

      // 5. Aplicar filtros combinados com suporte à seleção múltipla
      if (filtroCodigo) {
        lista = lista.filter((item) =>
          item.codigo.toLowerCase().includes(filtroCodigo)
        );
      }

      // Filtro por múltiplos produtos selecionados
      if (filtroProdutoIds.length > 0) {
        lista = lista.filter((item) => filtroProdutoIds.includes(item.produtoId));
      }

      // Filtro por múltiplos grupos selecionados
      if (filtroGrupos.length > 0) {
        lista = lista.filter((item) => {
          const gId = item.grupoId.toLowerCase();
          const gName = item.nomeGrupo.toLowerCase();
          return filtroGrupos.some((fg) => fg === gId || gName.includes(fg));
        });
      }

      // Filtro por múltiplos fornecedores selecionados
      if (filtroFornecedores.length > 0) {
        lista = lista.filter((item) =>
          item.fornecedores.some((f) =>
            filtroFornecedores.some((ff) => f.toLowerCase().includes(ff))
          )
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
      const filtroBusca = (searchParams.get('busca') || searchParams.get('nome') || '').trim();

      // Múltiplos grupos selecionados
      const gruposParam = searchParams.get('grupos') || searchParams.get('grupo_id') || '';
      const filtroGrupos = gruposParam
        ? gruposParam.split(',').map((g) => g.trim().toLowerCase()).filter(Boolean)
        : [];

      // Múltiplos fornecedores selecionados
      const fornecedoresParam = searchParams.get('fornecedores') || searchParams.get('fornecedor') || '';
      const filtroFornecedores = fornecedoresParam
        ? fornecedoresParam.split(',').map((f) => f.trim().toLowerCase()).filter(Boolean)
        : [];

      // Múltiplos produtos selecionados por ID
      const produtosParam = searchParams.get('produtos') || '';
      const filtroProdutoIds = produtosParam
        ? produtosParam.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

      // Se o usuário selecionou produtos específicos no seletor de produtos, busca esses produtos diretamente
      let rawProducts: any[] = [];
      if (filtroProdutoIds.length > 0) {
        const batchMap = await getProductDetailsBatch(filtroProdutoIds);
        rawProducts = Array.from(batchMap.values());
      } else {
        // Se houver busca de texto ou grupo específico
        const prodResult = await getProdutosGestao(100, 1, {
          busca: filtroBusca || filtroCodigo || undefined,
          grupoId: filtroGrupos.length === 1 ? filtroGrupos[0] : undefined,
        });
        rawProducts = prodResult.produtos;
      }

      // Buscar limites locais salvos e histórico de compras
      const [limits, purchasesMap] = await Promise.all([
        prisma.productStockLimit.findMany(),
        getPurchasesProductIndex(),
      ]);

      const limitsMap = new Map<string, any>();
      for (const l of limits) {
        limitsMap.set(l.produtoId, l);
      }

      let lista = rawProducts.map((p: any) => {
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
          valorCotacao: valorUltima,
          quantidadePedida: '',
        };
      });

      // Aplicar filtros de código
      if (filtroCodigo) {
        lista = lista.filter((item: any) => item.codigo.toLowerCase().includes(filtroCodigo));
      }

      // Aplicar filtro de múltiplos grupos
      if (filtroGrupos.length > 0) {
        lista = lista.filter((item: any) => {
          const gId = item.grupoId.toLowerCase();
          const gName = item.nomeGrupo.toLowerCase();
          return filtroGrupos.some((fg: string) => fg === gId || gName.includes(fg));
        });
      }

      // Aplicar filtro de múltiplos fornecedores
      if (filtroFornecedores.length > 0) {
        lista = lista.filter((item: any) =>
          item.fornecedores.some((f: string) =>
            filtroFornecedores.some((ff: string) => f.toLowerCase().includes(ff))
          )
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
