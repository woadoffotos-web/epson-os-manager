import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  fetchGestaoApi,
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
    // AÇÃO 0.2: GERAR CÓDIGO INTERNO ÚNICO DE 6 DÍGITOS
    // ================================================================
    if (action === 'gerar_codigo_interno') {
      const allCached = await prisma.productCatalogCache.findMany({
        select: { codigoInterno: true },
      });
      const existingCodes = new Set(allCached.map((p) => p.codigoInterno).filter(Boolean));

      let candidate = '';
      let attempts = 0;
      do {
        // Gera número de 6 dígitos entre 100000 e 999999
        const rand = Math.floor(100000 + Math.random() * 900000);
        candidate = String(rand);
        attempts++;
      } while (existingCodes.has(candidate) && attempts < 1000);

      return NextResponse.json({ codigoInterno: candidate });
    }

    // ================================================================
    // AÇÃO 0.3: VERIFICAR DUPLICIDADE DE CÓDIGO INTERNO NO ERP / BANCO
    // ================================================================
    if (action === 'verificar_codigo') {
      const codigo = (searchParams.get('codigo') || '').trim();
      if (!codigo) {
        return NextResponse.json({ exists: false });
      }

      const existing = await prisma.productCatalogCache.findFirst({
        where: {
          codigoInterno: { equals: codigo, mode: 'insensitive' },
        },
      });

      if (existing) {
        return NextResponse.json({
          exists: true,
          produto: {
            id: existing.produtoId,
            codigo: existing.codigoInterno,
            nome: existing.nome,
          },
        });
      }

      // Consulta também a API do Gestão Click diretamente para garantir
      try {
        const gestaoRes = await fetchGestaoApi(`/produtos?busca=${encodeURIComponent(codigo)}`);
        if (gestaoRes.ok && Array.isArray(gestaoRes.data?.data)) {
          const match = gestaoRes.data.data.find(
            (p: any) => (p.codigo_interno || '').trim().toLowerCase() === codigo.toLowerCase()
          );
          if (match) {
            return NextResponse.json({
              exists: true,
              produto: {
                id: String(match.id),
                codigo: match.codigo_interno,
                nome: match.nome,
              },
            });
          }
        }
      } catch (errGestao) {
        console.error('Erro ao verificar duplicidade no Gestão Click:', errGestao);
      }

      return NextResponse.json({ exists: false });
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

      // 1. Buscar vendas, compras e fornecedores em paralelo
      const [vendas, purchasesMap, allForns] = await Promise.all([
        getVendasPeriodo(dataInicio, dataFim),
        getPurchasesProductIndex(),
        getFornecedores(),
      ]);

      // Expansão inteligente de fornecedores (mapeia nome fantasia, razão social e variações)
      let expandedSupplierTerms: string[] = [...filtroFornecedores];
      if (filtroFornecedores.length > 0 && Array.isArray(allForns)) {
        const setTerms = new Set<string>(filtroFornecedores.map((f) => f.toLowerCase()));
        for (const ff of filtroFornecedores) {
          const ffLower = ff.toLowerCase();
          for (const s of allForns) {
            const sNome = (s.nome || '').toLowerCase();
            const sRazao = (s.razaoSocial || '').toLowerCase();
            if (
              (sNome && sNome.includes(ffLower)) ||
              (sRazao && sRazao.includes(ffLower)) ||
              (sNome && ffLower.includes(sNome)) ||
              (sRazao && ffLower.includes(sRazao))
            ) {
              if (s.nome) setTerms.add(s.nome.toLowerCase());
              if (s.razaoSocial) setTerms.add(s.razaoSocial.toLowerCase());
            }
          }
        }
        expandedSupplierTerms = Array.from(setTerms);
      }

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

      // Filtro por múltiplos fornecedores selecionados (com expansão de nomes e razões sociais)
      if (expandedSupplierTerms.length > 0) {
        lista = lista.filter((item) =>
          item.fornecedores.some((f) =>
            expandedSupplierTerms.some(
              (ff) => f.toLowerCase().includes(ff) || ff.includes(f.toLowerCase())
            )
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

      // 1. Buscar limites locais de estoque, histórico de compras, vendas e fornecedores em paralelo
      const [limits, purchasesMap, monthlySales, allForns] = await Promise.all([
        prisma.productStockLimit.findMany(),
        getPurchasesProductIndex(),
        getMonthlySalesIndex(),
        getFornecedores(),
      ]);

      const limitsMap = new Map<string, any>();
      for (const l of limits) {
        limitsMap.set(l.produtoId, l);
      }

      // Expansão inteligente de fornecedores (mapeia nome fantasia, razão social e variações)
      let expandedSupplierTerms: string[] = [...filtroFornecedores];
      if (filtroFornecedores.length > 0 && Array.isArray(allForns)) {
        const setTerms = new Set<string>(filtroFornecedores.map((f) => f.toLowerCase()));
        for (const ff of filtroFornecedores) {
          const ffLower = ff.toLowerCase();
          for (const s of allForns) {
            const sNome = (s.nome || '').toLowerCase();
            const sRazao = (s.razaoSocial || '').toLowerCase();
            if (
              (sNome && sNome.includes(ffLower)) ||
              (sRazao && sRazao.includes(ffLower)) ||
              (sNome && ffLower.includes(sNome)) ||
              (sRazao && ffLower.includes(sRazao))
            ) {
              if (s.nome) setTerms.add(s.nome.toLowerCase());
              if (s.razaoSocial) setTerms.add(s.razaoSocial.toLowerCase());
            }
          }
        }
        expandedSupplierTerms = Array.from(setTerms);
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
      if (expandedSupplierTerms.length > 0) {
        // Encontra todos os IDs de produtos no histórico de compras associados a esses fornecedores
        const productIdsFromPurchases: string[] = [];
        for (const [pId, pInfo] of purchasesMap.entries()) {
          const hasMatch = pInfo.fornecedores.some((f) =>
            expandedSupplierTerms.some(
              (ff) => f.toLowerCase().includes(ff) || ff.includes(f.toLowerCase())
            )
          );
          if (hasMatch) {
            productIdsFromPurchases.push(pId);
          }
        }

        andConditions.push({
          OR: [
            ...expandedSupplierTerms.map((ff) => ({
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
        status: c.status || 'AGUARDANDO_CHEGAR',
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

      // Itens iniciados para conferência futura
      const itensComConferencia = itens.map((item: any) => ({
        ...item,
        quantidadeConferida: 0,
        conferido: false,
      }));

      const novaCotacao = await prisma.productQuotation.create({
        data: {
          numero: numeroFormatado,
          sequencial: nextSeq,
          nomeFornecedor: nomeFornecedor || 'Múltiplos Fornecedores',
          fornecedorId: fornecedorId ? String(fornecedorId) : null,
          valorTotal: parseFloat(valorTotal) || 0,
          quantidadeItens: itens.length,
          observacoes,
          itens: JSON.stringify(itensComConferencia),
          status: 'AGUARDANDO_CHEGAR',
          criadoPor,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Cotação nº ${numeroFormatado} finalizada com sucesso!`,
        cotacao: {
          ...novaCotacao,
          itens: itensComConferencia,
        },
      });
    }

    // ================================================================
    // AÇÃO 7: INSERIR NOVO PRODUTO NO GESTÃO CLICK ERP E COTAÇÃO
    // ================================================================
    if (action === 'inserir_produto') {
      const {
        codigoInterno,
        nome,
        grupoId = '',
        nomeGrupo = 'Diversos',
        fornecedor = '',
        fornecedorId = '',
        fornecedores = [],
        valorCusto = 0,
      } = body;

      if (!nome || !nome.trim()) {
        return NextResponse.json({ error: 'O nome do produto é obrigatório.' }, { status: 400 });
      }

      let finalCodigo = (codigoInterno || '').trim();
      if (!finalCodigo) {
        // Se não informado, gera código de 6 dígitos único
        const allCached = await prisma.productCatalogCache.findMany({ select: { codigoInterno: true } });
        const existingCodes = new Set(allCached.map((p) => p.codigoInterno).filter(Boolean));
        let attempts = 0;
        do {
          finalCodigo = String(Math.floor(100000 + Math.random() * 900000));
          attempts++;
        } while (existingCodes.has(finalCodigo) && attempts < 1000);
      } else {
        // Validação estrita de duplicidade de código no banco local
        const existing = await prisma.productCatalogCache.findFirst({
          where: {
            codigoInterno: { equals: finalCodigo, mode: 'insensitive' },
          },
        });
        if (existing) {
          return NextResponse.json(
            { error: `O código interno "${finalCodigo}" já está cadastrado no sistema para o produto "${existing.nome}". Por favor, utilize outro código.` },
            { status: 400 }
          );
        }

        // Validação estrita de duplicidade na API do Gestão Click
        try {
          const gestaoCheck = await fetchGestaoApi(`/produtos?busca=${encodeURIComponent(finalCodigo)}`);
          if (gestaoCheck.ok && Array.isArray(gestaoCheck.data?.data)) {
            const match = gestaoCheck.data.data.find(
              (p: any) => (p.codigo_interno || '').trim().toLowerCase() === finalCodigo.toLowerCase()
            );
            if (match) {
              return NextResponse.json(
                { error: `O código interno "${finalCodigo}" já está cadastrado no Gestão Click para o produto "${match.nome}". Por favor, utilize outro código.` },
                { status: 400 }
              );
            }
          }
        } catch (errCheck) {
          console.error('Erro ao verificar duplicidade no Gestão Click:', errCheck);
        }
      }

      // Resolver Grupo válido para o Gestão Click
      const grupos = await getGruposProdutos();
      let finalGrupoId = (grupoId || '').trim();
      let finalNomeGrupo = (nomeGrupo || '').trim();

      if (finalGrupoId) {
        const found = grupos.find((g: any) => String(g.id) === finalGrupoId);
        if (found) {
          finalNomeGrupo = found.nome;
        }
      } else if (finalNomeGrupo) {
        const found = grupos.find((g: any) => g.nome.toLowerCase() === finalNomeGrupo.toLowerCase());
        if (found) {
          finalGrupoId = String(found.id);
          finalNomeGrupo = found.nome;
        }
      }

      if (!finalGrupoId && grupos.length > 0) {
        finalGrupoId = String(grupos[0].id);
        finalNomeGrupo = grupos[0].nome;
      }

      const costNum = parseFloat(valorCusto) || 0;
      const costFormatted = costNum.toFixed(2);

      // 1. Cadastrar produto imediatamente no Gestão Click ERP via POST /produtos
      const gestaoPayload: Record<string, any> = {
        nome: nome.trim(),
        codigo_interno: finalCodigo,
        valor_custo: costFormatted,
        valor_venda: costFormatted,
        grupo_id: finalGrupoId,
        movimenta_estoque: '1',
        ativo: '1',
      };

      if (fornecedorId && String(fornecedorId).trim()) {
        gestaoPayload.fornecedor_id = String(fornecedorId).trim();
      }

      const resGestao = await fetchGestaoApi('/produtos', {
        method: 'POST',
        body: JSON.stringify(gestaoPayload),
      });

      if (!resGestao.ok || resGestao.data?.status !== 'success' || !resGestao.data?.data?.id) {
        console.error('Erro ao cadastrar produto no Gestão Click:', resGestao);
        const gestaoErrMsg =
          resGestao.data?.data?.mensagem ||
          resGestao.data?.data?.erro ||
          resGestao.data?.error ||
          (resGestao.raw ? 'Retorno inválido da API do ERP' : 'Falha na comunicação com o Gestão Click');
        return NextResponse.json(
          { error: `Erro no Gestão Click ao cadastrar produto: ${gestaoErrMsg}` },
          { status: 400 }
        );
      }

      const gestaoProdutoId = String(resGestao.data.data.id);

      // Prepara fornecedores
      const fornList =
        Array.isArray(fornecedores) && fornecedores.length > 0
          ? fornecedores
          : fornecedor && fornecedor.trim()
          ? [fornecedor.trim()]
          : [];

      // 2. Salva no banco de dados local com o ID real gerado pelo Gestão Click
      const savedProd = await prisma.productCatalogCache.upsert({
        where: { produtoId: gestaoProdutoId },
        update: {
          codigoInterno: finalCodigo,
          nome: nome.trim(),
          grupoId: String(finalGrupoId || ''),
          nomeGrupo: finalNomeGrupo ? String(finalNomeGrupo) : 'Diversos',
          fornecedores: JSON.stringify(fornList),
          valorCusto: costNum,
        },
        create: {
          produtoId: gestaoProdutoId,
          codigoInterno: finalCodigo,
          nome: nome.trim(),
          grupoId: String(finalGrupoId || ''),
          nomeGrupo: finalNomeGrupo ? String(finalNomeGrupo) : 'Diversos',
          fornecedores: JSON.stringify(fornList),
          estoque: 0,
          valorCusto: costNum,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Produto "${savedProd.nome}" (Cód: ${finalCodigo}, ID Gestão: ${gestaoProdutoId}) criado no Gestão Click com sucesso e inserido na cotação!`,
        produto: {
          produtoId: savedProd.produtoId,
          codigo: savedProd.codigoInterno,
          nome: savedProd.nome,
          grupoId: savedProd.grupoId,
          nomeGrupo: savedProd.nomeGrupo,
          fornecedores: fornList,
          estoqueAtual: 0,
          estoqueMinimo: 0,
          estoqueMaximo: 0,
          vendasMesAnterior: 0,
          vendasMesAtual: 0,
          dataUltimaCompra: null,
          quantidadeUltimaCompra: null,
          valorUltimaCompra: savedProd.valorCusto,
          valorCotacao: savedProd.valorCusto,
          quantidadePedida: '',
          reservas: '',
        },
      });
    }

    // ================================================================
    // AÇÃO 8: SALVAR CONFERÊNCIA DE PRODUTOS DA COTAÇÃO
    // ================================================================
    if (action === 'salvar_conferencia') {
      const { cotacaoId, itens = [] } = body;

      if (!cotacaoId) {
        return NextResponse.json({ error: 'cotacaoId é obrigatório' }, { status: 400 });
      }

      // Regra de conferência:
      // Se todos os produtos tiverem a quantidade conferida igual à quantidade pedida E o checkbox marcado -> 'FINALIZADA'
      // Caso contrário -> 'ENTREGA_PARCIAL'
      const isAllOk =
        Array.isArray(itens) &&
        itens.length > 0 &&
        itens.every((item: any) => {
          const qPed = parseFloat(item.quantidadePedida) || 0;
          const qConf = parseFloat(item.quantidadeConferida) || 0;
          return Boolean(item.conferido && qConf === qPed);
        });

      const novoStatus = isAllOk ? 'FINALIZADA' : 'ENTREGA_PARCIAL';

      const cotacaoAtualizada = await prisma.productQuotation.update({
        where: { id: String(cotacaoId) },
        data: {
          itens: JSON.stringify(itens),
          status: novoStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: isAllOk
          ? `Cotação nº ${cotacaoAtualizada.numero} conferida com sucesso! Situação: FINALIZADA (Verde)`
          : `Cotação nº ${cotacaoAtualizada.numero} atualizada! Situação: ENTREGA PARCIAL (Vermelho)`,
        cotacao: {
          ...cotacaoAtualizada,
          itens,
        },
        status: novoStatus,
      });
    }

    return NextResponse.json({ error: 'Ação POST não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no POST /api/pedidos:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar requisição' }, { status: 500 });
  }
}
