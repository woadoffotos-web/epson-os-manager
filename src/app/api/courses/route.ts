import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        technicianCourses: {
          include: { technician: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const technicians = await prisma.user.findMany({
      where: { role: 'TECNICO', active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    // Calcular estatísticas individuais por técnico
    const totalMandatory = courses.filter((c) => c.isMandatory).length;

    const technicianStats = technicians.map((t) => {
      let completedCount = 0;
      for (const c of courses) {
        if (!c.isMandatory) continue;
        const record = c.technicianCourses.find((tc) => tc.technicianId === t.id && tc.completed);
        if (record) completedCount++;
      }
      const percent = totalMandatory > 0 ? Math.round((completedCount / totalMandatory) * 100) : 0;
      return {
        technician: t,
        completedCount,
        totalMandatory,
        percent,
      };
    });

    // Calcular cobertura geral da empresa
    const coveredCoursesCount = courses
      .filter((c) => c.isMandatory)
      .filter((c) => c.technicianCourses.some((tc) => tc.completed)).length;

    const companyCoveragePercent =
      totalMandatory > 0 ? Math.round((coveredCoursesCount / totalMandatory) * 100) : 100;

    return NextResponse.json({
      courses,
      technicians,
      technicianStats,
      companyCoveragePercent,
      totalMandatory,
      coveredCoursesCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao carregar cursos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, isMandatory = true, userAuthor = 'Admin' } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'O título do curso é obrigatório.' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        isMandatory: Boolean(isMandatory),
      },
    });

    await logAuditAction({
      userName: userAuthor,
      action: 'CREATE',
      entity: 'Curso',
      entityId: course.id,
      details: `Novo curso cadastrado: "${course.title}" (${course.isMandatory ? 'Obrigatório' : 'Opcional'})`,
      newValues: course,
    });

    return NextResponse.json({ course });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar curso' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { courseId, technicianId, completed, userAuthor = 'Usuário' } = body;

    if (!courseId || !technicianId) {
      return NextResponse.json({ error: 'IDs de curso e técnico são obrigatórios' }, { status: 400 });
    }

    const record = await prisma.technicianCourse.upsert({
      where: {
        technicianId_courseId: { technicianId, courseId },
      },
      update: {
        completed: Boolean(completed),
        completedAt: completed ? new Date() : null,
      },
      create: {
        technicianId,
        courseId,
        completed: Boolean(completed),
        completedAt: completed ? new Date() : null,
      },
      include: {
        course: true,
        technician: true,
      },
    });

    await logAuditAction({
      userName: userAuthor,
      action: 'UPDATE',
      entity: 'TecnicoCurso',
      entityId: record.id,
      details: `Status do curso "${record.course.title}" para o técnico ${record.technician.name} alterado para ${completed ? 'CONCLUÍDO' : 'PENDENTE'}`,
      newValues: record,
    });

    return NextResponse.json({ record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar curso do técnico' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userAuthor = searchParams.get('userAuthor') || 'Admin';

    if (!id) return NextResponse.json({ error: 'ID do curso é obrigatório' }, { status: 400 });

    const deleted = await prisma.course.delete({ where: { id } });

    await logAuditAction({
      userName: userAuthor,
      action: 'DELETE',
      entity: 'Curso',
      entityId: id,
      details: `Curso excluído: "${deleted.title}"`,
      oldValues: deleted,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir curso' }, { status: 500 });
  }
}
