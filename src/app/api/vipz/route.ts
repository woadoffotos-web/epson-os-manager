import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GestaoClickService } from '@/lib/gestaoclick';
import { logAuditAction } from '@/lib/audit';

// GET: Retorna dados gerais do Vipz Infoged (clientes, regras de pontuação, recompensas, configurações, estatísticas)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const action = searchParams.get('action');

    // Inicialização automática com dados de teste se o banco estiver vazio
    const customerCount = await prisma.vipzCustomer.count();
    const rulesCount = await prisma.vipzRule.count();
    if (customerCount === 0 || rulesCount === 0) {
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

    // Regras de Pontuação da Gerência
    const rules = await prisma.vipzRule.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Catálogo de Prêmios
    const rewards = await prisma.vipzReward.findMany({
      orderBy: { pointsCost: 'asc' },
    });

    // Configurações gerais
    let settings = await prisma.vipzSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.vipzSettings.create({ data: { id: 'default' } });
    }

    // Vendas disponíveis no ERP (Gestão Click) com campo VIPZ
    const erpSales = await GestaoClickService.getVendasConfirmadas();

    // Produtos e Serviços disponíveis no ERP para seleção na Gerência
    const erpItems = await GestaoClickService.getTodosItensErp();

    // Métricas gerais
    const totalPointsActive = customers.reduce((acc, c) => acc + c.pointsBalance, 0);
    const totalSpentGlobal = customers.reduce((acc, c) => acc + c.totalSpent, 0);
    const totalRedemptionsCount = await prisma.vipzRedemption.count();

    return NextResponse.json({
      customers,
      rules,
      rewards,
      settings,
      erpSales,
      erpItems,
      isErpOnline: GestaoClickService.isConfigured(),
      metrics: {
        totalCustomers: customers.length,
        totalPointsActive,
        totalSpentGlobal,
        totalRedemptionsCount,
        totalRules: rules.length,
        totalRewards: rewards.length,
      },
    });
  } catch (error: any) {
    console.error('Erro na rota /api/vipz:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do Vipz Infoged', details: error.message }, { status: 500 });
  }
}

// POST: Realiza ações (Crédito de Pontos, Resgate, CRUD Regras, CRUD Prêmios)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ==============================================================
    // 1. GERÊNCIA: REGRAS DE PONTUAÇÃO (CRIAR, EDITAR, EXCLUIR)
    // ==============================================================
    if (action === 'CREATE_RULE') {
      const { name, code, type, description, pointsPerReal, fixedPoints, minSaleValue, targetTier } = body;

      if (!name || !code) {
        return NextResponse.json({ error: 'Nome e Código identificador da regra são obrigatórios' }, { status: 400 });
      }

      const existing = await prisma.vipzRule.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json({ error: `Já existe uma regra cadastrada com o código '${code}'` }, { status: 400 });
      }

      const newRule = await prisma.vipzRule.create({
        data: {
          name,
          code: code.toUpperCase().replace(/\s+/g, '_'),
          type: type || 'CUSTOM',
          description: description || null,
          pointsPerReal: pointsPerReal ? parseFloat(pointsPerReal) : 1.0,
          fixedPoints: fixedPoints ? parseInt(fixedPoints) : 0,
          minSaleValue: minSaleValue ? parseFloat(minSaleValue) : 0.0,
          targetTier: targetTier || 'TODOS',
          active: true,
        },
      });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'CREATE',
        entity: 'VipzRule',
        entityId: newRule.id,
        details: `Criada regra de pontuação '${name}' (${newRule.code})`,
      });

      return NextResponse.json({ success: true, rule: newRule });
    }

    if (action === 'UPDATE_RULE') {
      const { id, name, description, pointsPerReal, fixedPoints, minSaleValue, targetTier, active } = body;

      const updatedRule = await prisma.vipzRule.update({
        where: { id },
        data: {
          name,
          description,
          pointsPerReal: pointsPerReal !== undefined ? parseFloat(pointsPerReal) : undefined,
          fixedPoints: fixedPoints !== undefined ? parseInt(fixedPoints) : undefined,
          minSaleValue: minSaleValue !== undefined ? parseFloat(minSaleValue) : undefined,
          targetTier,
          active: active !== undefined ? Boolean(active) : undefined,
        },
      });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'UPDATE',
        entity: 'VipzRule',
        entityId: id,
        details: `Atualizada regra de pontuação '${updatedRule.name}'`,
      });

      return NextResponse.json({ success: true, rule: updatedRule });
    }

    if (action === 'DELETE_RULE') {
      const { id } = body;

      const rule = await prisma.vipzRule.findUnique({ where: { id } });
      if (!rule) {
        return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 });
      }

      if (rule.code === 'BASICA' || rule.code === 'CONTADORES') {
        return NextResponse.json({
          error: `As regras fundamentais '${rule.name}' não podem ser excluídas, mas podem ser editadas ou desativadas.`,
        }, { status: 400 });
      }

      await prisma.vipzRule.delete({ where: { id } });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'DELETE',
        entity: 'VipzRule',
        entityId: id,
        details: `Excluída regra de pontuação '${rule.name}'`,
      });

      return NextResponse.json({ success: true });
    }

    // ==============================================================
    // 2. GERÊNCIA: PRÊMIOS & CUPONS (CRIAR COM ERP, EDITAR, EXCLUIR)
    // ==============================================================
    if (action === 'CREATE_REWARD') {
      const {
        title,
        description,
        category,
        pointsCost,
        stock,
        erpItemId,
        erpItemType,
        erpItemCode,
        originalPrice,
        rewardType,
        discountValue,
        validityDays,
        termsOfUse,
      } = body;

      if (!title || !pointsCost) {
        return NextResponse.json({ error: 'Título e Custo em Pontos são obrigatórios' }, { status: 400 });
      }

      const newReward = await prisma.vipzReward.create({
        data: {
          title,
          description: description || null,
          category: category || (rewardType === 'SERVICO' ? 'Serviços Cortesia' : 'Brindes Vipz'),
          pointsCost: parseInt(pointsCost),
          stock: stock !== undefined ? parseInt(stock) : 10,
          erpItemId: erpItemId || null,
          erpItemType: erpItemType || 'PRODUTO',
          erpItemCode: erpItemCode || null,
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          rewardType: rewardType || 'PRODUTO',
          discountValue: discountValue ? parseFloat(discountValue) : null,
          validityDays: validityDays ? parseInt(validityDays) : 30,
          termsOfUse: termsOfUse || null,
          active: true,
        },
      });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'CREATE',
        entity: 'VipzReward',
        entityId: newReward.id,
        details: `Criado prêmio/cupom '${title}' por ${pointsCost} pts`,
      });

      return NextResponse.json({ success: true, reward: newReward });
    }

    if (action === 'UPDATE_REWARD') {
      const { id, title, description, category, pointsCost, stock, active, validityDays, termsOfUse } = body;

      const updatedReward = await prisma.vipzReward.update({
        where: { id },
        data: {
          title,
          description,
          category,
          pointsCost: pointsCost !== undefined ? parseInt(pointsCost) : undefined,
          stock: stock !== undefined ? parseInt(stock) : undefined,
          active: active !== undefined ? Boolean(active) : undefined,
          validityDays: validityDays !== undefined ? parseInt(validityDays) : undefined,
          termsOfUse,
        },
      });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'UPDATE',
        entity: 'VipzReward',
        entityId: id,
        details: `Atualizado prêmio/cupom '${updatedReward.title}'`,
      });

      return NextResponse.json({ success: true, reward: updatedReward });
    }

    if (action === 'DELETE_REWARD') {
      const { id } = body;
      const reward = await prisma.vipzReward.findUnique({ where: { id } });
      if (!reward) return NextResponse.json({ error: 'Prêmio não encontrado' }, { status: 404 });

      await prisma.vipzReward.delete({ where: { id } });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'DELETE',
        entity: 'VipzReward',
        entityId: id,
        details: `Excluído prêmio/cupom '${reward.title}'`,
      });

      return NextResponse.json({ success: true });
    }

    // ==============================================================
    // 3. OPERAÇÃO: CRÉDITO DE PONTOS COM REGRA BÁSICA & CONTADORES
    // ==============================================================
    if (action === 'CREDIT_SALE') {
      const { customerId, saleValue, erpSaleId, description, campoVipzIndicador, userName } = body;

      const customer = await prisma.vipzCustomer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return NextResponse.json({ error: 'Cliente titular da venda não localizado' }, { status: 404 });
      }

      // Buscar regras ativas no banco
      const basicRule = await prisma.vipzRule.findFirst({ where: { code: 'BASICA', active: true } });
      const contadorRule = await prisma.vipzRule.findFirst({ where: { code: 'CONTADORES', active: true } });

      // Configurações de multiplicadores por categoria do cliente titular
      const settings = await prisma.vipzSettings.findUnique({ where: { id: 'default' } });
      let buyerMultiplier = 1.0;
      if (customer.tier === 'PRATA') buyerMultiplier = settings?.silverMultiplier || 1.2;
      if (customer.tier === 'OURO') buyerMultiplier = settings?.goldMultiplier || 1.5;
      if (customer.tier === 'VIPZ_BLACK') buyerMultiplier = settings?.blackMultiplier || 2.0;

      // Cálculo dos pontos do comprador (REGRA BÁSICA)
      const basicRatio = basicRule?.pointsPerReal || 1.0;
      const buyerPoints = Math.round(Number(saleValue) * basicRatio * buyerMultiplier) + (basicRule?.fixedPoints || 0);

      // Transação para o titular da venda
      let partnerResult: any = null;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Atualiza cliente da venda
        const newTotalAccumulated = customer.totalPointsAccumulated + buyerPoints;
        const newTotalSpent = customer.totalSpent + Number(saleValue);

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
            pointsBalance: { increment: buyerPoints },
            totalPointsAccumulated: { increment: buyerPoints },
            totalSpent: newTotalSpent,
            tier: newTier,
          },
        });

        await tx.vipzTransaction.create({
          data: {
            customerId,
            type: 'PURCHASE',
            points: buyerPoints,
            saleValue: Number(saleValue),
            erpSaleId: erpSaleId || `VD-${Date.now().toString().slice(-4)}`,
            description: `${description || 'Venda de serviço confirmada'} (Regra Básica)`,
          },
        });

        // 2. Se houver cliente no campo VIPZ (REGRA CONTADORES)
        if (campoVipzIndicador && campoVipzIndicador.trim()) {
          const partnerName = campoVipzIndicador.trim();

          // Localiza o parceiro/contador pelo nome no banco
          let partner = await tx.vipzCustomer.findFirst({
            where: { name: { contains: partnerName, mode: 'insensitive' } },
          });

          // Se não existir, cadastra automaticamente o parceiro
          if (!partner) {
            partner = await tx.vipzCustomer.create({
              data: {
                name: partnerName,
                cpfCnpj: `CONT-${Math.random().toString().slice(2, 10)}`,
                pointsBalance: 0,
                tier: 'BRONZE',
                notes: 'Cadastrado automaticamente via indicação no campo VIPZ',
              },
            });
          }

          // Cálculo dos pontos do contador/parceiro (REGRA CONTADORES)
          const contadorRatio = contadorRule?.pointsPerReal || 0.5;
          const partnerPoints = Math.round(Number(saleValue) * contadorRatio) + (contadorRule?.fixedPoints || 0);

          const updatedPartner = await tx.vipzCustomer.update({
            where: { id: partner.id },
            data: {
              pointsBalance: { increment: partnerPoints },
              totalPointsAccumulated: { increment: partnerPoints },
            },
          });

          const partnerTx = await tx.vipzTransaction.create({
            data: {
              customerId: partner.id,
              type: 'BONUS',
              points: partnerPoints,
              saleValue: Number(saleValue),
              erpSaleId: erpSaleId || `VD-${Date.now().toString().slice(-4)}`,
              description: `Pontuação Contadores ref. a venda do cliente ${customer.name}`,
            },
          });

          partnerResult = {
            partnerName: partner.name,
            pointsEarned: partnerPoints,
            newBalance: updatedPartner.pointsBalance,
          };
        }

        return { updatedCustomer, partnerResult };
      });

      await logAuditAction({
        userId: customerId,
        userName: userName || 'Atendente INFOGED',
        action: 'UPDATE',
        entity: 'VipzCustomer',
        entityId: customerId,
        details: `Venda faturada R$ ${Number(saleValue).toFixed(2)}. Titular (${customer.name}) recebeu +${buyerPoints} pts.${
          partnerResult ? ` Contador/Parceiro (${partnerResult.partnerName}) recebeu +${partnerResult.pointsEarned} pts.` : ''
        }`,
      });

      return NextResponse.json({
        success: true,
        message: 'Pontuação computada com sucesso!',
        buyerPoints,
        buyerNewBalance: result.updatedCustomer.pointsBalance,
        partnerResult,
      });
    }

    // ==============================================================
    // 4. OPERAÇÃO: RESGATE DE RECOMPENSA
    // ==============================================================
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

      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const voucherCode = `VIPZ-${Date.now().toString().slice(-4)}${randomSuffix}`;

      const result = await prisma.$transaction(async (tx) => {
        const updatedCustomer = await tx.vipzCustomer.update({
          where: { id: customerId },
          data: {
            pointsBalance: { decrement: reward.pointsCost },
            totalPointsRedeemed: { increment: reward.pointsCost },
          },
        });

        const updatedReward = await tx.vipzReward.update({
          where: { id: rewardId },
          data: { stock: { decrement: 1 } },
        });

        const redemption = await tx.vipzRedemption.create({
          data: {
            customerId,
            rewardId,
            pointsSpent: reward.pointsCost,
            voucherCode,
            status: 'EMITIDO',
          },
        });

        await tx.vipzTransaction.create({
          data: {
            customerId,
            type: 'REDEMPTION',
            points: -reward.pointsCost,
            description: `Resgate: ${reward.title} (Voucher ${voucherCode})`,
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

    // ==============================================================
    // 5. OPERAÇÃO: CADASTRO DE CLIENTE
    // ==============================================================
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
          pointsBalance: 100,
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

// Inicializador de dados padrão (com regras de pontuação oficiais)
async function initializeVipzData() {
  try {
    // 1. Configurações gerais
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

    // 2. Regras de Pontuação Oficiais
    const rulesToCreate = [
      {
        name: 'Pontuação Básica (Cliente da Venda)',
        code: 'BASICA',
        type: 'BASICA',
        description: 'Regra padrão para o titular da venda de serviços ou produtos. Converte o valor faturado em pontos.',
        pointsPerReal: 1.0, // R$ 1,00 = 1 ponto
        fixedPoints: 0,
        minSaleValue: 0.0,
        targetTier: 'TODOS',
        active: true,
      },
      {
        name: 'Pontuação Contadores / Parceiros VIPZ',
        code: 'CONTADORES',
        type: 'CONTADORES',
        description: 'Regra aplicada ao Contador ou Parceiro informado no campo VIPZ da venda de serviços.',
        pointsPerReal: 0.5, // R$ 1,00 = 0.5 ponto (ou conforme ajustado na Gerência)
        fixedPoints: 50,    // +50 pontos bônus por indicação
        minSaleValue: 0.0,
        targetTier: 'TODOS',
        active: true,
      },
      {
        name: 'Campanha de Certificados Digitais & GED',
        code: 'CAMPANHA_GED',
        type: 'CUSTOM',
        description: 'Bonificação especial para serviços de digitalização e gestão documental.',
        pointsPerReal: 1.5,
        fixedPoints: 100,
        minSaleValue: 500.0,
        targetTier: 'TODOS',
        active: false,
      },
    ];

    for (const r of rulesToCreate) {
      await prisma.vipzRule.upsert({
        where: { code: r.code },
        update: {},
        create: r,
      });
    }

    // 3. Prêmios Iniciais Integrados com Itens do ERP
    const rewardsCount = await prisma.vipzReward.count();
    if (rewardsCount === 0) {
      const rewardsData = [
        {
          title: 'Garrafa Térmica INFOGED Inox 650ml',
          description: 'Garrafa esportiva de alta resistência com acabamento fosco e gravação a laser.',
          category: 'Brindes Vipz',
          rewardType: 'PRODUTO',
          erpItemId: 'PRD-01',
          erpItemType: 'PRODUTO',
          erpItemCode: 'INF-BR01',
          originalPrice: 89.9,
          pointsCost: 450,
          stock: 24,
        },
        {
          title: 'Cabo USB-C Trançado Blindado 2m',
          description: 'Cabo reforçado de nylon trançado com transferência ultra-rápida de 100W.',
          category: 'Acessórios',
          rewardType: 'PRODUTO',
          erpItemId: 'PRD-02',
          erpItemType: 'PRODUTO',
          erpItemCode: 'INF-CB02',
          originalPrice: 45.0,
          pointsCost: 280,
          stock: 35,
        },
        {
          title: 'Desconto de R$ 50 na Próxima Manutenção',
          description: 'Cupom de desconto imediato em ordens de serviço ou manutenções.',
          category: 'Cupons & Descontos',
          rewardType: 'CUPOM_VALOR',
          discountValue: 50.0,
          pointsCost: 500,
          stock: 100,
          validityDays: 60,
          termsOfUse: 'Válido para serviços com valor mínimo de R$ 150,00.',
        },
        {
          title: 'Limpeza e Desobstrução de Cabeça de Impressão Cortesia',
          description: 'Serviço técnico completo de recuperação e alinhamento de bicos ejetores.',
          category: 'Serviços Cortesia',
          rewardType: 'SERVICO',
          erpItemId: 'SRV-02',
          erpItemType: 'SERVICO',
          erpItemCode: 'SRV-LIMPCAB',
          originalPrice: 120.0,
          pointsCost: 650,
          stock: 999,
          validityDays: 45,
          termsOfUse: 'Agendamento prévio com a equipe técnica da INFOGED.',
        },
        {
          title: 'Desconto de R$ 100 em Nova Multifuncional',
          description: 'Voucher exclusivo para aquisição de novos equipamentos Epson EcoTank.',
          category: 'Cupons & Descontos',
          rewardType: 'CUPOM_VALOR',
          discountValue: 100.0,
          pointsCost: 1000,
          stock: 20,
          validityDays: 90,
          termsOfUse: 'Aplicável exclusivamente em impressoras da linha EcoTank.',
        },
      ];

      for (const rw of rewardsData) {
        await prisma.vipzReward.create({ data: rw });
      }
    }

    // 4. Clientes Iniciais
    const customersCount = await prisma.vipzCustomer.count();
    if (customersCount === 0) {
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
        },
        {
          name: 'Juliana Mendes de Castro',
          cpfCnpj: '049.882.114-78',
          email: 'juliana.mendes@advogados.com.br',
          phone: '(81) 98777-3321',
          pointsBalance: 980,
          totalPointsAccumulated: 980,
          totalPointsRedeemed: 0,
          totalSpent: 980.0,
          tier: 'BRONZE',
        },
      ];

      for (const c of customersData) {
        await prisma.vipzCustomer.create({ data: c });
      }
    }
  } catch (err) {
    console.error('Erro ao inicializar dados padrão do Vipz:', err);
  }
}
