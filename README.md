# EPSON - Sistema de Gestão de Ordens de Serviço & Performance CSA

Sistema corporativo completo para Centros de Serviço Autorizado (CSA) Epson, controle de Ordens de Serviço, SLA, indicadores operacionais em tempo real, cálculo de pontuação oficial (Boletim Informativo BI 23_001), controle de acessos (RBAC) e trilha de auditoria completa.

---

## 🚀 Como Executar Localmente

### Opção 1: Atalho Rápido
Basta dar um duplo clique no arquivo:
```
iniciar.bat
```
Em seguida, abra no navegador: **[http://localhost:3000](http://localhost:3000)**

### Opção 2: Pelo Terminal / PowerShell
```bash
npm run dev
```

---

## 👤 Contas de Acesso Pré-Cadastradas

Você pode alternar entre os usuários no seletor no topo da tela ou logar com qualquer um:

| Nome | E-mail | Grupo | Permissões |
| :--- | :--- | :--- | :--- |
| **Administrador Epson** | `admin@epson.com.br` | ADMIN | Acesso total (todas as telas, configurações e logs) |
| **Gerente da Assistência** | `gerente@csa.com.br` | GERENTE | Gestão de OS, Dashboard, Cursos, Gerência e Auditoria |
| **João Silva (Técnico)** | `joao.tecnico@csa.com.br` | TECNICO | Edição técnica de OS, visualização de cursos |
| **Carlos Santos (Técnico)**| `carlos.tecnico@csa.com.br`| TECNICO | Edição técnica de OS, visualização de cursos |
| **Ana Atendente** | `ana.atendimento@csa.com.br`| ATENDENTE | Cadastro de novas OS e Pesquisa |

*Senha padrão para todos:* `123`

---

## 🛠️ Principais Recursos Implementados

1. **Dashboard Executivo Oficial Epson:**
   - Cards superiores de resumo: `% Cursos obrigatórios`, `Qtd OS Consumer`, `TMR`, `TMPP`, `Grupo CSA`, `Nota Class Anual` e `Class Anual (PLATINUM/GOLD/etc.)`.
   - Régua mensal do Ano Fiscal Epson (**FY: Abril a Março**).
   - 6 Manômetros (*gauges*) semicirculares com agulha e marcador de meta.
   - 6 Gráficos de tendência mensal com curva realizada vs. linha de meta.
   - Tabela oficial de conversão de pontos e níveis do **Boletim BI 23_001** da Epson (0 a 30 pontos).

2. **Controle de O.S.:**
   - **Pop-up "Cadastrar O.S.":** Campos obrigatórios, críticas de validação com borda vermelha e **dupla checagem instantânea de reincidência (< 90 dias)** pelo número de série.
   - **Página "Gerenciar O.S.":** Seletor de mês/ano, barra com os 7 indicadores do mês recalculados em tempo real, grid completo com cabeçalhos agrupados e **auto-salvamento instantâneo** com feedback visual (*"✓ Salvo"*).
   - **Página "Pesquisa":** Filtros avançados por número de OS, modelo, série, técnico, situação, reincidência e busca geral.

3. **Módulo de Cursos:**
   - Catálogo de cursos obrigatórios (adicionar/excluir).
   - Matriz com todos os técnicos cadastrados e checkboxes de conclusão.
   - Aproveitamento individual por técnico.
   - Cálculo da cobertura geral da empresa para o Dashboard.

4. **Central de Gerência:**
   - **11 Situações Coloridas:** Orçar, Diagnóstico, 12H, Em revisão, Cabeça molho, Email, Pendente, Em reparo, Consertada, Retirada e Anulada (ignora SLA).
   - **128 Locais Físicos:** Posições de 1A até 16H.
   - **40 Modelos e Tipos Epson:** EcoTank, Comercial, Térmica e Projetor.
   - **Nota de Auditoria Anual:** Lançamento por Ano Fiscal (FY).

5. **Usuários, Permissões & Trilha de Auditoria:**
   - Criação e ativação/desativação de usuários.
   - Atribuição de grupos ou permissões individuais.
   - Histórico completo de auditoria com visualização de dados anteriores (*Before*) e novos (*After*).

---

## 🌐 Como Hospedar na Web para Acesso dos Usuários

### Opção Recomendada: Vercel + Supabase / Neon (100% Gratuito / Baixo Custo)
1. Crie um repositório no GitHub e envie os arquivos deste projeto.
2. Crie um banco PostgreSQL gratuito no [Supabase](https://supabase.com) ou [Neon](https://neon.tech).
3. Na [Vercel](https://vercel.com), importe o repositório do GitHub.
4. Nas variáveis de ambiente da Vercel, adicione `DATABASE_URL` apontando para o seu PostgreSQL.
5. Em `prisma/schema.prisma`, altere `provider = "sqlite"` para `provider = "postgresql"`.
6. O deploy será feito automaticamente e você terá um link seguro com SSL (ex: `https://sua-assistencia-epson.vercel.app`).
