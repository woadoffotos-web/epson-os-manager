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

// 2. Fornecedores
export async function getFornecedores() {
  const res = await fetchGestaoApi('/fornecedores?limite=100');
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
  // Buscar até 200 vendas do período
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
    // Buscar as 80 compras mais recentes
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
              // Se esta compra for mais recente do que a que já temos registrada
              if (dataEmissao > existing.dataUltimaCompra) {
                existing.dataUltimaCompra = dataEmissao;
                existing.quantidadeUltimaCompra = qtd;
                existing.valorUltimaCompra = valorCusto;
              }
              // Adiciona fornecedor na lista se ainda não estiver
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

// 5. Produtos do Gestão Click
export async function getProdutosGestao(limite = 100, pagina = 1) {
  const res = await fetchGestaoApi(`/produtos?limite=${limite}&pagina=${pagina}`);
  if (res.ok && res.data?.data) {
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
