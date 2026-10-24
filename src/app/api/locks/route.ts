import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || 'WorkOrder';
    const entityId = searchParams.get('entityId');
    const currentUserId = searchParams.get('userId');

    if (!entityId) {
      return NextResponse.json({ error: 'entityId é obrigatório' }, { status: 400 });
    }

    const now = new Date();

    // Limpar bloqueios expirados
    await prisma.recordLock.deleteMany({
      where: {
        entityType,
        entityId,
        expiresAt: { lte: now },
      },
    });

    const activeLock = await prisma.recordLock.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    if (activeLock && activeLock.userId !== currentUserId) {
      return NextResponse.json({
        locked: true,
        lockedBy: activeLock.userName,
        userEmail: activeLock.userEmail,
        lockedAt: activeLock.lockedAt,
        message: `Não é possível editar no momento: o usuário "${activeLock.userName}" está alterando este registro. Por favor, aguarde o término do outro usuário.`,
      });
    }

    return NextResponse.json({ locked: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao verificar bloqueio' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = 'acquire', entityType = 'WorkOrder', entityId, userId, userName, userEmail } = body;

    if (!entityId || !userId) {
      return NextResponse.json({ error: 'entityId e userId são obrigatórios' }, { status: 400 });
    }

    const now = new Date();

    // Limpar bloqueios expirados
    await prisma.recordLock.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });

    if (action === 'release') {
      await prisma.recordLock.deleteMany({
        where: {
          entityType,
          entityId,
          userId,
        },
      });
      return NextResponse.json({ success: true, message: 'Bloqueio liberado' });
    }

    // Action: acquire or heartbeat/renew
    const existingLock = await prisma.recordLock.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    if (existingLock && existingLock.userId !== userId && existingLock.expiresAt > now) {
      return NextResponse.json(
        {
          locked: true,
          lockedBy: existingLock.userName,
          error: `Não é possível editar no momento: o usuário "${existingLock.userName}" está alterando este registro. Por favor, aguarde o término do outro usuário.`,
        },
        { status: 423 }
      );
    }

    // Expira em 60 segundos (auto-timeout seguro caso o navegador feche)
    const expiresAt = new Date(Date.now() + 60 * 1000);

    const lock = await prisma.recordLock.upsert({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
      update: {
        userId,
        userName: userName || 'Outro usuário',
        userEmail: userEmail || null,
        expiresAt,
      },
      create: {
        entityType,
        entityId,
        userId,
        userName: userName || 'Outro usuário',
        userEmail: userEmail || null,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      locked: false,
      expiresAt: lock.expiresAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao processar bloqueio' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || 'WorkOrder';
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');

    if (entityId) {
      const whereClause: any = { entityType, entityId };
      if (userId) whereClause.userId = userId;

      await prisma.recordLock.deleteMany({
        where: whereClause,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao liberar bloqueio' }, { status: 500 });
  }
}
