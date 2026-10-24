import { prisma } from './prisma';

export async function logAuditAction({
  userId,
  userName = 'Usuário',
  userEmail,
  action,
  entity,
  entityId,
  details,
  oldValues,
  newValues,
}: {
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  entity: string;
  entityId: string;
  details: string;
  oldValues?: any;
  newValues?: any;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userName,
        userEmail: userEmail || null,
        action,
        entity,
        entityId,
        details,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
      },
    });
  } catch (error) {
    console.error('Falha ao gravar log de auditoria:', error);
  }
}
