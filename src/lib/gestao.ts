import { prisma } from '@/lib/prisma';

/**
 * Integração com a API do Gestão Click ERP
 * Documentação: https://veteltec-gestaoclick.apiary.io/
 */

const BASE_URL = 'https://api.gestaoclick.com';

const ACCESS_TOKEN =
  process.env.GESTAO_ACCESS_TOKEN || 'ad0ce86ce7b8b6dba8bac9355cced6826c7b0e3f';
const SECRET_ACCESS_TOKEN =
  process.env.GESTAO_SECRET_ACCESS_TOKEN || 'db75c272b019bff03daa51bfc9b7b0af633a3973';

export async function fetchGestaoApi(path: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;

  const headers: Record<string, string> = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...((options.headers as any) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const text = await res.text();
  try {
    return {
      status: res.status,
      ok: res.ok,
      data: JSON.parse(text),
    };
  } catch {
    return {
      status: res.status,
      ok: res.ok,
      raw: text,
      data: null,
    };
  }
}

// 1. Grupos de Produtos
export async function getGruposProdutos() {
  const res = await fetchGestaoApi('/grupos_produtos');
  if (res.ok && res.data?.data) {
    return res.data.data.map((g: any) => ({
      id: String(g.id),
      nome: g.nome,
    }));
  }
  return [];
}

// 2. Fornecedores completos com paginação automática e cache em memória (679+ fornecedores)
let fornecedoresCache: {
  timestamp: number;
  data: Array<{ id: string; nome: string; razaoSocial: string; documento: string }>;
} | null = null;

export async function getFornecedores(termo?: string, forceRefresh = false) {
  const now = Date.now();

  // Se o cache tiver menos de 10 minutos, aproveita
  if (!forceRefresh && fornecedoresCache && now - fornecedoresCache.timestamp < 10 * 60 * 1000) {
    if (termo && termo.trim()) {
      const clean = termo.trim().toLowerCase();
      return fornecedoresCache.data.filter(
        (f) =>
          f.nome.toLowerCase().includes(clean) ||
          f.razaoSocial.toLowerCase().includes(clean) ||
          f.documento.includes(clean)
      );
    }
    return fornecedoresCache.data;
  }

  try {
    // 1. Busca a primeira página de fornecedores para saber o total de páginas
    const p1 = await fetchGestaoApi('/fornecedores?limite=100&pagina=1');
    if (!p1.ok || !p1.data?.data) {
      return [];
    }

    let allFornecedores: any[] = p1.data.data;
    const totalPaginas = p1.data.meta?.total_paginas || 1;

    // 2. Busca todas as páginas restantes em paralelo (ex: 7 páginas para 679 fornecedores)
    if (totalPaginas > 1) {
      const pagePromises = [];
      for (let p = 2; p <= totalPaginas; p++) {
        pagePromises.push(fetchGestaoApi(`/fornecedores?limite=100&pagina=${p}`));
      }
      const results = await Promise.all(pagePromises);
      for (const res of results) {
        if (res.ok && Array.isArray(res.data?.data)) {
          allFornecedores = allFornecedores.concat(res.data.data);
        }
      }
    }

    const mapped = allFornecedores.map((f: any) => ({
      id: String(f.id),
      nome: (f.nome || f.razao_social || `Fornecedor #${f.id}`).trim(),
      razaoSocial: (f.razao_social || '').trim(),
      documento: (f.cnpj || f.cpf || '').trim(),
    }));

    // Ordenação alfabética para facilitar a seleção
    mapped.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

    fornecedoresCache = {
      timestamp: now,
      data: mapped,
    };

    if (termo && termo.trim()) {
      const clean = termo.trim().toLowerCase();
      return mapped.filter(
        (f) =>
          f.nome.toLowerCase().includes(clean) ||
          f.razaoSocial.toLowerCase().includes(clean) ||
          f.documento.includes(clean)
      );
    }

    return mapped;
  } catch (e) {
    console.error('Erro ao buscar todos os fornecedores:', e);
    return [];
  }
}

// 3. Vendas do Período com itens (busca paralela de páginas para alta performance)
export async function getVendasPeriodo(dataInicio: string, dataFim: string) {
  const p1 = await fetchGestaoApi(`/vendas?data_inicio=${dataInicio}&data_fim=${dataFim}&limite=100&pagina=1`);
  if (!p1.ok || !p1.data?.data) {
    return [];
  }

  let vendas = Array.isArray(p1.data.data) ? p1.data.data : [];
  const totalPaginas = Math.min(p1.data?.meta?.total_paginas || 1, 10);

  if (totalPaginas > 1) {
    const pagePromises = [];
    for (let p = 2; p <= totalPaginas; p++) {
      pagePromises.push(fetchGestaoApi(`/vendas?data_inicio=${dataInicio}&data_fim=${dataFim}&limite=100&pagina=${p}`));
    }
    const results = await Promise.all(pagePromises);
    for (const r of results) {
      if (r.ok && Array.isArray(r.data?.data)) {
        vendas = vendas.concat(r.data.data);
      }
    }
  }

  return vendas;
}

// 3.1. Vendas Consolidadas por Produto no Mês Atual e Mês Anterior (Cache em memória: 10 minutos)
let monthlySalesCache: {
  timestamp: number;
  data: {
    mesAtual: Map<string, number>;
    mesAnterior: Map<string, number>;
    labels: { mesAtual: string; mesAnterior: string };
  };
} | null = null;

export async function getMonthlySalesIndex(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && monthlySalesCache && now - monthlySalesCache.timestamp < 10 * 60 * 1000) {
    return monthlySalesCache.data;
  }

  const nowDate = new Date();
  const anoAtual = nowDate.getFullYear();
  const mesAtual = nowDate.getMonth();

  const mesAtualInicio = new Date(Date.UTC(anoAtual, mesAtual, 1)).toISOString().split('T')[0];
  const mesAtualFim = nowDate.toISOString().split('T')[0];

  const mesAnteriorDate = new Date(Date.UTC(anoAtual, mesAtual - 1, 1));
  const anoAnterior = mesAnteriorDate.getFullYear();
  const mesAnterior = mesAnteriorDate.getMonth();
  const mesAnteriorInicio = new Date(Date.UTC(anoAnterior, mesAnterior, 1)).toISOString().split('T')[0];
  const mesAnteriorFim = new Date(Date.UTC(anoAtual, mesAtual, 0)).toISOString().split('T')[0];

  const nomeMesAnterior = mesAnteriorDate.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase();
  const nomeMesAtual = nowDate.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase();

  const [vendasAtual, vendasAnterior] = await Promise.all([
    getVendasPeriodo(mesAtualInicio, mesAtualFim),
    getVendasPeriodo(mesAnteriorInicio, mesAnteriorFim),
  ]);

  const mapAtual = new Map<string, number>();
  for (const v of vendasAtual) {
    if (Array.isArray(v.produtos)) {
      for (const item of v.produtos) {
        const p = item.produto || item;
        const pId = String(p.produto_id || p.id);
        if (!pId) continue;
        const qtd = parseFloat(p.quantidade) || 0;
        mapAtual.set(pId, (mapAtual.get(pId) || 0) + qtd);
      }
    }
  }

  const mapAnterior = new Map<string, number>();
  for (const v of vendasAnterior) {
    if (Array.isArray(v.produtos)) {
      for (const item of v.produtos) {
        const p = item.produto || item;
        const pId = String(p.produto_id || p.id);
        if (!pId) continue;
        const qtd = parseFloat(p.quantidade) || 0;
        mapAnterior.set(pId, (mapAnterior.get(pId) || 0) + qtd);
      }
    }
  }

  const result = {
    mesAtual: mapAtual,
    mesAnterior: mapAnterior,
    labels: {
      mesAtual: nomeMesAtual,
      mesAnterior: nomeMesAnterior,
    },
  };

  monthlySalesCache = {
    timestamp: now,
    data: result,
  };

  return result;
}

// 4. Cache em memória para histórico de compras completo (TTL de 15 minutos)
let purchasesCache: {
  timestamp: number;
  data: Map<string, {
    dataUltimaCompra: string;
    quantidadeUltimaCompra: number;
    valorUltimaCompra: number;
    fornecedores: string[];
  }>;
} | null = null;

export async function getPurchasesProductIndex(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && purchasesCache && now - purchasesCache.timestamp < 15 * 60 * 1000) {
    return purchasesCache.data;
  }

  const map = new Map<string, {
    dataUltimaCompra: string;
    quantidadeUltimaCompra: number;
    valorUltimaCompra: number;
    fornecedores: string[];
  }>();

  try {
    const [p1, allForns] = await Promise.all([
      fetchGestaoApi('/compras?limite=100&pagina=1'),
      getFornecedores(),
    ]);

    const fornById = new Map<string, { nome: string; razaoSocial?: string }>();
    const fornByName = new Map<string, { nome: string; razaoSocial?: string }>();
    if (Array.isArray(allForns)) {
      for (const f of allForns) {
        if (f.id) fornById.set(String(f.id), f);
        if (f.nome) fornByName.set(f.nome.toLowerCase().trim(), f);
        if (f.razaoSocial) fornByName.set(f.razaoSocial.toLowerCase().trim(), f);
      }
    }

    if (p1.ok && p1.data?.data) {
      let allCompras: any[] = Array.isArray(p1.data.data) ? p1.data.data : [];
      const totalPaginas = p1.data.meta?.total_paginas || 1;

      if (totalPaginas > 1) {
        const batchPromises = [];
        for (let p = 2; p <= totalPaginas; p++) {
          batchPromises.push(fetchGestaoApi(`/compras?limite=100&pagina=${p}`));
        }
        const results = await Promise.all(batchPromises);
        for (const res of results) {
          if (res.ok && Array.isArray(res.data?.data)) {
            allCompras = allCompras.concat(res.data.data);
          }
        }
      }

      for (const item of allCompras) {
        const compra = item.Compra || item;
        const dataEmissao = compra.data_emissao || '';
        const rawNomeFornecedor = (compra.nome_fornecedor || '').trim();
        const fornId = String(compra.fornecedor_id || '');

        const aliases: string[] = [];
        if (rawNomeFornecedor) aliases.push(rawNomeFornecedor);

        const matchedForn =
          (fornId && fornById.get(fornId)) ||
          (rawNomeFornecedor && fornByName.get(rawNomeFornecedor.toLowerCase()));

        if (matchedForn) {
          if (matchedForn.nome && !aliases.includes(matchedForn.nome)) {
            aliases.push(matchedForn.nome);
          }
          if (matchedForn.razaoSocial && !aliases.includes(matchedForn.razaoSocial)) {
            aliases.push(matchedForn.razaoSocial);
          }
        }

        if (Array.isArray(compra.produtos)) {
          for (const pItem of compra.produtos) {
            const p = pItem.produto || pItem;
            const pId = String(p.produto_id || p.id);
            if (!pId) continue;

            const qtd = parseFloat(p.quantidade) || 0;
            const valorCusto = parseFloat(p.valor_custo) || 0;

            const existing = map.get(pId);
            if (!existing) {
              map.set(pId, {
                dataUltimaCompra: dataEmissao,
                quantidadeUltimaCompra: qtd,
                valorUltimaCompra: valorCusto,
                fornecedores: [...aliases],
              });
            } else {
              if (dataEmissao > existing.dataUltimaCompra) {
                existing.dataUltimaCompra = dataEmissao;
                existing.quantidadeUltimaCompra = qtd;
                existing.valorUltimaCompra = valorCusto;
              }
              for (const alias of aliases) {
                if (alias && !existing.fornecedores.includes(alias)) {
                  existing.fornecedores.push(alias);
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro ao indexar compras completas:', err);
  }

  purchasesCache = {
    timestamp: now,
    data: map,
  };

  return map;
}

// 5. Cache e Detalhes de Produtos no PostgreSQL Neon (Ultra performance, zero rate limits)
const productDetailsCache = new Map<string, any>();

export async function getProductDetails(produtoId: string) {
  const pId = String(produtoId);
  if (productDetailsCache.has(pId)) {
    return productDetailsCache.get(pId);
  }

  try {
    const cached = await prisma.productCatalogCache.findUnique({
      where: { produtoId: pId },
    });
    if (cached) {
      let fornecedores: string[] = [];
      try {
        fornecedores = JSON.parse(cached.fornecedores || '[]');
      } catch {
        fornecedores = [];
      }
      const item = {
        id: cached.produtoId,
        codigo_interno: cached.codigoInterno || cached.produtoId,
        nome: cached.nome || '',
        grupo_id: cached.grupoId || '',
        nome_grupo: cached.nomeGrupo || 'Diversos',
        fornecedores,
        estoque: cached.estoque,
        valor_custo: cached.valorCusto,
      };
      productDetailsCache.set(pId, item);
      return item;
    }

    // Se não estiver no banco, consulta Gestão Click
    const [resProd, resForn] = await Promise.all([
      fetchGestaoApi(`/produtos/${pId}`),
      fetchGestaoApi(`/produtos/fornecedores/${pId}`),
    ]);

    const p = resProd.ok ? resProd.data?.data : null;
    if (p) {
      const suppliers: string[] = [];
      if (Array.isArray(resForn.data?.data)) {
        for (const fItem of resForn.data.data) {
          const f = fItem.Fornecedor || fItem.fornecedor || fItem;
          if (f.nome && !suppliers.includes(f.nome)) {
            suppliers.push(f.nome);
          }
          if (f.razao_social && !suppliers.includes(f.razao_social)) {
            suppliers.push(f.razao_social);
          }
        }
      }

      const record = {
        produtoId: pId,
        codigoInterno: p.codigo_interno || String(p.id),
        nome: p.nome || '',
        grupoId: String(p.grupo_id || ''),
        nomeGrupo: p.nome_grupo || 'Diversos',
        fornecedores: JSON.stringify(suppliers),
        estoque: parseFloat(p.estoque) || 0,
        valorCusto: parseFloat(p.valor_custo) || 0,
      };

      await prisma.productCatalogCache.upsert({
        where: { produtoId: pId },
        update: record,
        create: record,
      });

      return {
        id: pId,
        codigo_interno: record.codigoInterno,
        nome: record.nome,
        grupo_id: record.grupoId,
        nome_grupo: record.nomeGrupo,
        fornecedores: suppliers,
        estoque: record.estoque,
        valor_custo: record.valorCusto,
      };
    }
  } catch (e) {
    console.error(`Erro ao buscar produto ${pId}:`, e);
  }

  return null;
}

// Busca em lote de detalhes de produtos diretamente do banco de dados (tempo de resposta: ~20ms)
export async function getProductDetailsBatch(produtoIds: string[]) {
  const result = new Map<string, any>();
  if (produtoIds.length === 0) return result;

  const uniqueIds = Array.from(new Set(produtoIds.map(String)));

  try {
    // 1. Busca todos no PostgreSQL local (Neon) em 1 única query rápida
    const cachedDb = await prisma.productCatalogCache.findMany({
      where: { produtoId: { in: uniqueIds } },
    });

    const foundIds = new Set<string>();
    for (const item of cachedDb) {
      foundIds.add(item.produtoId);
      let fornecedores: string[] = [];
      try {
        fornecedores = JSON.parse(item.fornecedores || '[]');
      } catch {
        fornecedores = [];
      }
      result.set(item.produtoId, {
        id: item.produtoId,
        codigo_interno: item.codigoInterno || item.produtoId,
        nome: item.nome || '',
        grupo_id: item.grupoId || '',
        nome_grupo: item.nomeGrupo || 'Diversos',
        fornecedores,
        estoque: item.estoque,
        valor_custo: item.valorCusto,
      });
    }

    // 2. Para produtos novos que ainda não estejam em cache, busca na API do Gestão Click
    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      const chunkSize = 3;
      for (let i = 0; i < missingIds.length; i += chunkSize) {
        const chunk = missingIds.slice(i, i + chunkSize);
        const promises = chunk.map(async (id) => {
          const details = await getProductDetails(id);
          if (details) result.set(id, details);
        });
        await Promise.all(promises);
      }
    }
  } catch (e) {
    console.error('Erro no getProductDetailsBatch:', e);
  }

  return result;
}

// 6. Busca Dinâmica de Produtos por Nome ou Código (Autocomplete / Multi-select)
export async function searchProdutosGestao(termo: string, limite = 30) {
  if (!termo || termo.trim().length < 2) return [];

  const cleanTerm = termo.trim();

  // 1. Busca ultra-rápida no PostgreSQL Neon local (~5ms)
  try {
    const dbMatches = await prisma.productCatalogCache.findMany({
      where: {
        OR: [
          { nome: { contains: cleanTerm, mode: 'insensitive' } },
          { codigoInterno: { contains: cleanTerm, mode: 'insensitive' } },
        ],
      },
      take: limite,
      orderBy: { nome: 'asc' },
    });

    if (dbMatches.length > 0) {
      return dbMatches.map((p) => {
        let fornecedores: string[] = [];
        try {
          fornecedores = JSON.parse(p.fornecedores || '[]');
        } catch {
          fornecedores = [];
        }
        return {
          id: p.produtoId,
          codigo_interno: p.codigoInterno || p.produtoId,
          codigo_barra: '',
          nome: p.nome || '',
          grupo_id: p.grupoId || '',
          nome_grupo: p.nomeGrupo || 'Diversos',
          estoque: p.estoque,
          valor_custo: p.valorCusto,
          fornecedores,
        };
      });
    }
  } catch (e) {
    console.error('Erro na busca local de produtos:', e);
  }

  // 2. Fallback para API do Gestão Click
  const res = await fetchGestaoApi(`/produtos?busca=${encodeURIComponent(cleanTerm)}&limite=${limite}`);
  
  if (res.ok && res.data?.data) {
    return res.data.data.map((p: any) => {
      const details = {
        id: String(p.id),
        codigo_interno: p.codigo_interno || String(p.id),
        codigo_barra: p.codigo_barra || '',
        nome: p.nome,
        grupo_id: String(p.grupo_id || ''),
        nome_grupo: p.nome_grupo || 'Diversos',
        estoque: parseFloat(p.estoque) || 0,
        valor_custo: parseFloat(p.valor_custo) || 0,
      };
      // Guarda em cache
      productDetailsCache.set(String(p.id), details);
      return details;
    });
  }

  return [];
}

// 7. Produtos paginados / filtrados para Montar Cotação
export async function getProdutosGestao(limite = 100, pagina = 1, options: { grupoId?: string; busca?: string } = {}) {
  let endpoint = `/produtos?limite=${limite}&pagina=${pagina}`;
  if (options.grupoId) endpoint += `&grupo_id=${encodeURIComponent(options.grupoId)}`;
  if (options.busca) endpoint += `&busca=${encodeURIComponent(options.busca)}`;

  const res = await fetchGestaoApi(endpoint);
  if (res.ok && res.data?.data) {
    // Guarda os produtos retornados no cache
    for (const p of res.data.data) {
      productDetailsCache.set(String(p.id), {
        id: String(p.id),
        codigo_interno: p.codigo_interno || String(p.id),
        codigo_barra: p.codigo_barra || '',
        nome: p.nome,
        grupo_id: String(p.grupo_id || ''),
        nome_grupo: p.nome_grupo || 'Diversos',
        estoque: parseFloat(p.estoque) || 0,
        valor_custo: parseFloat(p.valor_custo) || 0,
      });
    }

    return {
      produtos: res.data.data,
      meta: res.data.meta,
    };
  }
  return {
    produtos: [],
    meta: null,
  };
}
