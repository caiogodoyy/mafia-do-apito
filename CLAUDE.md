# CONTEXTO DO PROJETO: MÁFIA DO APITO

Você atua como um Engenheiro de Software Sênior neste projeto. Esta é a documentação da "Máfia do Apito", uma aplicação web para controle de estatísticas de futebol (peladas). O deploy será feito na Vercel e o banco de dados no Neon (PostgreSQL). Use estas diretrizes como base para todo o código gerado.

## ARQUITETURA E TECNOLOGIAS
- **Stack:** Next.js 14+ (App Router), Node.js 20.x (LTS), TypeScript, Tailwind CSS, Lucide React.
- **Banco de Dados:** PostgreSQL (Neon) com Prisma ORM.
- **Autenticação:** Cookie simples validado via variável de ambiente `ADMIN_PASSWORD` (apenas 1 admin).
- **Tempo Real:** Integração com **Pusher** (WebSockets) na página da pelada. Ao invés de polling, a API atualiza o banco e emite um evento no Pusher, que atualiza todos os clientes conectados instantaneamente e sem sobrecarregar o banco de dados.

## ESTRUTURA DE PASTAS PADRÃO
Mantenha o código organizado na seguinte estrutura (usando o diretório `src/`):
- `prisma/`: Contém o `schema.prisma`.
- `src/app/`: Rotas, páginas (`page.tsx`) e layouts (`layout.tsx`).
- `src/components/`: Componentes isolados de UI (ex: Botões, Modais, Box de Pênaltis, Provedor do Pusher).
- `src/lib/`: Instâncias globais e configurações (ex: `prisma.ts` e `pusher.ts`).
- `src/actions/`: Server Actions do Next.js para mutações e consultas seguras no banco de dados.

## RESTRIÇÕES E SEGURANÇA (O QUE NÃO FAZER)
- 🚫 **NUNCA** comitar, sugerir comitar ou expor arquivos `.env`, `.env.local` ou quaisquer chaves secretas.
- 🚫 **NUNCA** editar ou rodar arquivos de migrations SQL do Prisma depois que já tiverem sido criadas.
- 🚫 **NUNCA** executar comandos destrutivos no banco de dados (como `npx prisma migrate reset`) sem antes pedir confirmação explícita ao desenvolvedor.
- 🚫 **NUNCA** rodar comandos de instalação de dependências automaticamente. Apenas forneça o comando (ex: `npm install pacote`) para que o desenvolvedor execute manualmente no terminal.
- 🚫 **NUNCA** adicionar comentários no código.

## REGRAS DE NEGÓCIO E ROTAS

### 1. Dashboard Público (`/`)
Ranking "Top 5" visível para todos:
- **Artilheiros:** Baseado em `topScorerCount`.
- **Vencedores:** Baseado no `totalWins` (Vezes que foi Campeão do Dia).
- **Garçons:** Baseado em `topAssisterCount`.
- **Participações em Gols:** Soma Total de Gols + Total de Assistências.
- Link escondido para `/login`.

### 2. Área do Admin
- **`/admin/jogadores`**: CRUD completo. O admin pode cadastrar, editar (nome e número de estrelas de 0,5 a 5, aceitando meia estrela) e deletar jogadores.
- **`/admin/peladas`**: Lista o histórico exibindo o status ("Encerrada" ou "Aberta"), botão "Nova Pelada" e opção de excluir uma pelada (com confirmação; excluir uma pelada encerrada estorna as estatísticas do histórico global).
- **`/admin/peladas/nova`**: Formulário com seleção de data, checkbox para marcar até 18 jogadores e divisão de times (máx. 6/time). O admin pode dividir manualmente ou usar o botão "Gerar Times" (algoritmo que distribui os jogadores buscando o máximo de equilíbrio na soma total de estrelas (rating) de cada equipe).

### 3. Pelada Ao Vivo (`/pelada/[uuid]`)
- Acesso livre para acompanhar e interagir via **WebSockets (Pusher)** para sincronização em tempo real.
- Qualquer pessoa altera Gols/Assistências de jogadores e Vitórias/Empates dos times via botões `+` e `-`.
- Apenas o Admin pode clicar em "Encerrar Pelada" ou reabri-la.

### 4. Regras de Encerramento (Core Logic)
Ao encerrar, os dados consolidam no histórico global:
1. Soma gols e assistências feitos na pelada ao total do jogador.
2. Adiciona +1 ao `matchesPlayed` de todos presentes.
3. Jogador(es) com mais gols no dia ganha(m) +1 no `topScorerCount` (empates premiam todos no topo).
4. Jogador(es) com mais assistências ganha(m) +1 no `topAssisterCount`.
5. Os jogadores do time consagrado como **Campeão do Dia** (ver regras abaixo) recebem +1 no contador global de `totalWins`.

### 5. Desempate e Campeão do Dia (Box Fixo)
- **Vitória Direta:** O time com mais vitórias na pelada é o campeão. O box exibe: "🏆 Time X é o Campeão!".
- **Empates:** Se houver empate em vitórias entre times, o número de "Empates" de cada time serve como critério de desempate.
- **Pênaltis (Interativo):** Se persistir o empate total, o box exibe "⚠️ Pênaltis: [Time X] vs [Time Y]". Os nomes dos times são botões clicáveis que abrem um popup de confirmação. Ao confirmar, consagra o campeão, atualiza o `totalWins` e muda o box para o estado padrão de vitória.

## MODELO PRISMA (BASE)
- `Player`: id, name, rating (Float, 0,5 a 5 com incrementos de 0,5), totalWins, totalGoals, totalAssists, topScorerCount, topAssisterCount, matchesPlayed.
- `Match`: id (UUID), date, status (OPEN, CLOSED).
- `MatchTeam`: id, matchId, name (Time 1, 2, 3), wins, draws.
- `MatchPlayer`: id, matchId, matchTeamId, playerId, goals, assists.

## DIRETRIZES
- Código limpo e modular, com tratamento de erros de UI (ex: estourar limite de 6 pessoas por time).
- Design mobile-first com Tailwind, visual moderno de app nativo, idioma Português do Brasil.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
