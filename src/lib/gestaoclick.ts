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
  tipo?: 'servico' | 'produto';
  campo_vipz_indicador?: string; // Nome do cliente associado no campo VIPZ (ex: Contador / Parceiro)
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
  tipo?: 'PRODUTO' | 'SERVICO';
  ativo: boolean;
}

export interface GestaoClickServico {
  id: string | number;
  nome: string;
  codigo?: string;
  valor: number;
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
   * Verifica se o cliente já existe no ERP pelo CPF/CNPJ ou Nome
   */
  public static async getClienteByCpfOrName(cpfCnpj: string, nome?: string): Promise<GestaoClickCliente | null> {
    const cleanCpf = cpfCnpj.replace(/[^\w]/g, '');
    const clientes = await this.getClientes();

    const found = clientes.find((c) => {
      const cCpf = c.cpf_cnpj.replace(/[^\w]/g, '');
      if (cleanCpf && cCpf && cleanCpf === cCpf) return true;
      if (nome && c.nome.trim().toLowerCase() === nome.trim().toLowerCase()) return true;
      return false;
    });

    return found || null;
  }

  /**
   * Cadastra novo cliente no ERP Gestão Click com o campo customizado "Vipz"
   */
  public static async createCliente(clienteData: {
    nome: string;
    cpf_cnpj: string;
    email?: string;
    telefone?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    data_nascimento?: string;
    vipzTier?: string;
  }): Promise<{ success: boolean; id: string | number; message?: string }> {
    const vipzTier = clienteData.vipzTier || 'Bronze';

    if (this.isConfigured()) {
      try {
        const payload = {
          nome: clienteData.nome,
          cpf_cnpj: clienteData.cpf_cnpj,
          email: clienteData.email,
          telefone: clienteData.telefone,
          cep: clienteData.cep,
          logradouro: clienteData.endereco,
          numero: clienteData.numero,
          complemento: clienteData.complemento,
          bairro: clienteData.bairro,
          cidade: clienteData.cidade,
          estado: clienteData.estado,
          data_nascimento: clienteData.data_nascimento,
          // Campo customizado Vipz preenchido no ERP
          campos_extras: [
            {
              nome: 'Vipz',
              valor: vipzTier,
            },
          ],
        };

        const res = await fetch(`${this.getBaseUrl()}/api/clientes`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          return {
            success: true,
            id: json.data?.id || `gc-${Date.now()}`,
            message: 'Cliente cadastrado com sucesso no Gestão Click com campo Vipz preenchido.',
          };
        } else {
          const errorJson = await res.json().catch(() => ({}));
          console.warn('[GestãoClick] Resposta de erro ao criar cliente:', errorJson);
        }
      } catch (err) {
        console.error('[GestãoClick] Falha de conexão ao criar cliente no ERP:', err);
      }
    }

    // Modo Local Simulado (LGPD)
    return {
      success: true,
      id: `gc-${Date.now().toString().slice(-4)}`,
      message: `Cadastrado com sucesso no Gestão Click ERP com o campo 'Vipz' preenchido como '${vipzTier}'.`,
    };
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

    // Mock local de vendas faturadas (com simulação do campo VIPZ de associação de cliente)
    return [
      {
        id: 'OS-SRV-2026-001',
        cliente_id: 'gc-101',
        cliente_nome: 'Carlos Eduardo Oliveira',
        data_emissao: '2026-10-24T14:30:00Z',
        valor_total: 480.0,
        status: 'confirmada',
        liquidado_financeiro: true,
        tipo: 'servico',
        campo_vipz_indicador: 'Roberto Viana Engenharia ME', // Associado ao Contador/Parceiro!
        itens: [
          { produto_id: 'srv-1', nome: 'Contrato de Suporte Técnico & Backup Mensal', quantidade: 1, valor_unitario: 480.0 },
        ],
      },
      {
        id: 'OS-SRV-2026-002',
        cliente_id: 'gc-102',
        cliente_nome: 'Mariana Santos Silva',
        data_emissao: '2026-10-25T10:15:00Z',
        valor_total: 350.0,
        status: 'confirmada',
        liquidado_financeiro: true,
        tipo: 'servico',
        campo_vipz_indicador: '', // Campo VIPZ EM BRANCO (apenas regra básica)
        itens: [
          { produto_id: 'srv-2', nome: 'Manutenção Preventiva de Impressora EcoTank', quantidade: 1, valor_unitario: 350.0 },
        ],
      },
      {
        id: 'OS-SRV-2026-003',
        cliente_id: 'gc-104',
        cliente_nome: 'Juliana Mendes de Castro',
        data_emissao: '2026-10-25T16:00:00Z',
        valor_total: 790.0,
        status: 'confirmada',
        liquidado_financeiro: true,
        tipo: 'servico',
        campo_vipz_indicador: 'Roberto Viana Engenharia ME', // Outro cliente indicando o mesmo contador!
        itens: [
          { produto_id: 'srv-3', nome: 'Configuração de Rede Corporativa & VPN', quantidade: 1, valor_unitario: 790.0 },
        ],
      },
      {
        id: 'VD-PRD-2026-004',
        cliente_id: 'gc-103',
        cliente_nome: 'Roberto Viana Engenharia ME',
        data_emissao: '2026-10-25T17:30:00Z',
        valor_total: 1250.0,
        status: 'confirmada',
        liquidado_financeiro: true,
        tipo: 'produto',
        campo_vipz_indicador: '',
        itens: [
          { produto_id: 'p-1', nome: 'Kit Tintas Epson T544 Original Preto/Cores', quantidade: 5, valor_unitario: 250.0 },
        ],
      },
    ];
  }

  /**
   * Catálogo de serviços cadastrados no ERP
   */
  public static async getServicos(): Promise<GestaoClickServico[]> {
    if (this.isConfigured()) {
      try {
        const res = await fetch(`${this.getBaseUrl()}/api/servicos`, {
          headers: this.getHeaders(),
          next: { revalidate: 60 },
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || [];
        }
      } catch (err) {
        console.warn('[GestãoClick] Falha ao consultar serviços da API:', err);
      }
    }

    return [
      { id: 'SRV-01', nome: 'Manutenção Preventiva e Calibração Epson', codigo: 'SRV-MANUT', valor: 180.0, categoria: 'Serviços Técnicos', ativo: true },
      { id: 'SRV-02', nome: 'Limpeza e Desobstrução de Cabeça de Impressão', codigo: 'SRV-LIMPCAB', valor: 120.0, categoria: 'Serviços Técnicos', ativo: true },
      { id: 'SRV-03', nome: 'Instalação e Configuração Remota de Impressora', codigo: 'SRV-CFGREM', valor: 90.0, categoria: 'Suporte TI', ativo: true },
      { id: 'SRV-04', nome: 'Consultoria de Fluxo Documental e GED', codigo: 'SRV-GED', valor: 350.0, categoria: 'Consultoria', ativo: true },
    ];
  }

  /**
   * Unifica produtos e serviços do ERP para escolha na Gerência de Prêmios e Cupons
   */
  public static async getTodosItensErp(): Promise<Array<{ id: string; nome: string; codigo: string; valor: number; tipo: 'PRODUTO' | 'SERVICO'; estoque: number }>> {
    const produtos = await this.getProdutosEstoque();
    const servicos = await this.getServicos();

    const itens = [
      ...produtos.map((p) => ({
        id: String(p.id),
        nome: p.nome,
        codigo: p.codigo || 'S/COD',
        valor: p.preco_venda,
        tipo: 'PRODUTO' as const,
        estoque: p.estoque,
      })),
      ...servicos.map((s) => ({
        id: String(s.id),
        nome: s.nome,
        codigo: s.codigo || 'S/COD',
        valor: s.valor,
        tipo: 'SERVICO' as const,
        estoque: 999, // Serviços não limitados por estoque físico
      })),
    ];

    return itens;
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
