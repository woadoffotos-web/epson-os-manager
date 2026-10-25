const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Criptografia de Senhas com Bcrypt ---');

  const users = await prisma.user.findMany();
  console.log(`Encontrados ${users.length} usuários.`);

  let updatedCount = 0;
  for (const user of users) {
    const isAlreadyHashed =
      user.password.startsWith('$2a$') ||
      user.password.startsWith('$2b$') ||
      user.password.startsWith('$2y$');

    if (!isAlreadyHashed) {
      console.log(`Criptografando senha do usuário: ${user.name} (${user.email})...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      updatedCount++;
    } else {
      console.log(`Usuário ${user.name} já possui senha criptografada.`);
    }
  }

  console.log(`--- Sucesso! ${updatedCount} senhas foram criptografadas com Bcrypt. ---`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
