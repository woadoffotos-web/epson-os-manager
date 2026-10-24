import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';
import { computeTmfDays } from '@/lib/sla-alerts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // 1-12
    const year = searchParams.get('year');   // ex: 2026
    const serialToCheck = searchParams.get('check_serial');
    const entryDateStr = searchParams.get('entry_date');
    const search = searchParams.get('search');

    // 1. Verificação de Dupla Checagem de Reincidência (90 dias)
    if (serialToCheck) {
      const entryDate = entryDateStr ? new Date(entryDateStr) : new Date();
      const previousOrders = await prisma.workOrder.findMany({
        where: {
          serialNumber: serialToCheck,
          situation: { isCanceled: false },
        },
        orderBy: { exitDate: 'desc' },
      });

      let isEligibleRecurrent = false;
      let matchedOrder: any = null;
      let daysDiff = 999;

      for (const po of previousOrders) {
        const referenceDate = po.exitDate || po.systemExitDate || po.repairDate || po.entryDate;
        const diffTime = entryDate.getTime() - referenceDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 90) {
          isEligibleRecurrent = true;
          matchedOrder = po;
          daysDiff = diffDays;
          break;
        }
      }

      return NextResponse.json({
        isEligibleRecurrent,
        matchedOrderNumber: matchedOrder?.osNumber || null,
        daysSinceLastExit: daysDiff,
        message: isEligibleRecurrent
          ? `Equipamento reincidente! Última OS nº ${matchedOrder.osNumber} finalizada há ${daysDiff} dias (limite: 90 dias).`
          : 'Nenhuma OS anterior deste número de série nos últimos 90 dias.',
      });
    }

    // 2. Filtro do Mês e Ano Selecionados (Gerenciar O.S.)
    if (month && year) {
      const m = parseInt(month, 10) - 1; // 0-11
      const y = parseInt(year, 10);
      const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

      // Trazer ordens com entrada no mês OU com conserto/saída no mês
      const orders = await prisma.workOrder.findMany({
        where: {
          OR: [
            { entryDate: { gte: startOfMonth, lte: endOfMonth } },
            { repairDate: { gte: startOfMonth, lte: endOfMonth } },
            { systemExitDate: { gte: startOfMonth, lte: endOfMonth } },
            { partsInvoiceDate: { gte: startOfMonth, lte: endOfMonth } },
          ],
        },
        include: {
          model: { include: { type: true } },
          situation: true,
          location: true,
          technician: { select: { id: true, name: true } },
        },
        orderBy: { entryDate: 'asc' },
      });

      const ordersWithTmf = orders.map((o) => ({
        ...o,
        tmfDays: computeTmfDays(o.entryDate, o.repairDate),
      }));

      return NextResponse.json({ orders: ordersWithTmf });
    }

    // 3. Pesquisa Global / Avançada
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { osNumber: { contains: search } },
        { serialNumber: { contains: search } },
        { model: { name: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    const orders = await prisma.workOrder.findMany({
      where: whereClause,
      include: {
        model: { include: { type: true } },
        situation: true,
        location: true,
        technician: { select: { id: true, name: true } },
      },
      orderBy: { entryDate: 'desc' },
      take: 200,
    });

    const ordersWithTmf = orders.map((o) => ({
      ...o,
      tmfDays: computeTmfDays(o.entryDate, o.repairDate),
    }));

    return NextResponse.json({ orders: ordersWithTmf });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao consultar O.S.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      osNumber,
      modelId,
      serialNumber,
      situationId,
      entryDate,
      locationId,
      isRecurrent,
      technicianId,
      userAuthor = 'Usuário',
      userEmail,
    } = body;

    // Críticas de Campos Obrigatórios
    if (!osNumber || !modelId || !serialNumber || !situationId || !entryDate) {
      return NextResponse.json(
        { error: 'Crítica: Todos os campos (Número de O.S., Modelo, Número de Série, Situação e Data de Entrada) são obrigatórios.' },
        { status: 400 }
      );
    }

    // Crítica de Duplicidade
    const existing = await prisma.workOrder.findUnique({
      where: { osNumber: osNumber.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Crítica: A O.S. nº "${osNumber}" já se encontra cadastrada no sistema.` },
        { status: 400 }
      );
    }

    // Crítica dos 90 Dias se o usuário marcar como Reincidente
    const entryDateObj = new Date(entryDate);
    if (isRecurrent) {
      const prev = await prisma.workOrder.findMany({
        where: { serialNumber: serialNumber.trim(), situation: { isCanceled: false } },
        orderBy: { entryDate: 'desc' },
      });

      let foundValidPast = false;
      for (const po of prev) {
        const refDate = po.exitDate || po.systemExitDate || po.repairDate || po.entryDate;
        const diff = Math.floor((entryDateObj.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 90) {
          foundValidPast = true;
          break;
        }
      }

      if (!foundValidPast && prev.length > 0) {
        return NextResponse.json(
          {
            error:
              'Crítica de Regra de Negócio: Não é possível marcar Reincidência = Sim. A última passagem deste equipamento ocorreu há mais de 90 dias.',
          },
          { status: 400 }
        );
      }
    }

    const newOrder = await prisma.workOrder.create({
      data: {
        osNumber: osNumber.trim(),
        modelId,
        serialNumber: serialNumber.trim(),
        situationId,
        locationId: locationId || null,
        entryDate: entryDateObj,
        isRecurrent: Boolean(isRecurrent),
        technicianId: technicianId || null,
        tmfDays: computeTmfDays(entryDateObj, null),
      },
      include: {
        model: { include: { type: true } },
        situation: true,
        location: true,
        technician: true,
      },
    });

    await logAuditAction({
      userName: userAuthor,
      userEmail,
      action: 'CREATE',
      entity: 'OrdemDeServico',
      entityId: newOrder.id,
      details: `Cadastrada O.S. nº ${newOrder.osNumber} (Modelo: ${newOrder.model.name}, Série: ${newOrder.serialNumber})`,
      newValues: newOrder,
    });

    return NextResponse.json({ order: newOrder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar O.S.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, updates, userAuthor = 'Usuário', userEmail, userRole, userId } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: 'ID e dados de atualização são obrigatórios' }, { status: 400 });
    }

    const existingOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { model: true, situation: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'O.S. não encontrada' }, { status: 404 });
    }

    // Bloqueio de Concorrência: Verificar se outro usuário está editando este mesmo registro simultaneamente
    const now = new Date();
    const activeLock = await prisma.recordLock.findUnique({
      where: {
        entityType_entityId: {
          entityType: 'WorkOrder',
          entityId: id,
        },
      },
    });

    if (activeLock && activeLock.userId && userId && activeLock.userId !== userId && activeLock.expiresAt > now) {
      return NextResponse.json(
        {
          error: `Não é possível editar no momento: o usuário "${activeLock.userName}" está alterando este registro. Por favor, aguarde o término do outro usuário.`,
        },
        { status: 423 }
      );
    }

    // Validação de perfil se estiver alterando dados fundamentais de cadastro da O.S.
    const isEditingCoreFields = ['osNumber', 'modelId', 'serialNumber', 'entryDate'].some(
      (field) => updates[field] !== undefined && updates[field] !== (existingOrder as any)[field]
    );

    if (isEditingCoreFields && userRole) {
      const normalizedRole = userRole.toUpperCase();
      if (normalizedRole !== 'ADMIN' && normalizedRole !== 'GERENTE') {
        return NextResponse.json(
          { error: 'Acesso negado: Somente Administradores e Gerentes podem editar os dados de cadastro da O.S.' },
          { status: 403 }
        );
      }
    }

    // Crítica de Duplicidade ao alterar número de O.S.
    if (updates.osNumber && updates.osNumber.trim() !== existingOrder.osNumber) {
      const dup = await prisma.workOrder.findUnique({
        where: { osNumber: updates.osNumber.trim() },
      });
      if (dup && dup.id !== id) {
        return NextResponse.json(
          { error: `Crítica: Já existe outra O.S. cadastrada com o número "${updates.osNumber.trim()}".` },
          { status: 400 }
        );
      }
      updates.osNumber = updates.osNumber.trim();
    }

    // Auto-cálculo do TMF com base na Data de Entrada e Data de Conserto (ou dias corridos se em aberto)
    const entryDate = updates.entryDate ? new Date(updates.entryDate) : existingOrder.entryDate;
    const finalRepairDate =
      updates.repairDate !== undefined
        ? updates.repairDate
          ? new Date(updates.repairDate)
          : null
        : existingOrder.repairDate;

    updates.tmfDays = computeTmfDays(entryDate, finalRepairDate);

    // Converter campos de datas para DateTime objects se vierem em string
    const dateFields = [
      'entryDate',
      'diagnosisDate',
      'emailSentDate',
      'emailReceivedDate',
      'partsOrderDate',
      'partsInvoiceDate',
      'partsArrivalDate',
      'repairDate',
      'notice1Date',
      'notice2Date',
      'notice3Date',
      'systemExitDate',
      'exitDate',
    ];

    for (const f of dateFields) {
      if (updates[f] !== undefined) {
        updates[f] = updates[f] ? new Date(updates[f]) : null;
      }
    }

    // Validação de Reincidência se for alterada para true
    if (updates.isRecurrent === true && existingOrder.isRecurrent !== true) {
      const prev = await prisma.workOrder.findMany({
        where: {
          serialNumber: existingOrder.serialNumber,
          id: { not: existingOrder.id },
          situation: { isCanceled: false },
        },
      });

      let foundValid = false;
      for (const po of prev) {
        const refDate = po.exitDate || po.systemExitDate || po.repairDate || po.entryDate;
        const diff = Math.floor((entryDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 90) {
          foundValid = true;
          break;
        }
      }

      if (!foundValid && prev.length > 0) {
        return NextResponse.json(
          {
            error:
              'Crítica: Não é possível marcar como Reincidente. A passagem anterior ocorreu há mais de 90 dias.',
          },
          { status: 400 }
        );
      }
    }

    const updatedOrder = await prisma.workOrder.update({
      where: { id },
      data: updates,
      include: {
        model: { include: { type: true } },
        situation: true,
        location: true,
        technician: true,
      },
    });

    // Grava log de auditoria
    const changedKeys = Object.keys(updates);
    await logAuditAction({
      userName: userAuthor,
      userEmail,
      action: 'UPDATE',
      entity: 'OrdemDeServico',
      entityId: id,
      details: `O.S. nº ${updatedOrder.osNumber} atualizada. Campos alterados: ${changedKeys.join(', ')}`,
      oldValues: existingOrder,
      newValues: updatedOrder,
    });

    // Liberar bloqueio do registro após salvar
    await prisma.recordLock.deleteMany({
      where: {
        entityType: 'WorkOrder',
        entityId: id,
      },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar O.S.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    let userAuthor = searchParams.get('userAuthor') || 'Administrador';
    let userEmail = searchParams.get('userEmail') || 'admin@epson.com.br';
    let userRole = searchParams.get('userRole') || 'ADMIN';

    // Se a requisição contiver body JSON, extrair parâmetros
    try {
      const body = await request.json();
      if (body.id) id = body.id;
      if (body.userAuthor) userAuthor = body.userAuthor;
      if (body.userEmail) userEmail = body.userEmail;
      if (body.userRole) userRole = body.userRole;
    } catch {
      // Ignora se não houver body
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da O.S. é obrigatório para exclusão.' }, { status: 400 });
    }

    // Validação de perfil: Somente ADMIN e GERENTE (GERÊNCIA) têm permissão para apagar O.S.
    const normalizedRole = (userRole || '').toUpperCase();
    if (normalizedRole !== 'ADMIN' && normalizedRole !== 'GERENTE') {
      return NextResponse.json(
        { error: 'Acesso negado: Somente usuários dos perfis ADMIN e GERÊNCIA possuem permissão para apagar ordens de serviço.' },
        { status: 403 }
      );
    }

    const existingOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { model: true, situation: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada.' }, { status: 404 });
    }

    await prisma.workOrder.delete({
      where: { id },
    });

    // Registrar ação no Log de Auditoria
    await logAuditAction({
      userName: userAuthor,
      userEmail,
      action: 'DELETE',
      entity: 'OrdemDeServico',
      entityId: id,
      details: `Excluída individualmente a O.S. nº ${existingOrder.osNumber} (Modelo: ${existingOrder.model?.name || '-'}, Série: ${existingOrder.serialNumber})`,
      oldValues: existingOrder,
    });

    return NextResponse.json({
      success: true,
      message: `Ordem de serviço nº ${existingOrder.osNumber} excluída com sucesso.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir O.S.' }, { status: 500 });
  }
}
