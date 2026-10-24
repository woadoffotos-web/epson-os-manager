import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const entity = searchParams.get('entity');
    const action = searchParams.get('action');

    const where: any = {};

    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (search) {
      where.OR = [
        { userName: { contains: search } },
        { details: { contains: search } },
        { entityId: { contains: search } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao carregar logs' }, { status: 500 });
  }
}
