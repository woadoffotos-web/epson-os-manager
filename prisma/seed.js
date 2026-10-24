const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Carga de Dados Mestres Epson CSA ---');

  // 1. Tipos de Equipamentos
  const tiposData = ['EcoTank', 'Projetor', 'Térmica', 'Comercial'];
  const tiposMap = {};
  for (const nome of tiposData) {
    const t = await prisma.equipmentType.upsert({
      where: { name: nome },
      update: {},
      create: { name: nome },
    });
    tiposMap[nome] = t.id;
  }

  // 2. Modelos e Tipos
  const modelosData = [
    { name: 'CO-W01', tipo: 'Projetor' },
    { name: 'Projetor', tipo: 'Projetor' },
    { name: 'L120', tipo: 'EcoTank' },
    { name: 'L121', tipo: 'EcoTank' },
    { name: 'L1250', tipo: 'EcoTank' },
    { name: 'L18050', tipo: 'EcoTank' },
    { name: 'L8050', tipo: 'EcoTank' },
    { name: 'L14150', tipo: 'EcoTank' },
    { name: 'L3210', tipo: 'EcoTank' },
    { name: 'L3250', tipo: 'EcoTank' },
    { name: 'L4150', tipo: 'EcoTank' },
    { name: 'L4160', tipo: 'EcoTank' },
    { name: 'L4260', tipo: 'EcoTank' },
    { name: 'L475', tipo: 'EcoTank' },
    { name: 'L5190', tipo: 'EcoTank' },
    { name: 'L5290', tipo: 'EcoTank' },
    { name: 'L5590', tipo: 'EcoTank' },
    { name: 'L6171', tipo: 'EcoTank' },
    { name: 'L6270', tipo: 'EcoTank' },
    { name: 'L8180', tipo: 'EcoTank' },
    { name: 'L850', tipo: 'EcoTank' },
    { name: 'M1120', tipo: 'EcoTank' },
    { name: 'M2120', tipo: 'EcoTank' },
    { name: 'M2140', tipo: 'EcoTank' },
    { name: 'M2170', tipo: 'EcoTank' },
    { name: 'M3170', tipo: 'EcoTank' },
    { name: 'TM-TX20', tipo: 'Térmica' },
    { name: 'F170', tipo: 'Comercial' },
    { name: 'F570', tipo: 'Comercial' },
    { name: 'WF-5810', tipo: 'Comercial' },
    { name: 'WF-5890', tipo: 'Comercial' }
  ];

  const modelosMap = {};
  for (const m of modelosData) {
    const mod = await prisma.equipmentModel.upsert({
      where: { name: m.name },
      update: { typeId: tiposMap[m.tipo] },
      create: { name: m.name, typeId: tiposMap[m.tipo] },
    });
    modelosMap[m.name] = mod.id;
  }

  // 3. Situações Operacionais com Cores Oficiais
  const situacoesData = [
    { name: 'Orçar', color: '#E9D5FF', isCanceled: false, order: 1 },        // Lilás
    { name: 'Diagnóstico', color: '#BAE6FD', isCanceled: false, order: 2 },  // Azul claro
    { name: '12H', color: '#93C5FD', isCanceled: false, order: 3 },          // Azul médio
    { name: 'Em revisão', color: '#60A5FA', isCanceled: false, order: 4 },   // Azul mais escuro
    { name: 'Cabeça molho', color: '#D9F99D', isCanceled: false, order: 5 }, // Verde oliva claro
    { name: 'Email', color: '#A7F3D0', isCanceled: false, order: 6 },        // Menta
    { name: 'Pendente', color: '#FED7AA', isCanceled: false, order: 7 },     // Pêssego
    { name: 'Em reparo', color: '#FDBA74', isCanceled: false, order: 8 },    // Laranja
    { name: 'Consertada', color: '#FB923C', isCanceled: false, order: 9 },   // Coral
    { name: 'Retirada', color: '#FEF08A', isCanceled: false, order: 10 },    // Amarelo suave
    { name: 'Anulada', color: '#FACC15', isCanceled: true, order: 11 },      // Amarelo ouro (ignora métricas)
  ];

  const situacoesMap = {};
  for (const s of situacoesData) {
    const sit = await prisma.situation.upsert({
      where: { name: s.name },
      update: { color: s.color, isCanceled: s.isCanceled, order: s.order },
      create: s,
    });
    situacoesMap[s.name] = sit.id;
  }

  // 4. Locais Físicos (1A até 16H = 128 posições)
  const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const locaisMap = {};
  let locOrder = 1;
  for (let fileira = 1; fileira <= 16; fileira++) {
    for (const letra of letras) {
      const codigo = `${fileira}${letra}`;
      const loc = await prisma.location.upsert({
        where: { code: codigo },
        update: {},
        create: { code: codigo, order: locOrder++ },
      });
      locaisMap[codigo] = loc.id;
    }
  }

  // 5. Usuários e Perfis
  const usersData = [
    {
      name: 'Administrador Epson',
      email: 'admin@epson.com.br',
      role: 'ADMIN',
      permissions: JSON.stringify(['ALL']),
    },
    {
      name: 'Gerente da Assistência',
      email: 'gerente@csa.com.br',
      role: 'GERENTE',
      permissions: JSON.stringify(['DASHBOARD_VIEW', 'OS_ALL', 'COURSES_ALL', 'MANAGEMENT_ALL', 'AUDIT_VIEW']),
    },
    {
      name: 'João Silva (Técnico)',
      email: 'joao.tecnico@csa.com.br',
      role: 'TECNICO',
      permissions: JSON.stringify(['DASHBOARD_VIEW', 'OS_EDIT', 'COURSES_VIEW']),
    },
    {
      name: 'Carlos Santos (Técnico)',
      email: 'carlos.tecnico@csa.com.br',
      role: 'TECNICO',
      permissions: JSON.stringify(['DASHBOARD_VIEW', 'OS_EDIT', 'COURSES_VIEW']),
    },
    {
      name: 'Ana Atendente',
      email: 'ana.atendimento@csa.com.br',
      role: 'ATENDENTE',
      permissions: JSON.stringify(['OS_CREATE', 'OS_SEARCH']),
    },
  ];

  const usersMap = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, permissions: u.permissions },
      create: { ...u, password: '123' },
    });
    usersMap[u.email] = user.id;
  }

  // 6. Cursos Obrigatórios
  const cursosData = [
    { title: 'Treinamento Linha EcoTank L3250 / L4260', isMandatory: true },
    { title: 'Desmontagem, Limpeza e Alinhamento de Cabeça CISS', isMandatory: true },
    { title: 'Segurança Operacional e Eletrostática Epson', isMandatory: true },
    { title: 'Boletim BI 23_001 e Gestão de Garantia', isMandatory: true },
    { title: 'Atendimento e Procedimentos de Auditoria CSA', isMandatory: true },
  ];

  const cursos = [];
  for (const c of cursosData) {
    const curso = await prisma.course.upsert({
      where: { title: c.title },
      update: {},
      create: c,
    });
    cursos.push(curso);
  }

  // Concluir cursos pelos técnicos para gerar 100% de cobertura empresarial
  // João fez cursos 0, 1 e 2; Carlos fez cursos 3 e 4
  const joaoId = usersMap['joao.tecnico@csa.com.br'];
  const carlosId = usersMap['carlos.tecnico@csa.com.br'];

  await prisma.technicianCourse.upsert({
    where: { technicianId_courseId: { technicianId: joaoId, courseId: cursos[0].id } },
    update: { completed: true },
    create: { technicianId: joaoId, courseId: cursos[0].id, completed: true, completedAt: new Date() },
  });
  await prisma.technicianCourse.upsert({
    where: { technicianId_courseId: { technicianId: joaoId, courseId: cursos[1].id } },
    update: { completed: true },
    create: { technicianId: joaoId, courseId: cursos[1].id, completed: true, completedAt: new Date() },
  });
  await prisma.technicianCourse.upsert({
    where: { technicianId_courseId: { technicianId: joaoId, courseId: cursos[2].id } },
    update: { completed: true },
    create: { technicianId: joaoId, courseId: cursos[2].id, completed: true, completedAt: new Date() },
  });
  await prisma.technicianCourse.upsert({
    where: { technicianId_courseId: { technicianId: carlosId, courseId: cursos[3].id } },
    update: { completed: true },
    create: { technicianId: carlosId, courseId: cursos[3].id, completed: true, completedAt: new Date() },
  });
  await prisma.technicianCourse.upsert({
    where: { technicianId_courseId: { technicianId: carlosId, courseId: cursos[4].id } },
    update: { completed: true },
    create: { technicianId: carlosId, courseId: cursos[4].id, completed: true, completedAt: new Date() },
  });

  // 7. Nota Anual de Auditoria para FY 2026
  await prisma.annualAudit.upsert({
    where: { fiscalYear: 2026 },
    update: { score: 90.1 },
    create: { fiscalYear: 2026, score: 90.1 },
  });

  // 8. Registro de Log de Auditoria Inicial (sem ordens de teste fictícias)
  await prisma.auditLog.create({
    data: {
      userName: 'Sistema (Carga Inicial)',
      userEmail: 'admin@epson.com.br',
      action: 'CREATE',
      entity: 'Sistema',
      entityId: 'SEED-INIT',
      details: 'Carga inicial de dados mestres: modelos, situações, locais e cursos concluída com sucesso.',
    },
  });

  console.log('--- Carga de Dados Mestres Concluída com Sucesso! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
