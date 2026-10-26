import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GestaoClickService } from '@/lib/gestaoclick';
import { logAuditAction } from '@/lib/audit';

// GET: Retorna dados gerais do Vipz Infoged (clientes, recompensas, configurações, estatísticas)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const action = searchParams.get('action');

    // Inicialização automática com dados de teste se o banco estiver vazio
    const customerCount = await prisma.vipzCustomer.count();
    if (customerCount === 0) {
      await initializeVipzData();
    }

    if (action === 'settings') {
      let settings = await prisma.vipzSettings.findUnique({ where: { id: 'default' } });
      if (!settings) {
        settings = await prisma.vipzSettings.create({
          data: { id: 'default' },
        });
      }
      return NextResponse.json(settings);
    }

    // Busca de clientes
    let customers;
    if (query) {
      customers = await prisma.vipzCustomer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { cpfCnpj: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
          redemptions: { include: { reward: true }, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { pointsBalance: 'desc' },
      });
    } else {
      customers = await prisma.vipzCustomer.findMany({
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 5 },
          redemptions: { include: { reward: true }, orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { pointsBalance: 'desc' },
        take: 50,
      });
    }

    // Catálogo de Prêmios
    const rewards = await prisma.vipzReward.findMany({
      where: { active: true },
      orderBy: { pointsCost: 'asc' },
    });

    // Configurações
    let settings = await prisma.vipzSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.vipzSettings.create({ data: { id: 'default' } });
    }

    // Vendas disponíveis no ERP (Gestão Click) para sincronização de pontos
    const erpSales = await GestaoClickService.getVendasConfirmadas();

    // Métricas gerais
    const totalPointsActive = customers.reduce((acc, c) => acc + c.pointsBalance, 0);
    const totalSpentGlobal = customers.reduce((acc, c) => acc + c.totalSpent, 0);
    const totalRedemptionsCount = await prisma.vipzRedemption.count();

    return NextResponse.json({
      customers,
      rewards,
      settings,
      erpSales,
      isErpOnline: GestaoClickService.isConfigured(),
      metrics: {
        totalCustomers: customers.length,
        totalPointsActive,
        totalSpentGlobal,
        totalRedemptionsCount,
      },
    });
  } catch (error: any) {
    console.error('Erro na rota /api/vipz:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do Vipz Infoged', details: error.message }, { status: 500 });
  }
}

// POST: Realiza ações (Crédito de Pontos por Venda, Resgate de Recompensa, Sincronização)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Resgate de Recompensa
    if (action === 'REDEEM') {
      const { customerId, rewardId, userName } = body;

      const customer = await prisma.vipzCustomer.findUnique({ where: { id: customerId } });
      const reward = await prisma.vipzReward.findUnique({ where: { id: rewardId } });

      if (!customer || !reward) {
        return NextResponse.json({ error: 'Cliente ou Recompensa não localizados' }, { status: 404 });
      }

      if (reward.stock <= 0) {
        return NextResponse.json({ error: 'Recompensa sem estoque disponível no momento' }, { status: 400 });
      }

      if (customer.pointsBalance < reward.pointsCost) {
        return NextResponse.json({
          error: `Saldo insuficiente! O cliente possui ${customer.pointsBalance} pontos e o prêmio requer ${reward.pointsCost} pontos.`,
        }, { status: 400 });
      }

      // Código único de voucher
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const voucherCode = `VIPZ-${Date.now().toString().slice(-4)}${randomSuffix}`;

      // Transação atômica no banco
      const result = await prisma.$transaction(async (tx) => {
        // Reduz saldo do cliente
        const updatedCustomer = await tx.vipzCustomer.update({
          where: { id: customerId },
          data: {
            pointsBalance: { decrement: reward.pointsCost },
            totalPointsRedeemed: { increment: reward.pointsCost },
          },
        });

        // Abate estoque
        const updatedReward = await tx.vipzReward.update({
          where: { id: rewardId },
          data: { stock: { decrement: 1 } },
        });

        // Cria registro de resgate com Voucher
        const redemption = await tx.vipzRedemption.create({
          data: {
            customerId,
            rewardId,
            pointsSpent: reward.pointsCost,
            voucherCode,
            status: 'EMITIDO',
          },
        });

        // Cria transação no extrato
        await tx.vipzTransaction.create({
          data: {
            customerId,
            type: 'REDEMPTION',
            points: -reward.pointsCost,
            description: `Resgate do prêmio: ${reward.title} (Voucher ${voucherCode})`,
          },
        });

        return { updatedCustomer, updatedReward, redemption };
      });

      await logAuditAction({
        userId: customerId,
        userName: userName || 'Atendente INFOGED',
        action: 'UPDATE',
        entity: 'VipzRedemption',
        entityId: result.redemption.id,
        details: `Resgate de '${reward.title}' por ${reward.pointsCost} pontos para ${customer.name}. Voucher: ${voucherCode}`,
      });

      return NextResponse.json({
        success: true,
        message: 'Resgate realizado com sucesso!',
        voucherCode,
        redemption: result.redemption,
        newBalance: result.updatedCustomer.pointsBalance,
      });
    }

    // 2. Crédito de Pontos por Venda Confirmada
    if (action === 'CREDIT_SALE') {
      const { customerId, saleValue, erpSaleId, description, userName } = body;

      const customer = await prisma.vipzCustomer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return NextResponse.json({ error: 'Cliente não localizado' }, { status: 404 });
      }

      const settings = await prisma.vipzSettings.findUnique({ where: { id: 'default' } });
      const pointsPerReal = settings?.pointsPerReal || 1.0;

      // Multiplicador por nível
      let multiplier = 1.0;
      if (customer.tier === 'PRATA') multiplier = settings?.silverMultiplier || 1.2;
      if (customer.tier === 'OURO') multiplier = settings?.goldMultiplier || 1.5;
      if (customer.tier === 'VIPZ_BLACK') multiplier = settings?.blackMultiplier || 2.0;

      const calculatedPoints = Math.round(Number(saleValue) * pointsPerReal * multiplier);

      const result = await prisma.$transaction(async (tx) => {
        const newTotalAccumulated = customer.totalPointsAccumulated + calculatedPoints;
        const newTotalSpent = customer.totalSpent + Number(saleValue);

        // Recalcular Categoria/Tier
        let newTier = customer.tier;
        const silverThreshold = settings?.silverThreshold || 1000;
        const goldThreshold = settings?.goldThreshold || 3000;
        const blackThreshold = settings?.blackThreshold || 7000;

        if (newTotalAccumulated >= blackThreshold) newTier = 'VIPZ_BLACK';
        else if (newTotalAccumulated >= goldThreshold) newTier = 'OURO';
        else if (newTotalAccumulated >= silverThreshold) newTier = 'PRATA';
        else newTier = 'BRONZE';

        const updatedCustomer = await tx.vipzCustomer.update({
          where: { id: customerId },
          data: {
            pointsBalance: { increment: calculatedPoints },
            totalPointsAccumulated: { increment: calculatedPoints },
            totalSpent: newTotalSpent,
            tier: newTier,
          },
        });

        const transaction = await tx.vipzTransaction.create({
          data: {
            customerId,
            type: 'PURCHASE',
            points: calculatedPoints,
            saleValue: Number(saleValue),
            erpSaleId: erpSaleId || `VD-LOCAL-${Date.now().toString().slice(-4)}`,
            description: description || `Venda confirmada no financeiro ERP: R$ ${Number(saleValue).toFixed(2)}`,
          },
        });

        return { updatedCustomer, transaction };
      });

      await logAuditAction({
        userId: customerId,
        userName: userName || 'Atendente INFOGED',
        action: 'UPDATE',
        entity: 'VipzCustomer',
        entityId: customerId,
        details: `Crédito de ${calculatedPoints} pontos (R$ ${Number(saleValue).toFixed(2)}) para ${customer.name}. Novo saldo: ${result.updatedCustomer.pointsBalance}`,
      });

      return NextResponse.json({
        success: true,
        message: 'Pontos creditados com sucesso!',
        pointsEarned: calculatedPoints,
        newBalance: result.updatedCustomer.pointsBalance,
        newTier: result.updatedCustomer.tier,
      });
    }

    // 3. Cadastrar ou Sincronizar Cliente Manualmente
    if (action === 'CREATE_CUSTOMER') {
      const { name, cpfCnpj, email, phone, notes } = body;

      if (!name || !cpfCnpj) {
        return NextResponse.json({ error: 'Nome e CPF/CNPJ são obrigatórios' }, { status: 400 });
      }

      const existing = await prisma.vipzCustomer.findUnique({ where: { cpfCnpj } });
      if (existing) {
        return NextResponse.json({ error: 'Já existe um cliente cadastrado com este CPF/CNPJ' }, { status: 400 });
      }

      const newCustomer = await prisma.vipzCustomer.create({
        data: {
          name,
          cpfCnpj,
          email,
          phone,
          notes,
          pointsBalance: 100, // Bônus de boas-vindas
          totalPointsAccumulated: 100,
          tier: 'BRONZE',
          transactions: {
            create: {
              type: 'BONUS',
              points: 100,
              description: 'Bônus de boas-vindas ao Vipz Infoged',
            },
          },
        },
      });

      return NextResponse.json({ success: true, customer: newCustomer });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no POST /api/vipz:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação', details: error.message }, { status: 500 });
  }
}

// Inicializador de dados de demonstração realistas
async function initializeVipzData() {
  try {
    // 1. Configurações
    await prisma.vipzSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        pointsPerReal: 1.0,
        pointsValidityDays: 365,
        silverThreshold: 1000,
        goldThreshold: 3000,
        blackThreshold: 7000,
        silverMultiplier: 1.2,
        goldMultiplier: 1.5,
        blackMultiplier: 2.0,
      },
    });

    // 2. Prêmios Iniciais
    const rewardsData = [
      {
        title: 'Garrafa Térmica INFOGED Inox 650ml',
        description: 'Garrafa esportiva de alta resistência com acabamento fosco e gravação a laser.',
        category: 'Brindes Vipz',
        pointsCost: 450,
        stock: 24,
        imageUrl: '/rewards/thermos.png',
      },
      {
        title: 'Cabo USB-C Trançado Blindado 2m',
        description: 'Cabo reforçado de nylon trançado com transferência ultra-rápida de 100W.',
        category: 'Acessórios',
        pointsCost: 280,
        stock: 35,
        imageUrl: '/rewards/cable.png',
      },
      {
        title: 'Desconto de R$ 50 na Próxima Manutenção',
        description: 'Voucher válido para aplicação imediata na ordem de serviço ou reparo técnico.',
        category: 'Cupons & Descontos',
        pointsCost: 500,
        stock: 100,
        imageUrl: '/rewards/coupon50.png',
      },
      {
        title: 'Kit Limpeza de Cabeça de Impressão Especial',
        description: 'Fluido desentupidor e swabs de precisão para manutenção periódica.',
        category: 'Insumos',
        pointsCost: 420,
        stock: 18,
        imageUrl: '/rewards/kit.png',
      },
      {
        title: 'Power Bank 10.000mAh Carregamento Rápido',
        description: 'Bateria portátil bivolt com display de carga e 2 portas USB-C.',
        category: 'Tecnologia',
        pointsCost: 1100,
        stock: 12,
        imageUrl: '/rewards/powerbank.png',
      },
      {
        title: 'Desconto de R$ 100 em Nova Multifuncional',
        description: 'Voucher exclusivo para aquisição de equipamentos Epson EcoTank.',
        category: 'Cupons & Descontos',
        pointsCost: 1000,
        stock: 20,
        imageUrl: '/rewards/coupon100.png',
      },
    ];

    for (const r of rewardsData) {
      await prisma.vipzReward.create({ data: r });
    }

    // 3. Clientes Iniciais
    const customersData = [
      {
        name: 'Carlos Eduardo Oliveira',
        cpfCnpj: '382.491.820-44',
        email: 'carlos.oliveira@infoged.com.br',
        phone: '(81) 98822-1044',
        pointsBalance: 1450,
        totalPointsAccumulated: 1750,
        totalPointsRedeemed: 300,
        totalSpent: 1680.0,
        tier: 'PRATA',
        transactions: [
          { type: 'PURCHASE', points: 450, saleValue: 450.0, description: 'Venda confirmada: Tintas Epson T544' },
          { type: 'PURCHASE', points: 1200, saleValue: 1000.0, description: 'Venda confirmada: Manutenção Scanner + Peças' },
          { type: 'BONUS', points: 100, description: 'Bônus de boas-vindas Vipz' },
        ],
      },
      {
        name: 'Mariana Santos Silva',
        cpfCnpj: '719.302.845-12',
        email: 'mariana.silva@techdoc.com.br',
        phone: '(81) 99144-8899',
        pointsBalance: 3820,
        totalPointsAccumulated: 3820,
        totalPointsRedeemed: 0,
        totalSpent: 3450.0,
        tier: 'OURO',
        transactions: [
          { type: 'PURCHASE', points: 1920, saleValue: 1280.0, description: 'Venda confirmada: Impressora EcoTank L3250' },
          { type: 'PURCHASE', points: 1800, saleValue: 1200.0, description: 'Venda confirmada: Insumos de Impressão' },
          { type: 'BONUS', points: 100, description: 'Bônus de boas-vindas Vipz' },
        ],
      },
      {
        name: 'Roberto Viana Engenharia ME',
        cpfCnpj: '12.456.789/0001-99',
        email: 'contato@vianaengenharia.com.br',
        phone: '(81) 3421-5000',
        pointsBalance: 8600,
        totalPointsAccumulated: 8600,
        totalPointsRedeemed: 0,
        totalSpent: 6800.0,
        tier: 'VIPZ_BLACK',
        transactions: [
          { type: 'PURCHASE', points: 6800, saleValue: 3400.0, description: 'Venda confirmada: Suprimentos Plotter T3170' },
          { type: 'PURCHASE', points: 1700, saleValue: 850.0, description: 'Venda confirmada: Bobinas de Papel Engenharia' },
          { type: 'BONUS', points: 100, description: 'Bônus de boas-vindas Vipz' },
        ],
      },
    ];

    for (const c of customersData) {
      const { transactions, ...custData } = c;
      const created = await prisma.vipzCustomer.create({ data: custData });
      for (const t of transactions) {
        await prisma.vipzTransaction.create({
          data: {
            customerId: created.id,
            ...t,
          },
        });
      }
    }
  } catch (err) {
    console.error('Erro ao inicializar dados padrão do Vipz:', err);
  }
}
