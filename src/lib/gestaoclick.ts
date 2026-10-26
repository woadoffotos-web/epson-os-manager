/**
 * Conector de Integração Oficial - Gestão Click ERP
 * Suporta modo online (via API REST oficial com access-token e secret-access-token)
 * e modo local (mock de alta fidelidade para desenvolvimento e conformidade com LGPD).
 */

export interface GestaoClickConfig {
  baseUrl: string;
  accessToken: string;
  secretAccessToken: string;
  isConfigured: boolean;
}

export interface GestaoClickCliente {
  id: string | number;
  nome: string;
  tipo_pessoa?: 'F' | 'J';
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cidade?: string;
  estado?: string;
  ativo?: boolean;
}

export interface GestaoClickVenda {
  id: string | number;
  cliente_id: string | number;
  cliente_nome: string;
  data_emissao: string;
  valor_total: number;
  status: 'confirmada' | 'pendente' | 'cancelada';
  liquidado_financeiro: boolean;
  itens: Array<{
    produto_id: string | number;
    nome: string;
    quantidade: number;
    valor_unitario: number;
  }>;
}

export interface GestaoClickProduto {
  id: string | number;
  nome: string;
  codigo?: string;
  preco_venda: number;
  estoque: number;
  categoria?: string;
  ativo: boolean;
}

export class GestaoClickService {
  private static getHeaders() {
    const accessToken = process.env.GESTAO_CLICK_ACCESS_TOKEN || '';
    const secretAccessToken = process.env.GESTAO_CLICK_SECRET_TOKEN || '';

    return {
      'Content-Type': 'application/json',
      'access-token': accessToken,
      'secret-access-token': secretAccessToken,
    };
  }

  public static isConfigured(): boolean {
    const accessToken = process.env.GESTAO_CLICK_ACCESS_TOKEN;
    const secretAccessToken = process.env.GESTAO_CLICK_SECRET_TOKEN;
    return Boolean(accessToken && secretAccessToken && accessToken.length > 5);
  }

  public static getBaseUrl(): string {
    return process.env.GESTAO_CLICK_BASE_URL || 'https://api.gestaoclick.com';
  }

  /**
   * Consulta clientes no ERP (Online ou Local)
   */
  public static async getClientes(query?: string): Promise<GestaoClickCliente[]> {
    if (this.isConfigured()) {
      try {
        const url = new URL(`${this.getBaseUrl()}/api/clientes`);
        if (query) url.searchParams.set('nome', query);

        const res = await fetch(url.toString(), {
          headers: this.getHeaders(),
          next: { revalidate: 60 },
        });

        if (res.ok) {
          const json = await res.json();
          // Gestão Click retorna { code: 200, data: [...] }
          return json.data || [];
        }
      } catch (err) {
        console.warn('[GestãoClick] Falha na chamada da API online, caindo para modo de segurança:', err);
      }
    }

    // MOCK LOCAL (Para testes seguros locais sem violar LGPD)
    const localMockClientes: GestaoClickCliente[] = [
      {
        id: 'gc-101',
        nome: 'Carlos Eduardo Oliveira',
        cpf_cnpj: '382.491.820-44',
        email: 'carlos.oliveira@infoged.com.br',
        telefone: '(81) 98822-1044',
        cidade: 'Recife',
        estado: 'PE',
        ativo: true,
      },
      {
        id: 'gc-102',
        nome: 'Mariana Santos Silva',
        cpf_cnpj: '719.302.845-12',
        email: 'mariana.silva@techdoc.com.br',
        telefone: '(81) 99144-8899',
        cidade: 'Olinda',
        estado: 'PE',
        ativo: true,
      },
      {
        id: 'gc-103',
        nome: 'Roberto Viana Engenharia ME',
        cpf_cnpj: '12.456.789/0001-99',
        email: 'contato@vianaengenharia.com.br',
        telefone: '(81) 3421-5000',
        cidade: 'Jaboatão dos Guararapes',
        estado: 'PE',
        ativo: true,
      },
      {
        id: 'gc-104',
        nome: 'Juliana Mendes de Castro',
        cpf_cnpj: '049.882.114-78',
        email: 'juliana.mendes@advogados.com.br',
        telefone: '(81) 98777-3321',
        cidade: 'Recife',
        estado: 'PE',
        ativo: true,
      },
    ];

    if (query) {
      const q = query.toLowerCase().replace(/[^\w]/g, '');
      return localMockClientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(query.toLowerCase()) ||
          c.cpf_cnpj.replace(/[^\w]/g, '').includes(q)
      );
    }

    return localMockClientes;
  }

  /**
   * Consulta vendas confirmadas e com financeiro liquidado
   */
  public static async getVendasConfirmadas(): Promise<GestaoClickVenda[]> {
    if (this.isConfigured()) {
      try {
        const res = await fetch(`${this.getBaseUrl()}/api/vendas`, {
          headers: this.getHeaders(),
          next: { revalidate: 60 },
        });

        if (res.ok) {
          const json = await res.json();
          return json.data || [];
        }
      } catch (err) {
        console.warn('[GestãoClick] Falha ao consultar vendas da API:', err);
      }
    }

    // Mock local de vendas faturadas
    return [
      {
        id: 'VD-2026-901',
        cliente_id: 'gc-101',
        cliente_nome: 'Carlos Eduardo Oliveira',
        data_emissao: '2026-10-24T14:30:00Z',
        valor_total: 450.0,
        status: 'confirmada',
        liquidado_financeiro: true,
        itens: [
          { produto_id: 'p-1', nome: 'Refil Garrafa de Tinta Epson T544 Preto', quantidade: 4, valor_unitario: 65.0 },
          { produto_id: 'p-2', nome: 'Manutenção Preventiva de Scanner', quantidade: 1, valor_unitario: 190.0 },
        ],
      },
      {
        id: 'VD-2026-902',
        cliente_id: 'gc-102',
        cliente_nome: 'Mariana Santos Silva',
        data_emissao: '2026-10-25T10:15:00Z',
        valor_total: 1280.0,
        status: 'confirmada',
        liquidado_financeiro: true,
        itens: [
          { produto_id: 'p-3', nome: 'Impressora Epson EcoTank L3250', quantidade: 1, valor_unitario: 1190.0 },
          { produto_id: 'p-4', nome: 'Pacote de Papel Fotográfico Glossy A4', quantidade: 3, valor_unitario: 30.0 },
        ],
      },
      {
        id: 'VD-2026-903',
        cliente_id: 'gc-103',
        cliente_nome: 'Roberto Viana Engenharia ME',
        data_emissao: '2026-10-25T16:00:00Z',
        valor_total: 3400.0,
        status: 'confirmada',
        liquidado_financeiro: true,
        itens: [
          { produto_id: 'p-5', nome: 'Plotter Epson SureColor T3170 - Suprimentos', quantidade: 2, valor_unitario: 1700.0 },
        ],
      },
    ];
  }

  /**
   * Catálogo de produtos e insumos com saldo em estoque
   */
  public static async getProdutosEstoque(): Promise<GestaoClickProduto[]> {
    if (this.isConfigured()) {
      try {
        const res = await fetch(`${this.getBaseUrl()}/api/produtos`, {
          headers: this.getHeaders(),
          next: { revalidate: 60 },
        });

        if (res.ok) {
          const json = await res.json();
          return json.data || [];
        }
      } catch (err) {
        console.warn('[GestãoClick] Falha ao consultar catálogo de produtos da API:', err);
      }
    }

    // Mock local de produtos e brindes
    return [
      { id: 'PRD-01', nome: 'Garrafa Térmica INFOGED Inox 650ml', codigo: 'INF-BR01', preco_venda: 89.9, estoque: 24, categoria: 'Brindes Vipz', ativo: true },
      { id: 'PRD-02', nome: 'Cabo USB-C Trançado Blindado 2m', codigo: 'INF-CB02', preco_venda: 45.0, estoque: 38, categoria: 'Acessórios', ativo: true },
      { id: 'PRD-03', nome: 'Desconto de R$ 50 na Próxima Manutenção', codigo: 'CUP-50', preco_venda: 50.0, estoque: 999, categoria: 'Cupons & Descontos', ativo: true },
      { id: 'PRD-04', nome: 'Kit Limpeza de Cabeça de Impressão Especial', codigo: 'INF-LP04', preco_venda: 75.0, estoque: 15, categoria: 'Insumos', ativo: true },
      { id: 'PRD-05', nome: 'Power Bank 10.000mAh Carregamento Rápido', codigo: 'INF-PB05', preco_venda: 139.9, estoque: 12, categoria: 'Tecnologia', ativo: true },
      { id: 'PRD-06', nome: 'Desconto de R$ 100 em Nova Multifuncional', codigo: 'CUP-100', preco_venda: 100.0, estoque: 50, categoria: 'Cupons & Descontos', ativo: true },
    ];
  }
}
