# CONTEXTO DO PROJETO: MÁFIA DO APITO

Você atua como um Engenheiro de Software Sênior neste projeto. A "Máfia do Apito" é uma aplicação web (PWA mobile-first) para controle de estatísticas de futebol amador (peladas). Deploy na Vercel e banco no Neon (PostgreSQL). Use estas diretrizes como base para todo o código gerado.

## ARQUITETURA E TECNOLOGIAS
- **Stack:** Next.js 16 (App Router, Server Components + Server Actions), React 19, Node.js 20.x, TypeScript, Tailwind CSS 3, Lucide React.
- **Banco de Dados:** PostgreSQL (Neon) com Prisma ORM 5.
- **Autenticação:** cookie httpOnly `mafia_admin` contendo o hash SHA-256 da variável `ADMIN_PASSWORD` (apenas 1 admin). Comparação com `timingSafeEqual`. Helpers em `src/lib/auth.ts` (`isAdmin`, `requireAdmin`, `startAdminSession`, `endAdminSession`).
- **Tempo Real:** Pusher (WebSockets) na página da pelada. Nada de polling: a Server Action grava no banco, incrementa `Match.version` e emite o estado completo no canal `pelada-<matchId>` (evento `match:update`). Se as variáveis do Pusher não estiverem configuradas, o broadcast é silenciosamente ignorado e a UI continua funcionando via Server Actions.
- **PWA:** manifest + instruções de instalação no iOS (`IosInstallSheet`, `src/lib/pwa.ts`).

## ESTRUTURA DE PASTAS
- `prisma/`: `schema.prisma` e `migrations/`.
- `src/app/`: rotas e layouts.
  - `/` dashboard público, `/login`, `/admin/peladas`, `/admin/peladas/nova`, `/admin/jogadores`, `/pelada/[uuid]`.
- `src/actions/`: Server Actions — `auth.ts`, `players.ts`, `matches.ts` (CRUD/encerramento), `live.ts` (mutações ao vivo), `rankings.ts` (estatísticas).
- `src/components/`: componentes de UI (`PusherProvider`, `LiveMatch`, `TeamCard`, `ChampionBox`, `StatStepper`, `PlayerStatsTable`, `NewMatchForm`, `PlayersManager`, `ConfirmDialog`, etc.).
- `src/lib/`: regras puras e instâncias globais — `prisma.ts`, `pusher.ts` / `pusher-client.ts`, `champion.ts` (campeão do dia), `balance.ts` (geração de times), `optimistic.ts` (UI otimista), `match-state.ts` (serialização do estado), `stats.ts`, `period.ts`, `import-txt.ts`, `format.ts`, `auth.ts`, `pwa.ts`, `types.ts`.

## RESTRIÇÕES E SEGURANÇA (O QUE NÃO FAZER)
- 🚫 **NUNCA** comitar, sugerir comitar ou expor arquivos `.env`, `.env.local` ou quaisquer chaves secretas.
- 🚫 **NUNCA** editar ou rodar arquivos de migrations SQL do Prisma depois que já tiverem sido criadas.
- 🚫 **NUNCA** executar comandos destrutivos no banco (como `npx prisma migrate reset`) sem confirmação explícita do desenvolvedor.
- 🚫 **NUNCA** rodar comandos de instalação de dependências automaticamente. Apenas forneça o comando (ex: `npm install pacote`).
- 🚫 **NUNCA** adicionar comentários no código.

## REGRAS DE NEGÓCIO E ROTAS

### 1. Dashboard Público (`/`)
- Tabela de estatísticas ordenável (`PlayerStatsTable`), limitada a `STATS_LIMIT` (20) linhas, com colunas: PJ (peladas jogadas), ART (artilharias), GAR (garçons), G (gols), A (assistências) e MÉD (média de participação em gol = (gols + assistências) / peladas jogadas). Ordenação padrão por gols.
- Filtro de período (`PeriodFilter`): **Mês**, **Ano** e **Geral**. "Geral" lê os totais acumulados em `Player`; os demais recalculam a partir das peladas encerradas dentro do intervalo.
- Banner "Pelada em andamento" quando existe uma `Match` com status `OPEN`.
- Admin logado enxerga um botão de exportar/copiar a tabela.
- Link escondido para `/login` no rodapé.

### 2. Área do Admin
- **`/admin/jogadores`**: CRUD completo. Nome e rating de 0,5 a 5 estrelas (incrementos de 0,5). Também aceita importação de um arquivo `.txt` (`TxtImportButton` + `src/lib/import-txt.ts`) para atualizar ratings em massa; a importação normaliza acentos/caracteres invisíveis e reporta linhas inválidas, nomes não encontrados e duplicados.
- **`/admin/peladas`**: histórico com status ("Aberta"/"Encerrada"), campeão, botão "Nova Pelada" e exclusão com confirmação (excluir uma pelada encerrada estorna as estatísticas globais).
- **`/admin/peladas/nova`**: data, seleção de até `MAX_PLAYERS_PER_MATCH` (18) jogadores e divisão em times de no máximo `MAX_PLAYERS_PER_TEAM` (6). Divisão manual ou botão "Gerar Times" (`src/lib/balance.ts`): algoritmo que gera candidatos com seed pseudoaleatório, minimiza a diferença entre a soma de ratings dos times e evita repetir a divisão anterior (`teamsSignature` + penalidade de repetição), produzindo uma divisão diferente a cada clique.

### 3. Pelada Ao Vivo (`/pelada/[uuid]`)
- Acesso livre para acompanhar e interagir; sincronização em tempo real via Pusher (`PusherProvider`).
- Qualquer pessoa altera Gols/Assistências dos jogadores e Vitórias/Empates dos times pelos botões `+` / `-`.
- A UI é otimista (`src/lib/optimistic.ts`): o estado local aplica o delta na hora e é reconciliado pelo retorno da Server Action ou pelo evento do Pusher. Os incrementos no banco usam `GREATEST(0, ...)` — nenhum contador fica negativo.
- Qualquer alteração de vitórias/empates limpa o `penaltyWinnerTeamId`, forçando nova decisão se o empate voltar a existir.
- Apenas o Admin pode "Encerrar Pelada" ou reabri-la.

### 4. Regras de Encerramento (Core Logic)
Ao encerrar (`closeMatch` em `src/actions/matches.ts`), os dados consolidam no histórico global:
1. Soma gols e assistências da pelada ao total do jogador.
2. Adiciona +1 ao `matchesPlayed` de todos os presentes.
3. Jogador(es) com mais gols no dia ganha(m) +1 em `topScorerCount` (empates premiam todos no topo; só conta se o máximo for > 0).
4. Jogador(es) com mais assistências ganha(m) +1 em `topAssisterCount` (mesma regra).
5. Os jogadores do **Campeão do Dia** recebem +1 em `totalWins`.

Não é possível encerrar sem nenhum resultado registrado nem com uma disputa de pênaltis pendente. Reabrir a pelada (`reopenMatch`) aplica exatamente as mesmas operações com sinal invertido, estornando o histórico.

### 5. Campeão do Dia — Pontos Corridos (`src/lib/champion.ts`)
- **Pontuação:** vitória vale **3 pontos** (`WIN_POINTS`) e empate vale **1 ponto** (`DRAW_POINTS`). A pontuação do time é `wins * 3 + draws * 1` (`teamPoints`).
- **Campeão:** o time com **mais pontos** é o Campeão do Dia. O box exibe "🏆 Time X é o Campeão!" com o motivo "Mais pontos na pelada" e o total de pontos.
- **Empate em pontos:** não há critério de desempate automático — vai direto para os pênaltis.
- **Pênaltis (interativo):** o box exibe "⚠️ Pênaltis" e os nomes dos times empatados como botões. Ao confirmar no popup, o time vira Campeão do Dia (`penaltyWinnerTeamId`) e o box volta ao estado de vitória.
- **Pendente:** enquanto nenhum time tiver pontos, o box mostra "Campeão do Dia indefinido".
- `resolveChampion` retorna `PENDING`, `CHAMPION` (motivo `POINTS`, `PENALTY` ou `DEFINED`) ou `PENALTY`. Depois de encerrada, o campeão gravado em `Match.championTeamId` prevalece (motivo `DEFINED`).

## MODELO PRISMA
- `Player`: id, name, rating (Float, 0,5 a 5 com incrementos de 0,5), totalWins, totalGoals, totalAssists, topScorerCount, topAssisterCount, matchesPlayed.
- `Match`: id (UUID), date, status (OPEN | CLOSED), penaltyWinnerTeamId, championTeamId, version.
- `MatchTeam`: id, matchId, name ("Time 1", "Time 2", "Time 3"), position, wins, draws.
- `MatchPlayer`: id, matchId, matchTeamId, playerId, goals, assists (único por `matchId` + `playerId`).

## DIRETRIZES
- Código limpo e modular. Regra de negócio pura fica em `src/lib/`, acesso ao banco em `src/actions/`, UI em `src/components/`.
- Server Actions sempre retornam `ActionResult<T>` (`{ ok: true, data }` ou `{ ok: false, error }`) com mensagem em português; nada de exceção vazando para o cliente.
- Tratamento de erros de UI (ex: estourar o limite de 6 pessoas por time).
- Design mobile-first com Tailwind, visual moderno de app nativo, tema escuro, idioma Português do Brasil.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
