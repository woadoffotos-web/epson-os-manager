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

  let vendas = res.data.data;

  // Se houver mais de uma página, buscar página 2
  if (res.data?.meta?.total_paginas > 1) {
    try {
      const p2 = await fetchGestaoApi(`/vendas?data_inicio=${dataInicio}&data_fim=${dataFim}&limite=100&pagina=2`);
      if (p2.ok && p2.data?.data) {
        vendas = vendas.concat(p2.data.data);
      }
    } catch (e) {
      console.error('Erro ao buscar pág 2 de vendas:', e);
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

// 5. Cache e Detalhes de Produtos (para sempre trazer codigo_interno e nome_grupo reais)
const productDetailsCache = new Map<string, {
  id: string;
  codigo_interno: string;
  codigo_barra: string;
  nome: string;
  grupo_id: string;
  nome_grupo: string;
  estoque: number;
  valor_custo: number;
}>();

export async function getProductDetails(produtoId: string) {
  const cached = productDetailsCache.get(String(produtoId));
  if (cached) return cached;

  try {
    const res = await fetchGestaoApi(`/produtos/${produtoId}`);
    if (res.ok && res.data?.data) {
      const p = res.data.data;
      const details = {
        id: String(p.id),
        codigo_interno: p.codigo_interno || String(p.id),
        codigo_barra: p.codigo_barra || '',
        nome: p.nome || '',
        grupo_id: String(p.grupo_id || ''),
        nome_grupo: p.nome_grupo || 'Diversos',
        estoque: parseFloat(p.estoque) || 0,
        valor_custo: parseFloat(p.valor_custo) || 0,
      };
      productDetailsCache.set(String(produtoId), details);
      return details;
    }
  } catch (e) {
    console.error(`Erro ao buscar produto ${produtoId}:`, e);
  }

  return null;
}

// Busca em lote de detalhes de produtos para evitar gargalo
export async function getProductDetailsBatch(produtoIds: string[]) {
  const result = new Map<string, any>();
  const toFetch: string[] = [];

  for (const id of produtoIds) {
    const cached = productDetailsCache.get(String(id));
    if (cached) {
      result.set(String(id), cached);
    } else {
      toFetch.push(String(id));
    }
  }

  // Buscar em blocos de até 12 requisições paralelas
  const chunkSize = 12;
  for (let i = 0; i < toFetch.length; i += chunkSize) {
    const chunk = toFetch.slice(i, i + chunkSize);
    const promises = chunk.map(async (id) => {
      const details = await getProductDetails(id);
      if (details) result.set(id, details);
    });
    await Promise.all(promises);
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
