import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  checkAccountLock,
  AUTH_COOKIE_NAME,
  SessionUser,
} from '@/lib/auth';

// Helper seguro para extrair e validar a sessão do usuário a partir da requisição
async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const authHeader = request.headers.get('Authorization');
  const cookieHeader = request.headers.get('cookie') || '';
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
    if (match) token = match[1];
  }

  if (!token) return null;
  return await verifySessionToken(token);
}

// Rate Limiter em memória por IP apenas para TENTATIVAS INCORRETAS (25 erros por 5 minutos)
const loginIpAttempts = new Map<string, { failedCount: number; firstAttempt: number }>();

function isIpRateLimited(ip: string): { blocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxFailed = 25;

  const record = loginIpAttempts.get(ip);
  if (!record || now - record.firstAttempt > windowMs) {
    return { blocked: false, remainingSeconds: 0 };
  }

  if (record.failedCount >= maxFailed) {
    const remainingSeconds = Math.ceil((windowMs - (now - record.firstAttempt)) / 1000);
    return { blocked: true, remainingSeconds };
  }

  return { blocked: false, remainingSeconds: 0 };
}

function recordIpFailure(ip: string) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const record = loginIpAttempts.get(ip);

  if (!record || now - record.firstAttempt > windowMs) {
    loginIpAttempts.set(ip, { failedCount: 1, firstAttempt: now });
  } else {
    record.failedCount++;
  }
}

function clearIpRateLimit(ip: string) {
  loginIpAttempts.delete(ip);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Validação de sessão do usuário logado
    if (action === 'me') {
      const decoded = await getSessionUser(request);
      return NextResponse.json({ user: decoded });
    }

    // Listagem completa de usuários: estritamente restrita a ADMIN e GERENTE
    if (action === 'users') {
      const sessionUser = await getSessionUser(request);
      if (!sessionUser) {
        return NextResponse.json(
          { error: 'Acesso não autorizado. Faça login para continuar.' },
          { status: 401 }
        );
      }

      const role = (sessionUser.role || '').toUpperCase();
      if (role !== 'ADMIN' && role !== 'GERENTE') {
        return NextResponse.json(
          { error: 'Acesso negado: Somente administradores e gerentes podem listar os usuários cadastrados.' },
          { status: 403 }
        );
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          active: true,
          failedAttempts: true,
          lockedUntil: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ users });
    }

    // Default: técnicos ativos para dropdown de OS (requer usuário autenticado)
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Faça login para continuar.' },
        { status: 401 }
      );
    }

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
    const {
      action,
      email,
      password,
      name,
      role,
      permissions,
      userId,
      active,
    } = body;

    // Login com Bcrypt, Proteção contra Força Bruta por Conta e Rate Limit por IP
    if (action === 'login') {
      // 1. Rate limiting por IP
      const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1';

      const rateCheck = isIpRateLimited(clientIp);
      if (rateCheck.blocked) {
        return NextResponse.json(
          {
            error: `Muitas tentativas incorretas a partir deste IP. Por segurança, aguarde ${rateCheck.remainingSeconds} segundos antes de tentar novamente.`,
          },
          { status: 429 }
        );
      }

      if (!email || !password) {
        return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        recordIpFailure(clientIp);
        return NextResponse.json(
          { error: 'Credenciais inválidas.' },
          { status: 401 }
        );
      }

      if (!user.active) {
        return NextResponse.json(
          { error: 'Usuário desativado. Contate o administrador.' },
          { status: 403 }
        );
      }

      // 2. Verificar se a conta está temporariamente bloqueada por força bruta
      const { isLocked, remainingMinutes } = checkAccountLock(user.lockedUntil);
      if (isLocked) {
        return NextResponse.json(
          {
            error: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${remainingMinutes} minuto(s).`,
            isLocked: true,
            remainingMinutes,
          },
          { status: 423 }
        );
      }

      // 3. Verificar senha com Bcrypt
      const { isValid, needsRehash } = await verifyPassword(password, user.password);

      if (!isValid) {
        recordIpFailure(clientIp);
        const nextAttempts = (user.failedAttempts || 0) + 1;
        const maxAttempts = 5;
        const isNowLocked = nextAttempts >= maxAttempts;
        const lockUntil = isNowLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: nextAttempts,
            lockedUntil: lockUntil,
          },
        });

        await logAuditAction({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          action: 'SECURITY',
          entity: 'Autenticação',
          entityId: user.id,
          details: isNowLocked
            ? `Conta bloqueada por 15 minutos após ${nextAttempts} tentativas incorretas consecutivas.`
            : `Tentativa de login com senha incorreta (${nextAttempts}/${maxAttempts}).`,
        });

        if (isNowLocked) {
          return NextResponse.json(
            {
              error: 'Limite de 5 tentativas excedido. Conta bloqueada por 15 minutos por segurança.',
              isLocked: true,
              remainingMinutes: 15,
            },
            { status: 423 }
          );
        }

        const remaining = maxAttempts - nextAttempts;
        return NextResponse.json(
          { error: `Senha incorreta. Você tem mais ${remaining} tentativa(s) antes do bloqueio da conta.` },
          { status: 401 }
        );
      }

      // 4. Sucesso! Resetar tentativas e migrar hash se necessário
      clearIpRateLimit(clientIp);
      const updatePayload: any = {
        failedAttempts: 0,
        lockedUntil: null,
      };

      if (needsRehash) {
        updatePayload.password = await hashPassword(password);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updatePayload,
      });

      const parsedPermissions = JSON.parse(user.permissions || '[]');
      const sessionUser: SessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: parsedPermissions,
      };

      // Gerar Token JWT criptografado
      const token = await signSessionToken(sessionUser);

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: 'LOGIN',
        entity: 'Autenticação',
        entityId: user.id,
        details: `Login realizado com sucesso por ${user.name} (${user.role})`,
      });

      const response = NextResponse.json({
        user: sessionUser,
        token,
      });

      // Salvar Cookie HttpOnly seguro de sessão
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return response;
    }

    // Logout seguro com limpeza do cookie
    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso.' });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    // Validação Estrita de Permissão para Gerenciamento de Usuários (ADMIN e GERENTE)
    // O cargo é extraído exclusivamente do token JWT criptografado da sessão, NUNCA do body!
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Faça login com credenciais de administrador.' },
        { status: 401 }
      );
    }

    const sessionRole = (sessionUser.role || '').toUpperCase();
    if (sessionRole !== 'ADMIN' && sessionRole !== 'GERENTE') {
      return NextResponse.json(
        { error: 'Acesso negado: Somente administradores e gerentes possuem permissão para gerenciar usuários.' },
        { status: 403 }
      );
    }

    // Create User (com criptografia Bcrypt e política de complexidade mínima)
    if (action === 'create_user') {
      if (!name || !email) {
        return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
      }

      if (!password || password.trim().length < 6) {
        return NextResponse.json(
          { error: 'Por motivos de segurança, a senha deve conter no mínimo 6 caracteres.' },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return NextResponse.json({ error: 'Já existe um usuário com esse e-mail.' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password.trim());

      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: role || 'TECNICO',
          permissions: JSON.stringify(permissions || []),
          active: active !== undefined ? active : true,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      await logAuditAction({
        userId: sessionUser.id,
        userName: sessionUser.name,
        userEmail: sessionUser.email,
        action: 'CREATE',
        entity: 'Usuario',
        entityId: newUser.id,
        details: `Novo usuário criado: ${newUser.name} (${newUser.email}) - Cargo: ${newUser.role} por ${sessionUser.name}`,
      });

      const { password: _, ...safeUser } = newUser;
      return NextResponse.json({ user: safeUser });
    }

    // Update User / Permissions (com criptografia Bcrypt e desbloqueio)
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
        failedAttempts: 0,
        lockedUntil: null,
      };

      if (password && password.trim().length > 0) {
        if (password.trim().length < 6) {
          return NextResponse.json(
            { error: 'A nova senha deve possuir no mínimo 6 caracteres.' },
            { status: 400 }
          );
        }
        updateData.password = await hashPassword(password.trim());
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      await logAuditAction({
        userId: sessionUser.id,
        userName: sessionUser.name,
        userEmail: sessionUser.email,
        action: 'UPDATE',
        entity: 'Usuario',
        entityId: userId,
        details: `Dados do usuário ${updated.name} (${updated.email}) foram atualizados por ${sessionUser.name}`,
      });

      const { password: _, ...safeUpdated } = updated;
      return NextResponse.json({ user: safeUpdated });
    }

    // Delete User (via POST)
    if (action === 'delete_user') {
      if (!userId) {
        return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
      }

      if (userId === sessionUser.id) {
        return NextResponse.json(
          { error: 'Operação não permitida: Por segurança, você não pode excluir a sua própria conta ativa.' },
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
        userId: sessionUser.id,
        userName: sessionUser.name,
        userEmail: sessionUser.email,
        action: 'DELETE',
        entity: 'Usuario',
        entityId: userId,
        details: `Usuário ${targetUser.name} (${targetUser.email}) excluído por ${sessionUser.name}`,
      });

      return NextResponse.json({ success: true, message: `Usuário "${targetUser.name}" excluído com sucesso.` });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro em POST /api/auth:', error);
    return NextResponse.json({ error: 'Erro interno ao processar requisição.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Faça login com credenciais de administrador.' },
        { status: 401 }
      );
    }

    const sessionRole = (sessionUser.role || '').toUpperCase();
    if (sessionRole !== 'ADMIN' && sessionRole !== 'GERENTE') {
      return NextResponse.json(
        { error: 'Acesso negado: Somente administradores e gerentes possuem permissão para excluir usuários.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId') || searchParams.get('id');

    try {
      const body = await request.json();
      if (body.userId) userId = body.userId;
      if (body.id) userId = body.id;
    } catch {
      // Body opcional
    }

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    if (userId === sessionUser.id) {
      return NextResponse.json(
        { error: 'Operação não permitida: Por segurança, você não pode excluir a sua própria conta ativa.' },
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
      userId: sessionUser.id,
      userName: sessionUser.name,
      userEmail: sessionUser.email,
      action: 'DELETE',
      entity: 'Usuario',
      entityId: userId,
      details: `Usuário ${targetUser.name} (${targetUser.email}) excluído por ${sessionUser.name}`,
    });

    return NextResponse.json({ success: true, message: `Usuário "${targetUser.name}" excluído com sucesso.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir usuário' }, { status: 500 });
  }
}
