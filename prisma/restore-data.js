const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Restauração / Carga dos Dados no Banco Cloud ---');

  const backupPath = path.join(__dirname, 'data-backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error('Arquivo data-backup.json não encontrado!');
    return;
  }

  const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  // 1. Tipos de Equipamento
  for (const t of data.equipmentTypes || []) {
    await prisma.equipmentType.upsert({
      where: { id: t.id },
      update: { name: t.name },
      create: t,
    });
  }

  // 2. Modelos
  for (const m of data.equipmentModels || []) {
    await prisma.equipmentModel.upsert({
      where: { id: m.id },
      update: { name: m.name, typeId: m.typeId },
      create: m,
    });
  }

  // 3. Situações
  for (const s of data.situations || []) {
    await prisma.situation.upsert({
      where: { id: s.id },
      update: { name: s.name, color: s.color, isCanceled: s.isCanceled, order: s.order },
      create: s,
    });
  }

  // 4. Locais
  for (const l of data.locations || []) {
    await prisma.location.upsert({
      where: { id: l.id },
      update: { code: l.code, order: l.order },
      create: l,
    });
  }

  // 5. Usuários
  for (const u of data.users || []) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        permissions: u.permissions,
        active: u.active,
      },
      create: u,
    });
  }

  // 6. Cursos
  for (const c of data.courses || []) {
    await prisma.course.upsert({
      where: { id: c.id },
      update: { title: c.title, isMandatory: c.isMandatory },
      create: c,
    });
  }

  // 7. Cursos dos Técnicos
  for (const tc of data.technicianCourses || []) {
    await prisma.technicianCourse.upsert({
      where: { id: tc.id },
      update: { completed: tc.completed, completedAt: tc.completedAt ? new Date(tc.completedAt) : null },
      create: {
        ...tc,
        completedAt: tc.completedAt ? new Date(tc.completedAt) : null,
      },
    });
  }

  // 8. Auditoria Anual
  for (const a of data.annualAudits || []) {
    await prisma.annualAudit.upsert({
      where: { id: a.id },
      update: { fiscalYear: a.fiscalYear, score: a.score },
      create: a,
    });
  }

  // 9. Ordens de Serviço Reais
  for (const o of data.workOrders || []) {
    const dates = [
      'entryDate',
      'diagnosisDate',
      'emailSentDate',
      'emailReceivedDate',
      'partsOrderDate',
      'partsInvoiceDate',
      'partsArrivalDate',
      'repairDate',
      'notice1Date',
      'notice2Date',
      'notice3Date',
      'systemExitDate',
      'exitDate',
    ];

    const formattedOrder = { ...o };
    for (const d of dates) {
      if (formattedOrder[d]) {
        formattedOrder[d] = new Date(formattedOrder[d]);
      }
    }

    await prisma.workOrder.upsert({
      where: { id: o.id },
      update: formattedOrder,
      create: formattedOrder,
    });
  }

  console.log('--- Restauração Concluída com Sucesso! Todos os dados estão no banco. ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
