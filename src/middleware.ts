import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, AUTH_COOKIE_NAME } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Interceptar apenas rotas de API protegidas (exceto login /api/auth)
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth')) {
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

  // 2. Se for requisição direta de API e não tiver token válido
  // Nota: permitimos se a requisição vier do próprio navegador autenticado
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    return NextResponse.json(
      { error: 'Acesso não autorizado. Faça login no sistema para continuar.' },
      { status: 401 }
    );
  }

  // 3. Injetar cabeçalhos seguros verificados na requisição
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
