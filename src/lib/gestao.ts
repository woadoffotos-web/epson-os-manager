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

// 2. Fornecedores com busca opcional
export async function getFornecedores(termo?: string) {
  let endpoint = '/fornecedores?limite=100';
  if (termo && termo.trim()) {
    endpoint = `/fornecedores?nome=${encodeURIComponent(termo.trim())}&limite=50`;
  }

  const res = await fetchGestaoApi(endpoint);
  if (res.ok && res.data?.data) {
    return res.data.data.map((f: any) => ({
      id: String(f.id),
      nome: f.razao_social || f.nome || `Fornecedor #${f.id}`,
      documento: f.cnpj || f.cpf || '',
    }));
  }
  return [];
}

// 3. Vendas do Período com itens
export async function getVendasPeriodo(dataInicio: string, dataFim: string) {
  const res = await fetchGestaoApi(`/vendas?data_inicio=${dataInicio}&data_fim=${dataFim}&limite=100`);
  if (!res.ok || !res.data?.data) {
    return [];
  }

  let vendas = Array.isArray(res.data.data) ? res.data.data : [];
  const totalPaginas = Math.min(res.data?.meta?.total_paginas || 1, 5);

  if (totalPaginas > 1) {
    for (let p = 2; p <= totalPaginas; p++) {
      try {
        const pRes = await fetchGestaoApi(`/vendas?data_inicio=${dataInicio}&data_fim=${dataFim}&limite=100&pagina=${p}`);
        if (pRes.ok && Array.isArray(pRes.data?.data)) {
          vendas = vendas.concat(pRes.data.data);
        }
      } catch (e) {
        console.error(`Erro ao buscar pág ${p} de vendas:`, e);
      }
    }
  }

  return vendas;
}

// 4. Cache em memória para histórico de compras (TTL de 3 minutos)
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
  if (!forceRefresh && purchasesCache && now - purchasesCache.timestamp < 3 * 60 * 1000) {
    return purchasesCache.data;
  }

  const map = new Map<string, {
    dataUltimaCompra: string;
    quantidadeUltimaCompra: number;
    valorUltimaCompra: number;
    fornecedores: string[];
  }>();

  try {
    const res = await fetchGestaoApi('/compras?limite=80');
    if (res.ok && res.data?.data) {
      for (const item of res.data.data) {
        const compra = item.Compra || item;
        const dataEmissao = compra.data_emissao || '';
        const nomeFornecedor = compra.nome_fornecedor || '';

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
                fornecedores: nomeFornecedor ? [nomeFornecedor] : [],
              });
            } else {
              if (dataEmissao > existing.dataUltimaCompra) {
                existing.dataUltimaCompra = dataEmissao;
                existing.quantidadeUltimaCompra = qtd;
                existing.valorUltimaCompra = valorCusto;
              }
              if (nomeFornecedor && !existing.fornecedores.includes(nomeFornecedor)) {
                existing.fornecedores.push(nomeFornecedor);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro ao indexar compras:', err);
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
          const nomeForn = f.nome || f.razao_social;
          if (nomeForn && !suppliers.includes(nomeForn)) {
            suppliers.push(nomeForn);
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
