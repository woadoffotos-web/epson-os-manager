import bcrypt from 'bcryptjs';
export * from './jwt';

/**
 * Gera o hash criptográfico seguro (Bcrypt com Salt 10)
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compara a senha informada com o hash salvo no banco.
 * Suporta transição suave caso a senha ainda esteja em texto puro.
 */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (!storedHash) return { isValid: false, needsRehash: false };

  // Se o hash salvo começar com os prefixos padrão do Bcrypt
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    const isValid = await bcrypt.compare(plainPassword, storedHash);
    return { isValid, needsRehash: false };
  }

  // Caso legado (texto puro ainda não migrado)
  const isValid = plainPassword === storedHash;
  return { isValid, needsRehash: true };
}

/**
 * Verifica se a conta está temporariamente bloqueada por excesso de tentativas
 */
export function checkAccountLock(lockedUntil: Date | null | undefined): { isLocked: boolean; remainingMinutes: number } {
  if (!lockedUntil) return { isLocked: false, remainingMinutes: 0 };

  const now = new Date().getTime();
  const lockTime = new Date(lockedUntil).getTime();

  if (lockTime > now) {
    const remainingMs = lockTime - now;
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    return { isLocked: true, remainingMinutes };
  }

  return { isLocked: false, remainingMinutes: 0 };
}
