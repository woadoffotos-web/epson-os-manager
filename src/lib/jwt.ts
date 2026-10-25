import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

const JWT_SECRET = process.env.JWT_SECRET || 'epson-csa-production-secret-token-2026-secure-key-9988';
const key = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = 'epson_session_token';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

/**
 * Assina e gera um token JWT criptografado válido por 7 dias
 */
export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

/**
 * Valida e decodifica o token JWT (Compatível com Edge Runtime e Node.js)
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
      permissions: (payload.permissions as string[]) || [],
    };
  } catch (error) {
    return null;
  }
}
