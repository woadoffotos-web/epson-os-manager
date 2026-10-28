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
  getMonthlySalesIndex,
} from '@/lib/gestao';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
            // Prioriza e une fornecedores vinculados no cadastro do produto (Gestão Click) com compras
            const registeredSuppliers: string[] = Array.isArray(prodDetails?.fornecedores) ? prodDetails.fornecedores : [];
            const purchaseSuppliers: string[] = Array.isArray(purchaseInfo?.fornecedores) ? purchaseInfo.fornecedores : [];
            const combinedSuppliers = Array.from(new Set([...registeredSuppliers, ...purchaseSuppliers]));

            // Utiliza o codigo_interno real (ex: "130000") e nome_grupo real (ex: "Suprimentos")
            salesMap.set(pId, {
              produtoId: pId,
              codigo: prodDetails?.codigo_interno || p.codigo_interno || p.codigo || pId,
              nome: prodDetails?.nome || p.nome_produto || p.nome || 'Produto sem nome',
              grupoId: String(prodDetails?.grupo_id || ''),
              nomeGrupo: prodDetails?.nome_grupo || 'Diversos',
              fornecedores: combinedSuppliers,
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
    // AÇÃO 3: MONTAR COTAÇÃO (Menu 2 - Catálogo Completo com Filtros Globais)
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

      // 1. Buscar limites locais de estoque, histórico de compras e histórico de vendas de ambos os meses em paralelo
      const [limits, purchasesMap, monthlySales] = await Promise.all([
        prisma.productStockLimit.findMany(),
        getPurchasesProductIndex(),
        getMonthlySalesIndex(),
      ]);

      const limitsMap = new Map<string, any>();
      for (const l of limits) {
        limitsMap.set(l.produtoId, l);
      }

      // 2. Construir condições dinâmicas de busca no banco Neon (ProductCatalogCache)
      const andConditions: any[] = [];

      // Filtro 1: Produtos explicitamente selecionados no autocomplete
      if (filtroProdutoIds.length > 0) {
        andConditions.push({ produtoId: { in: filtroProdutoIds } });
      }

      // Filtro 2: Código interno do produto
      if (filtroCodigo) {
        andConditions.push({
          OR: [
            { codigoInterno: { contains: filtroCodigo, mode: 'insensitive' } },
            { nome: { contains: filtroCodigo, mode: 'insensitive' } },
          ],
        });
      }

      // Filtro 3: Busca textual / Nome do produto
      if (filtroBusca) {
        andConditions.push({
          OR: [
            { nome: { contains: filtroBusca, mode: 'insensitive' } },
            { codigoInterno: { contains: filtroBusca, mode: 'insensitive' } },
          ],
        });
      }

      // Filtro 4: Múltiplos Grupos selecionados
      if (filtroGrupos.length > 0) {
        andConditions.push({
          OR: filtroGrupos.flatMap((fg) => [
            { grupoId: { equals: fg } },
            { nomeGrupo: { contains: fg, mode: 'insensitive' } },
          ]),
        });
      }

      // Filtro 5: Múltiplos Fornecedores selecionados
      if (filtroFornecedores.length > 0) {
        // Encontra todos os IDs de produtos no histórico de compras associados a esses fornecedores
        const productIdsFromPurchases: string[] = [];
        for (const [pId, pInfo] of purchasesMap.entries()) {
          const hasMatch = pInfo.fornecedores.some((f) =>
            filtroFornecedores.some((ff) => f.toLowerCase().includes(ff))
          );
          if (hasMatch) {
            productIdsFromPurchases.push(pId);
          }
        }

        andConditions.push({
          OR: [
            ...filtroFornecedores.map((ff) => ({
              fornecedores: { contains: ff, mode: 'insensitive' },
            })),
            ...(productIdsFromPurchases.length > 0
              ? [{ produtoId: { in: productIdsFromPurchases } }]
              : []),
          ],
        });
      }

      // 3. Executar query no catálogo completo
      const dbProducts = await prisma.productCatalogCache.findMany({
        where: andConditions.length > 0 ? { AND: andConditions } : undefined,
        orderBy: { nome: 'asc' },
      });

      // 4. Mapear e associar estoque, limites e valores da última compra
      const lista = dbProducts.map((p) => {
        const pId = p.produtoId;
        const limit = limitsMap.get(pId);
        const purchase = purchasesMap.get(pId);

        let registeredSuppliers: string[] = [];
        try {
          registeredSuppliers = JSON.parse(p.fornecedores || '[]');
        } catch {
          registeredSuppliers = [];
        }

        const purchaseSuppliers: string[] = Array.isArray(purchase?.fornecedores) ? purchase.fornecedores : [];
        const combinedSuppliers = Array.from(new Set([...registeredSuppliers, ...purchaseSuppliers]));

        const valorUltima = purchase?.valorUltimaCompra || p.valorCusto || 0;
        const vendasAtual = monthlySales.mesAtual.get(pId) || 0;
        const vendasAnterior = monthlySales.mesAnterior.get(pId) || 0;

        return {
          produtoId: pId,
          codigo: p.codigoInterno || pId,
          nome: p.nome || 'Produto sem nome',
          grupoId: p.grupoId || '',
          nomeGrupo: p.nomeGrupo || 'Diversos',
          fornecedores: combinedSuppliers,
          estoqueAtual: p.estoque,
          estoqueMinimo: limit?.estoqueMinimo ?? 0,
          estoqueMaximo: limit?.estoqueMaximo ?? 0,
          vendasMesAnterior: vendasAnterior,
          vendasMesAtual: vendasAtual,
          dataUltimaCompra: purchase?.dataUltimaCompra || null,
          quantidadeUltimaCompra: purchase?.quantidadeUltimaCompra ?? null,
          valorUltimaCompra: valorUltima,
          valorCotacao: valorUltima,
          quantidadePedida: '',
        };
      });

      return NextResponse.json({
        totalProdutos: lista.length,
        produtos: lista,
        mesesLabels: monthlySales.labels,
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
