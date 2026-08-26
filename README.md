# Máfia do Apito

App de estatísticas de pelada: ranking público, área de admin e pelada ao vivo com sincronização em tempo real via Pusher.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Prisma · PostgreSQL (Neon) · Pusher · Vercel

## Rotas

| Rota | Acesso | O que faz |
| --- | --- | --- |
| `/` | Público | Top 5 de artilheiros, vencedores, garçons e participações em gols |
| `/login` | Público | Entrada do admin (link escondido no rodapé do ranking) |
| `/admin/jogadores` | Admin | CRUD de jogadores (nome + 1 a 5 estrelas) e importação de estrelas por `.txt` |
| `/admin/peladas` | Admin | Histórico com status, criação e exclusão de peladas |
| `/admin/peladas/nova` | Admin | Convocação (até 18), divisão manual ou "Gerar Times" equilibrado |
| `/pelada/[uuid]` | Público | Placar ao vivo; qualquer um edita, só o admin encerra/reabre |

## Importação de estrelas por arquivo `.txt`

Em `/admin/jogadores` o botão **Importar .txt** atualiza as estrelas de vários
jogadores de uma vez. Aceita somente `.txt`, no máximo 200 KB.

**Só atualiza quem já está cadastrado — nenhum jogador novo é criado.**

Formato obrigatório: um jogador por linha, `Nome <separador> nota`, com a nota no
fim da linha.

- Separadores aceitos: `-`, `;`, `:`, `|`, `=`.
- Nota de `0,5` a `5`, de meia em meia estrela, com vírgula ou ponto.
- Sufixo `estrela` / `estrelas` é opcional.

```txt
# válidas
João da Silva - 4,5
Pedro Henrique;3
Zé Roberto = 5 estrelas
Marcos | 2.5

# ignoradas (aparecem no aviso)
Rafael          → sem separador e sem nota
Ana - 6         → fora da faixa de 0,5 a 5
Bruno - 3,7     → não é meia estrela
```

**Outras regras**

- Linhas em branco são ignoradas; linhas começando com `#` são comentários.
- Numeração no início da linha (`1.`, `2 -`, `3)`) é removida automaticamente.
- O nome é comparado com o cadastro ignorando maiúsculas, acentos e espaços extras
  (`joao da silva` casa com `João da Silva`).
- Caracteres invisíveis e espaços especiais que vêm de copiar/colar (WhatsApp, PDF)
  são removidos antes da comparação.
- Nome repetido no arquivo vale só na primeira ocorrência.
- Linha fora do formato é ignorada e listada no aviso da tela — a importação não
  falha inteira por causa dela.

Ao final, o aviso mostra quantos foram atualizados, quantos já estavam com a mesma
nota e o nome de cada um que não pôde ser aplicado.

## Setup

```bash
npm install
cp .env.example .env
```

Preencha o `.env`:

- `DATABASE_URL` — string de conexão do Neon
- `ADMIN_PASSWORD` — senha única do admin
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` — credenciais do app Pusher (servidor)
- `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` — mesma key/cluster, expostas ao cliente

Crie o schema no banco e rode:

```bash
npx prisma migrate dev --name init
npm run dev
```

Sem as variáveis do Pusher o app continua funcionando: as atualizações do placar chegam pela resposta da Server Action e ao voltar o foco na aba, apenas sem push instantâneo para os outros dispositivos.

## Deploy na Vercel

1. Importe o repositório e configure as variáveis de ambiente acima.
2. O `build` já roda `prisma generate`.
3. Aplique as migrations no banco de produção com `npx prisma migrate deploy`.

## Regras do encerramento

Ao encerrar uma pelada, o histórico global é consolidado:

1. Gols e assistências da pelada somam ao total de cada jogador.
2. `matchesPlayed` +1 para todos os presentes.
3. Artilheiro(s) do dia recebem +1 em `topScorerCount` (empate premia todos).
4. Garçom(ns) do dia recebem +1 em `topAssisterCount`.
5. Jogadores do Campeão do Dia recebem +1 em `totalWins`.

O campeão sai por mais vitórias; empatou, desempata por número de empates; persistindo o empate, o box de pênaltis define o campeão com confirmação. Reabrir a pelada desfaz exatamente essa consolidação.
