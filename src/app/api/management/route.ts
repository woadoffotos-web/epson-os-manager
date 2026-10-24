import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET() {
  try {
    const situations = await prisma.situation.findMany({ orderBy: { order: 'asc' } });
    const locations = await prisma.location.findMany({ orderBy: { order: 'asc' } });
    const models = await prisma.equipmentModel.findMany({
      include: { type: true },
      orderBy: { name: 'asc' },
    });
    const types = await prisma.equipmentType.findMany({ orderBy: { name: 'asc' } });
    const audits = await prisma.annualAudit.findMany({ orderBy: { fiscalYear: 'desc' } });

    return NextResponse.json({
      situations,
      locations,
      models,
      types,
      audits,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao carregar configurações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { section, data, userAuthor = 'Admin' } = body;

    // 1. Situação
    if (section === 'situation') {
      const { id, name, color, isCanceled, order } = data;
      if (id) {
        const oldSit = await prisma.situation.findUnique({ where: { id } });
        if (!oldSit) {
          return NextResponse.json({ error: 'Situação não encontrada' }, { status: 404 });
        }

        const cleanName = name ? name.trim() : oldSit.name;
        if (!cleanName) {
          return NextResponse.json({ error: 'O nome da situação não pode ficar vazio.' }, { status: 400 });
        }

        // Checar duplicidade de nome se alterado
        if (cleanName.toLowerCase() !== oldSit.name.toLowerCase()) {
          const dup = await prisma.situation.findUnique({ where: { name: cleanName } });
          if (dup && dup.id !== id) {
            return NextResponse.json(
              { error: `Já existe outra situação cadastrada com o nome "${cleanName}".` },
              { status: 400 }
            );
          }
        }

        const updated = await prisma.situation.update({
          where: { id },
          data: {
            name: cleanName,
            color: color || oldSit.color,
            isCanceled: isCanceled !== undefined ? Boolean(isCanceled) : oldSit.isCanceled,
            order: order !== undefined ? order : oldSit.order,
          },
        });

        await logAuditAction({
          userName: userAuthor,
          action: 'UPDATE',
          entity: 'Situacao',
          entityId: id,
          details: `Situação editada: "${updated.name}" (Cor: ${updated.color}, Anulada: ${updated.isCanceled})`,
          oldValues: oldSit,
          newValues: updated,
        });
        return NextResponse.json({ item: updated });
      } else {
        if (!name || !name.trim()) {
          return NextResponse.json({ error: 'O nome da situação é obrigatório.' }, { status: 400 });
        }
        const cleanName = name.trim();
        const dup = await prisma.situation.findUnique({ where: { name: cleanName } });
        if (dup) {
          return NextResponse.json({ error: `A situação "${cleanName}" já existe.` }, { status: 400 });
        }

        const created = await prisma.situation.create({
          data: { name: cleanName, color: color || '#e2e8f0', isCanceled: Boolean(isCanceled), order: order || 0 },
        });
        await logAuditAction({
          userName: userAuthor,
          action: 'CREATE',
          entity: 'Situacao',
          entityId: created.id,
          details: `Nova situação cadastrada: "${cleanName}" (Cor: ${created.color})`,
          newValues: created,
        });
        return NextResponse.json({ item: created });
      }
    }

    // 2. Localização
    if (section === 'location') {
      const { id, code, description, order } = data;
      if (id) {
        const oldLoc = await prisma.location.findUnique({ where: { id } });
        const updated = await prisma.location.update({
          where: { id },
          data: { code, description, order: order || 0 },
        });
        await logAuditAction({
          userName: userAuthor,
          action: 'UPDATE',
          entity: 'Localizacao',
          entityId: id,
          details: `Localização alterada: ${code}`,
          oldValues: oldLoc,
          newValues: updated,
        });
        return NextResponse.json({ item: updated });
      } else {
        const created = await prisma.location.create({
          data: { code, description, order: order || 0 },
        });
        await logAuditAction({
          userName: userAuthor,
          action: 'CREATE',
          entity: 'Localizacao',
          entityId: created.id,
          details: `Novo local físico adicionado: ${code}`,
          newValues: created,
        });
        return NextResponse.json({ item: created });
      }
    }

    // 3. Modelo & Tipo
    if (section === 'model') {
      const { id, name, typeId } = data;
      if (id) {
        const oldMod = await prisma.equipmentModel.findUnique({ where: { id } });
        const updated = await prisma.equipmentModel.update({
          where: { id },
          data: { name, typeId },
          include: { type: true },
        });
        await logAuditAction({
          userName: userAuthor,
          action: 'UPDATE',
          entity: 'ModeloEquipamento',
          entityId: id,
          details: `Modelo atualizado: ${name} (Tipo: ${updated.type.name})`,
          oldValues: oldMod,
          newValues: updated,
        });
        return NextResponse.json({ item: updated });
      } else {
        const created = await prisma.equipmentModel.create({
          data: { name, typeId },
          include: { type: true },
        });
        await logAuditAction({
          userName: userAuthor,
          action: 'CREATE',
          entity: 'ModeloEquipamento',
          entityId: created.id,
          details: `Novo modelo cadastrado: ${name} (Tipo: ${created.type.name})`,
          newValues: created,
        });
        return NextResponse.json({ item: created });
      }
    }

    // 4. Nota de Auditoria Anual
    if (section === 'audit_score') {
      const { fiscalYear, score } = data;
      const parsedYear = parseInt(fiscalYear, 10);
      const parsedScore = parseFloat(score);

      const audit = await prisma.annualAudit.upsert({
        where: { fiscalYear: parsedYear },
        update: { score: parsedScore },
        create: { fiscalYear: parsedYear, score: parsedScore },
      });

      await logAuditAction({
        userName: userAuthor,
        action: 'UPDATE',
        entity: 'AuditoriaAnual',
        entityId: audit.id,
        details: `Nota de Auditoria do Ano Fiscal ${parsedYear} definida para ${parsedScore} pontos.`,
        newValues: audit,
      });

      return NextResponse.json({ item: audit });
    }

    return NextResponse.json({ error: 'Seção não suportada' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const id = searchParams.get('id');
    const userAuthor = searchParams.get('userAuthor') || 'Admin';

    if (!section || !id) {
      return NextResponse.json({ error: 'Seção e ID são obrigatórios' }, { status: 400 });
    }

    if (section === 'situation') {
      const linkedOrders = await prisma.workOrder.count({ where: { situationId: id } });
      if (linkedOrders > 0) {
        return NextResponse.json(
          { error: `Não é possível excluir a situação pois existem ${linkedOrders} ordens de serviço vinculadas a ela.` },
          { status: 400 }
        );
      }

      const deleted = await prisma.situation.delete({ where: { id } });
      await logAuditAction({
        userName: userAuthor,
        action: 'DELETE',
        entity: 'Situacao',
        entityId: id,
        details: `Situação excluída: ${deleted.name}`,
        oldValues: deleted,
      });
      return NextResponse.json({ success: true });
    }

    if (section === 'location') {
      const deleted = await prisma.location.delete({ where: { id } });
      await logAuditAction({
        userName: userAuthor,
        action: 'DELETE',
        entity: 'Localizacao',
        entityId: id,
        details: `Localização excluída: ${deleted.code}`,
        oldValues: deleted,
      });
      return NextResponse.json({ success: true });
    }

    if (section === 'model') {
      const deleted = await prisma.equipmentModel.delete({ where: { id } });
      await logAuditAction({
        userName: userAuthor,
        action: 'DELETE',
        entity: 'ModeloEquipamento',
        entityId: id,
        details: `Modelo de equipamento excluído: ${deleted.name}`,
        oldValues: deleted,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Seção não suportada' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir item' }, { status: 500 });
  }
}
