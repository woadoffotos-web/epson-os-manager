import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, AUTH_COOKIE_NAME } from '@/lib/jwt';

// Rotas públicas que não exigem autenticação
const PUBLIC_PATHS = [
  '/',
  '/api/auth',
  '/_next',
  '/favicon.ico',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir arquivos estáticos do Next.js e ícones
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Permitir a página inicial de login e a rota de autenticação
  if (pathname === '/' || pathname === '/api/auth') {
    return NextResponse.next();
  }

  // 1. Extrair token do Cookie ou do Header Authorization
  let token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // 2. Se não houver token ou token for inválido
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    // Se for uma requisição de API, responder com 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Faça login no sistema para continuar.' },
        { status: 401 }
      );
    }

    // Se for uma página, redirecionar para a tela de login
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Controle de Permissões por Papel (RBAC) para páginas restritas
  const role = (user.role || '').toUpperCase();
  const isManagerOrAdmin = role === 'ADMIN' || role === 'GERENTE';

  if (pathname.startsWith('/gerencia') || pathname.startsWith('/usuarios')) {
    if (!isManagerOrAdmin) {
      // Bloquear acesso e redirecionar técnico/atendente para o painel de OS
      return NextResponse.redirect(new URL('/os', request.url));
    }
  }

  // 4. Injetar cabeçalhos seguros verificados na requisição
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
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
