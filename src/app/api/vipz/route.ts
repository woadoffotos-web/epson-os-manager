import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GestaoClickService } from '@/lib/gestaoclick';
import { logAuditAction } from '@/lib/audit';

// GET: Retorna dados gerais do Vipz Infoged (clientes, regras, níveis, prêmios, configurações, estatísticas)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const action = searchParams.get('action');

    // Inicialização automática com dados padrão se o banco estiver vazio
    const customerCount = await prisma.vipzCustomer.count();
    const rulesCount = await prisma.vipzRule.count();
    const tiersCount = await prisma.vipzTier.count();
    if (customerCount === 0 || rulesCount === 0 || tiersCount === 0) {
      await initializeVipzData();
    }

    // Rotina automática: Expiração de pontos após 1 ano (365 dias)
    const now = new Date();
    try {
      const expiredCredits = await prisma.vipzTransaction.findMany({
        where: {
          expiresAt: { lte: now },
          isExpired: false,
          points: { gt: 0 },
        },
      });

      for (const exp of expiredCredits) {
        await prisma.$transaction(async (tx) => {
          await tx.vipzTransaction.update({
            where: { id: exp.id },
            data: { isExpired: true },
          });

          await tx.vipzCustomer.update({
            where: { id: exp.customerId },
            data: { pointsBalance: { decrement: exp.points } },
          });

          await tx.vipzTransaction.create({
            data: {
              customerId: exp.customerId,
              type: 'EXPIRATION',
              points: -exp.points,
              description: `Expiração de pontos após 1 ano de validade (${exp.description})`,
            },
          });
        });
      }
    } catch (expErr) {
      console.warn('Verificação de expiração de pontos executada:', expErr);
    }

    if (action === 'settings') {
      let settings = await prisma.vipzSettings.findUnique({ where: { id: 'default' } });
      if (!settings) {
        settings = await prisma.vipzSettings.create({ data: { id: 'default' } });
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

    // Níveis Vipz
    const tiers = await prisma.vipzTier.findMany({
      orderBy: { minPoints: 'asc' },
    });

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
      tiers,
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
        totalTiers: tiers.length,
        totalRewards: rewards.length,
      },
    });
  } catch (error: any) {
    console.error('Erro na rota /api/vipz:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do Vipz Infoged', details: error.message }, { status: 500 });
  }
}

// POST: Realiza ações (Crédito de Pontos, Resgate, CRUD Regras, CRUD Níveis, CRUD Prêmios, Cadastro com ERP)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ==============================================================
    // 1. GERÊNCIA: NÍVEIS VIPZ (CRIAR, EDITAR, EXCLUIR, SERVIÇOS BÔNUS)
    // ==============================================================
    if (action === 'CREATE_TIER') {
      const { name, code, minPoints, multiplier, benefits, color, bonusServices } = body;

      if (!name) {
        return NextResponse.json({ error: 'Nome do nível é obrigatório' }, { status: 400 });
      }

      const generatedCode = (code || name).toUpperCase().replace(/\s+/g, '_');
      const existing = await prisma.vipzTier.findFirst({
        where: { OR: [{ name }, { code: generatedCode }] },
      });

      if (existing) {
        return NextResponse.json({ error: `Já existe um nível cadastrado com o nome ou código '${name}'` }, { status: 400 });
      }

      const newTier = await prisma.vipzTier.create({
        data: {
          name,
          code: generatedCode,
          minPoints: minPoints !== undefined ? parseInt(minPoints) : 0,
          multiplier: multiplier !== undefined ? parseFloat(multiplier) : 1.0,
          benefits: benefits || null,
          color: color || '#d97706',
          bonusServices: bonusServices || null, // JSON string
          active: true,
        },
      });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'CREATE',
        entity: 'VipzTier',
        entityId: newTier.id,
        details: `Criado nível Vipz '${name}' (mínimo ${minPoints} pts, multiplicador ${multiplier}x)`,
      });

      return NextResponse.json({ success: true, tier: newTier });
    }

    if (action === 'UPDATE_TIER') {
      const { id, name, minPoints, multiplier, benefits, color, bonusServices, active } = body;

      const updatedTier = await prisma.vipzTier.update({
        where: { id },
        data: {
          name,
          minPoints: minPoints !== undefined ? parseInt(minPoints) : undefined,
          multiplier: multiplier !== undefined ? parseFloat(multiplier) : undefined,
          benefits,
          color,
          bonusServices,
          active: active !== undefined ? Boolean(active) : undefined,
        },
      });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'UPDATE',
        entity: 'VipzTier',
        entityId: id,
        details: `Atualizado nível Vipz '${updatedTier.name}'`,
      });

      return NextResponse.json({ success: true, tier: updatedTier });
    }

    if (action === 'DELETE_TIER') {
      const { id } = body;
      const tier = await prisma.vipzTier.findUnique({ where: { id } });
      if (!tier) return NextResponse.json({ error: 'Nível não encontrado' }, { status: 404 });

      await prisma.vipzTier.delete({ where: { id } });

      await logAuditAction({
        userName: body.userName || 'Gerente Vipz',
        action: 'DELETE',
        entity: 'VipzTier',
        entityId: id,
        details: `Excluído nível Vipz '${tier.name}'`,
      });

      return NextResponse.json({ success: true });
    }

    // ==============================================================
    // 2. GERÊNCIA: REGRAS DE PONTUAÇÃO (CRIAR, EDITAR, EXCLUIR)
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
      if (!rule) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 });

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
    // 3. GERÊNCIA: PRÊMIOS & CUPONS (CRIAR COM ERP, EDITAR, EXCLUIR)
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

      return NextResponse.json({ success: true, reward: updatedReward });
    }

    if (action === 'DELETE_REWARD') {
      const { id } = body;
      const reward = await prisma.vipzReward.findUnique({ where: { id } });
      if (!reward) return NextResponse.json({ error: 'Prêmio não encontrado' }, { status: 404 });

      await prisma.vipzReward.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // ==============================================================
    // 4. CADASTRO DE CLIENTE COM VERIFICAÇÃO NO ERP & ENDEREÇO
    // ==============================================================
    if (action === 'CREATE_CUSTOMER') {
      const {
        name,
        cpfCnpj,
        phone,
        email,
        cep,
        address,
        number,
        complement,
        neighborhood,
        city,
        state,
        birthDate,
        notes,
      } = body;

      // Validação de campos obrigatórios
      if (!name || !cpfCnpj || !phone || !email || !cep || !address || !number || !neighborhood || !city || !state) {
        return NextResponse.json({
          error: 'Todos os campos são obrigatórios (Nome, CPF/CNPJ, Telefone, E-mail, CEP, Endereço, Número, Bairro, Cidade e Estado), exceto a Data de Nascimento.',
        }, { status: 400 });
      }

      // 1. VERIFICAÇÃO NO ERP GESTÃO CLICK: SE JÁ EXISTIR, BLOQUEIA O CADASTRO!
      const existingInErp = await GestaoClickService.getClienteByCpfOrName(cpfCnpj, name);
      if (existingInErp) {
        return NextResponse.json({
          error: `Cadastro não permitido: Este cliente já possui cadastro ativo no seu ERP Gestão Click (Código/ID: ${existingInErp.id}). Conforme a regra de negócio, clientes já existentes no ERP não podem ser recadastrados.`,
          existingCustomer: existingInErp,
        }, { status: 400 });
      }

      // 2. VERIFICAÇÃO NO BANCO LOCAL VIPZ
      const existingInVipz = await prisma.vipzCustomer.findUnique({ where: { cpfCnpj } });
      if (existingInVipz) {
        return NextResponse.json({
          error: `Já existe um cliente cadastrado no Vipz com o CPF/CNPJ ${cpfCnpj}.`,
        }, { status: 400 });
      }

      // 3. NÃO EXISTE NO ERP: CADASTRA NO GESTÃO CLICK COM CAMPO VIPZ PREENCHIDO
      const erpResult = await GestaoClickService.createCliente({
        nome: name,
        cpf_cnpj: cpfCnpj,
        email,
        telefone: phone,
        cep,
        endereco: address,
        numero: number,
        complemento: complement || '',
        bairro: neighborhood,
        cidade: city,
        estado: state,
        data_nascimento: birthDate || undefined,
        vipzTier: 'Bronze',
      });

      // 4. CADASTRA NO VIPZ INFOGED
      // Pontos têm validade de 1 ano (365 dias)
      const oneYearExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const newCustomer = await prisma.vipzCustomer.create({
        data: {
          erpCustomerId: String(erpResult.id),
          name,
          cpfCnpj,
          phone,
          email,
          cep,
          address,
          number,
          complement: complement || null,
          neighborhood,
          city,
          state,
          birthDate: birthDate ? new Date(birthDate) : null,
          notes: notes || null,
          pointsBalance: 100, // Bônus de boas-vindas
          totalPointsAccumulated: 100,
          tier: 'BRONZE',
          transactions: {
            create: {
              type: 'BONUS',
              points: 100,
              description: 'Bônus de boas-vindas ao Vipz Infoged (Válido por 1 ano)',
              expiresAt: oneYearExpiry,
            },
          },
        },
      });

      await logAuditAction({
        userName: body.userName || 'Atendente INFOGED',
        action: 'CREATE',
        entity: 'VipzCustomer',
        entityId: newCustomer.id,
        details: `Cliente '${name}' cadastrado no Vipz e no ERP Gestão Click (ID: ${erpResult.id}) com campo Vipz preenchido.`,
      });

      return NextResponse.json({
        success: true,
        customer: newCustomer,
        erpMessage: erpResult.message,
      });
    }

    // ==============================================================
    // 5. OPERAÇÃO: CRÉDITO DE PONTOS (COM EXPIRAÇÃO DE 1 ANO)
    // ==============================================================
    if (action === 'CREDIT_SALE') {
      const { customerId, saleValue, erpSaleId, description, campoVipzIndicador, userName } = body;

      const customer = await prisma.vipzCustomer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return NextResponse.json({ error: 'Cliente titular da venda não localizado' }, { status: 404 });
      }

      const basicRule = await prisma.vipzRule.findFirst({ where: { code: 'BASICA', active: true } });
      const contadorRule = await prisma.vipzRule.findFirst({ where: { code: 'CONTADORES', active: true } });

      // Busca multiplicador da categoria atual do cliente
      const customerTierRecord = await prisma.vipzTier.findFirst({
        where: { code: customer.tier },
      });
      const buyerMultiplier = customerTierRecord?.multiplier || 1.0;

      // Cálculo dos pontos do comprador (REGRA BÁSICA)
      const basicRatio = basicRule?.pointsPerReal || 1.0;
      const buyerPoints = Math.round(Number(saleValue) * basicRatio * buyerMultiplier) + (basicRule?.fixedPoints || 0);

      // Data de expiração: 1 ano (365 dias)
      const oneYearExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      let partnerResult: any = null;

      const result = await prisma.$transaction(async (tx) => {
        const newTotalAccumulated = customer.totalPointsAccumulated + buyerPoints;
        const newTotalSpent = customer.totalSpent + Number(saleValue);

        // Recalcular Nível/Tier dinamicamente conforme a tabela VipzTier
        const allTiers = await tx.vipzTier.findMany({
          where: { active: true },
          orderBy: { minPoints: 'desc' },
        });

        let newTier = 'BRONZE';
        for (const t of allTiers) {
          if (newTotalAccumulated >= t.minPoints) {
            newTier = t.code;
            break;
          }
        }

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
            expiresAt: oneYearExpiry,
          },
        });

        // 2. Se houver cliente no campo VIPZ (REGRA CONTADORES)
        if (campoVipzIndicador && campoVipzIndicador.trim()) {
          const partnerName = campoVipzIndicador.trim();

          let partner = await tx.vipzCustomer.findFirst({
            where: { name: { contains: partnerName, mode: 'insensitive' } },
          });

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

          const contadorRatio = contadorRule?.pointsPerReal || 0.5;
          const partnerPoints = Math.round(Number(saleValue) * contadorRatio) + (contadorRule?.fixedPoints || 0);

          const updatedPartner = await tx.vipzCustomer.update({
            where: { id: partner.id },
            data: {
              pointsBalance: { increment: partnerPoints },
              totalPointsAccumulated: { increment: partnerPoints },
            },
          });

          await tx.vipzTransaction.create({
            data: {
              customerId: partner.id,
              type: 'BONUS',
              points: partnerPoints,
              saleValue: Number(saleValue),
              erpSaleId: erpSaleId || `VD-${Date.now().toString().slice(-4)}`,
              description: `Pontuação Contadores ref. a venda do cliente ${customer.name}`,
              expiresAt: oneYearExpiry,
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

      return NextResponse.json({
        success: true,
        message: 'Pontuação computada com sucesso! Pontos válidos por 1 ano.',
        buyerPoints,
        buyerNewBalance: result.updatedCustomer.pointsBalance,
        partnerResult,
      });
    }

    // ==============================================================
    // 6. OPERAÇÃO: RESGATE DE RECOMPENSA
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

      return NextResponse.json({
        success: true,
        message: 'Resgate realizado com sucesso!',
        voucherCode,
        redemption: result.redemption,
        newBalance: result.updatedCustomer.pointsBalance,
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no POST /api/vipz:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação', details: error.message }, { status: 500 });
  }
}

// Inicializador de dados padrão (com níveis e serviços bônus oficiais)
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
      },
    });

    // 2. Níveis Vipz Iniciais com Serviços Bônus e Data de Vencimento
    const tiersData = [
      {
        name: 'Bronze',
        code: 'BRONZE',
        minPoints: 0,
        multiplier: 1.0,
        color: '#b45309',
        benefits: 'Acesso completo ao catálogo de vantagens, cupons de desconto e acúmulo de pontos padrão.',
        bonusServices: JSON.stringify([
          { serviceName: 'Avaliação Diagnóstica de Equipamentos Epson', validUntil: '2026-12-31' },
        ]),
      },
      {
        name: 'Prata',
        code: 'PRATA',
        minPoints: 1000,
        multiplier: 1.2,
        color: '#64748b',
        benefits: 'Multiplicador de 1.2x em todos os serviços, atendimento prioritário e cupons exclusivos.',
        bonusServices: JSON.stringify([
          { serviceName: 'Limpeza Externa e Lubrificação de Tracionador', validUntil: '2026-12-31' },
          { serviceName: 'Backup de Configurações de Rede de Impressão', validUntil: '2027-03-31' },
        ]),
      },
      {
        name: 'Ouro',
        code: 'OURO',
        minPoints: 3000,
        multiplier: 1.5,
        color: '#d97706',
        benefits: 'Multiplicador de 1.5x em todas as compras, fila preferencial e 1 serviço cortesia semestral.',
        bonusServices: JSON.stringify([
          { serviceName: 'Limpeza Especial e Desobstrução de Cabeça de Impressão', validUntil: '2027-06-30' },
          { serviceName: 'Instalação e Configuração Remota Cortesia', validUntil: '2027-06-30' },
        ]),
      },
      {
        name: 'VIPZ Black',
        code: 'VIPZ_BLACK',
        minPoints: 7000,
        multiplier: 2.0,
        color: '#0f172a',
        benefits: 'Dobro de pontos (2x) em todos os faturamentos, gerente de contas dedicado e consultoria VIP.',
        bonusServices: JSON.stringify([
          { serviceName: 'Consultoria VIP de Fluxo Documental & GED', validUntil: '2027-12-31' },
          { serviceName: 'Revisão Geral e Calibração Anual sem Custo', validUntil: '2027-12-31' },
        ]),
      },
    ];

    for (const t of tiersData) {
      await prisma.vipzTier.upsert({
        where: { code: t.code },
        update: {},
        create: t,
      });
    }

    // 3. Regras de Pontuação
    const rulesToCreate = [
      {
        name: 'Pontuação Básica (Cliente da Venda)',
        code: 'BASICA',
        type: 'BASICA',
        description: 'Regra padrão para o titular da venda de serviços. Converte o valor faturado em pontos.',
        pointsPerReal: 1.0,
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
        pointsPerReal: 0.5,
        fixedPoints: 50,
        minSaleValue: 0.0,
        targetTier: 'TODOS',
        active: true,
      },
    ];

    for (const r of rulesToCreate) {
      await prisma.vipzRule.upsert({
        where: { code: r.code },
        update: {},
        create: r,
      });
    }
  } catch (err) {
    console.error('Erro ao inicializar dados padrão do Vipz:', err);
  }
}
