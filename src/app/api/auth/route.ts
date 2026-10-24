import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'users') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          active: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ users });
    }

    // Default: return all active technicians for dropdowns
    const technicians = await prisma.user.findMany({
      where: { role: 'TECNICO', active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ technicians });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, name, role, permissions, userId, active, userAuthor = 'Administrador', userRole, currentUserId } = body;

    // Login
    if (action === 'login') {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || user.password !== password || !user.active) {
        return NextResponse.json(
          { error: 'Credenciais inválidas ou usuário inativo.' },
          { status: 401 }
        );
      }

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: 'LOGIN',
        entity: 'Autenticação',
        entityId: user.id,
        details: `Login realizado com sucesso por ${user.name} (${user.role})`,
      });

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: JSON.parse(user.permissions || '[]'),
        },
      });
    }

    // Validação de Permissão para Ações de Gerenciamento de Usuários (ADMIN e GERENTE)
    const normalizedRole = (userRole || '').toUpperCase();
    if (['create_user', 'update_user', 'delete_user'].includes(action)) {
      if (normalizedRole && normalizedRole !== 'ADMIN' && normalizedRole !== 'GERENTE') {
        return NextResponse.json(
          { error: 'Acesso negado: Somente administradores e gerentes possuem permissão para gerenciar usuários.' },
          { status: 403 }
        );
      }
    }

    // Create User
    if (action === 'create_user') {
      if (!name || !email) {
        return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return NextResponse.json({ error: 'Já existe um usuário com esse e-mail.' }, { status: 400 });
      }

      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: password || '123456',
          role: role || 'TECNICO',
          permissions: JSON.stringify(permissions || []),
          active: active !== undefined ? active : true,
        },
      });

      await logAuditAction({
        userName: userAuthor,
        action: 'CREATE',
        entity: 'Usuario',
        entityId: newUser.id,
        details: `Novo usuário criado: ${newUser.name} (${newUser.email}) - Cargo: ${newUser.role}`,
        newValues: newUser,
      });

      return NextResponse.json({ user: newUser });
    }

    // Update User / Permissions
    if (action === 'update_user') {
      if (!userId) {
        return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
      }

      const oldUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!oldUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

      // Validar duplicidade se o e-mail for alterado
      let cleanEmail = oldUser.email;
      if (email && email.trim().toLowerCase() !== oldUser.email) {
        cleanEmail = email.trim().toLowerCase();
        const existingWithEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (existingWithEmail && existingWithEmail.id !== userId) {
          return NextResponse.json(
            { error: `Já existe outro usuário cadastrado com o e-mail "${cleanEmail}".` },
            { status: 400 }
          );
        }
      }

      const updateData: any = {
        name: name ? name.trim() : oldUser.name,
        email: cleanEmail,
        role: role ?? oldUser.role,
        permissions: permissions ? JSON.stringify(permissions) : oldUser.permissions,
        active: active !== undefined ? active : oldUser.active,
      };

      if (password && password.trim().length > 0) {
        updateData.password = password.trim();
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      await logAuditAction({
        userName: userAuthor,
        action: 'UPDATE',
        entity: 'Usuario',
        entityId: userId,
        details: `Dados do usuário ${updated.name} (${updated.email}) foram atualizados por ${userAuthor}`,
        oldValues: oldUser,
        newValues: updated,
      });

      return NextResponse.json({ user: updated });
    }

    // Delete User
    if (action === 'delete_user') {
      if (!userId) {
        return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
      }

      if (currentUserId && userId === currentUserId) {
        return NextResponse.json(
          { error: 'Operação não permitida: Você não pode excluir o seu próprio usuário logado.' },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }

      // Desvincular ordens de serviço atribuídas a este técnico
      await prisma.workOrder.updateMany({
        where: { technicianId: userId },
        data: { technicianId: null },
      });

      // Desvincular de logs de auditoria
      await prisma.auditLog.updateMany({
        where: { userId: userId },
        data: { userId: null },
      });

      // Remover cursos do técnico
      await prisma.technicianCourse.deleteMany({
        where: { technicianId: userId },
      });

      // Excluir usuário
      await prisma.user.delete({
        where: { id: userId },
      });

      await logAuditAction({
        userName: userAuthor,
        action: 'DELETE',
        entity: 'Usuario',
        entityId: userId,
        details: `Usuário excluído: ${targetUser.name} (${targetUser.email}) - Cargo: ${targetUser.role}`,
        oldValues: targetUser,
      });

      return NextResponse.json({ success: true, message: `Usuário "${targetUser.name}" excluído com sucesso.` });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro no servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId') || searchParams.get('id');
    let userAuthor = searchParams.get('userAuthor') || 'Administrador';
    let userRole = searchParams.get('userRole') || 'ADMIN';
    let currentUserId = searchParams.get('currentUserId');

    try {
      const body = await request.json();
      if (body.userId) userId = body.userId;
      if (body.id) userId = body.id;
      if (body.userAuthor) userAuthor = body.userAuthor;
      if (body.userRole) userRole = body.userRole;
      if (body.currentUserId) currentUserId = body.currentUserId;
    } catch {
      // Body opcional
    }

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const normalizedRole = (userRole || '').toUpperCase();
    if (normalizedRole !== 'ADMIN' && normalizedRole !== 'GERENTE') {
      return NextResponse.json(
        { error: 'Acesso negado: Somente administradores e gerentes possuem permissão para excluir usuários.' },
        { status: 403 }
      );
    }

    if (currentUserId && userId === currentUserId) {
      return NextResponse.json(
        { error: 'Operação não permitida: Você não pode excluir o seu próprio usuário logado.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    await prisma.workOrder.updateMany({
      where: { technicianId: userId },
      data: { technicianId: null },
    });

    await prisma.auditLog.updateMany({
      where: { userId: userId },
      data: { userId: null },
    });

    await prisma.technicianCourse.deleteMany({
      where: { technicianId: userId },
    });

    await prisma.user.delete({
      where: { id: userId },
    });

    await logAuditAction({
      userName: userAuthor,
      action: 'DELETE',
      entity: 'Usuario',
      entityId: userId,
      details: `Usuário excluído: ${targetUser.name} (${targetUser.email}) - Cargo: ${targetUser.role}`,
      oldValues: targetUser,
    });

    return NextResponse.json({ success: true, message: `Usuário "${targetUser.name}" excluído com sucesso.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir usuário' }, { status: 500 });
  }
}
