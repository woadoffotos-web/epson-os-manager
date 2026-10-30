import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, AUTH_COOKIE_NAME } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Rotas que não são da API passam direto
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 1. O endpoint de autenticação (/api/auth) gerencia diretamente seu próprio ciclo
  // de login, logout e verificação de permissões administrativas.
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 2. Extrair token do Cookie ou do Header Authorization
  let token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // 3. Validação do Token JWT Criptografado
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    return NextResponse.json(
      { error: 'Acesso não autorizado. Faça login no sistema para continuar.' },
      { status: 401 }
    );
  }

  const role = (user.role || '').toUpperCase();
  const isAdminOrManager = role === 'ADMIN' || role === 'GERENTE';

  // 4. Controle de Acesso Baseado em Função (RBAC)
  // 4.1 Histórico de Auditoria: Apenas Administradores e Gerentes
  if (pathname.startsWith('/api/audit-logs')) {
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'Acesso negado: Somente administradores e gerentes podem visualizar a trilha de auditoria.' },
        { status: 403 }
      );
    }
  }

  // 4.2 Configurações de Gestão (Criação/Edição/Exclusão de Situações e Modelos): Apenas Admin/Gerente
  if (pathname.startsWith('/api/management') && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'Acesso negado: Somente administradores e gerentes podem alterar configurações do sistema.' },
        { status: 403 }
      );
    }
  }

  // 5. Injetar cabeçalhos seguros verificados na requisição
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-role', user.role);
  requestHeaders.set('x-user-name', encodeURIComponent(user.name));
  requestHeaders.set('x-user-email', user.email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
