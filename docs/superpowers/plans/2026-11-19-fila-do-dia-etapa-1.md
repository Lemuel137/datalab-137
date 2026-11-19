# Fila do dia, etapa 1: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma tela `/fila` que mostra, por frente, os leads novos do dia (pela meta semanal), os follow-ups que vencem e quem respondeu, com botão que abre a conversa com o texto pronto e botão "enviei".

**Architecture:** Toda a regra fica em funções puras em `src/contracts/queue.ts` (cota do dia, validade do achado, follow-up vencido, texto e link). `src/domains/outreach/queue.ts` só carrega as linhas do banco e chama essas funções. A tela é um Server Component com Server Actions, como `/leads/[id]`.

**Tech Stack:** Next.js 16, Drizzle + Postgres, zod, vitest, pnpm, Node 24. Ler `AGENTS.md` (o Next desta versão tem mudanças; consultar `node_modules/next/dist/docs/` antes de escrever rota ou action).

**Spec:** `docs/superpowers/specs/2026-11-19-fila-do-dia-design.md`

**Escopo:** só a etapa 1 do desenho, mais a edição das frentes (puxada da etapa 4, porque sem ela não há como gravar meta semanal e textos). Captor e frente delivery (etapa 2), supressão (etapa 3) e criação de frente nova (etapa 4) têm plano próprio.

## Global Constraints

- Envio é sempre manual: o sistema abre a conversa e registra; nunca dispara.
- Um único follow-up por lead.
- Limite diário por canal: `fronts.dailyLimit` (Instagram 15, WhatsApp 20). Intervalo mínimo entre envios: 3 min no WhatsApp, 2 min nos demais.
- Follow-up vence com 3 dias úteis sem resposta.
- Achado de script vale 24 horas. Achado conferido vale no mesmo dia.
- "Dia" e "semana" são sempre no fuso `America/Sao_Paulo` (o servidor roda em UTC). Semana de segunda a sexta.
- Interface e mensagens em português. Sem dependência nova.
- Ramo `fila-do-dia`, criado a partir de `engajamento-e-achados`. Um commit por tarefa, mensagem terminando em `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. Sem push, sem produção.
- Verificação de cada tarefa: `pnpm vitest run`, `pnpm tsc --noEmit`, `pnpm eslint src`.

## Review Focus

1. **Virada do dia em UTC.** Envio às 22h de Brasília é "amanhã" em UTC; tem que contar no dia e na semana de Brasília. Teste na Tarefa 1.
2. **Abrir no fim de semana.** Cota de novos é 0; follow-ups e respostas continuam aparecendo. Teste na Tarefa 1.
3. **Telefone fora do padrão.** Com máscara, ou sem o 55: o link do WhatsApp sai com dígitos e DDI; número curto demais não gera link e o lead vai para "sem contato". Teste na Tarefa 2.
4. **Texto com `%`, `&`, acento e quebra de linha** no achado: o link abre com o texto íntegro. Teste na Tarefa 2.
5. **Clique duplo em "enviei".** O segundo é recusado; não nasce contato duplicado nem segundo follow-up. Teste na Tarefa 4.

---

### Task 1: Calendário e cota do dia

**Files:**
- Create: `src/contracts/queue.ts`
- Test: `src/contracts/queue.test.ts`

**Interfaces:**
- Produces:
  - `spDay(d: Date): string` — `YYYY-MM-DD` em America/Sao_Paulo.
  - `isBusinessDay(d: Date): boolean` — segunda a sexta em America/Sao_Paulo.
  - `businessDaysBetween(from: Date, to: Date): number` — dias úteis depois de `from` até `to`, inclusive.
  - `weekStart(now: Date): Date` — segunda 00:00 de Brasília da semana de `now`.
  - `dailyQuota(i: { weeklyTarget: number; sentNewThisWeek: number; channelRemaining: number; now: Date }): number`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// quinta 19/11/2026 10:00 BRT
const QUI = new Date("2026-11-19T10:00:00-03:00");
it("spDay usa Brasília, não UTC", () => {
  expect(spDay(new Date("2026-11-19T22:30:00-03:00"))).toBe("2026-11-19");
});
it("meta 25 na segunda dá 5", () => {
  expect(dailyQuota({ weeklyTarget: 25, sentNewThisWeek: 0, channelRemaining: 20, now: new Date("2026-11-16T09:00:00-03:00") })).toBe(5);
});
it("segunda perdida: terça recebe 7", () => {
  expect(dailyQuota({ weeklyTarget: 25, sentNewThisWeek: 0, channelRemaining: 20, now: new Date("2026-11-17T09:00:00-03:00") })).toBe(7);
});
it("nunca passa do que resta no canal", () => {
  expect(dailyQuota({ weeklyTarget: 100, sentNewThisWeek: 0, channelRemaining: 4, now: QUI })).toBe(4);
});
it("meta batida ou meta zero dá 0", () => {
  expect(dailyQuota({ weeklyTarget: 25, sentNewThisWeek: 25, channelRemaining: 20, now: QUI })).toBe(0);
  expect(dailyQuota({ weeklyTarget: 0, sentNewThisWeek: 0, channelRemaining: 20, now: QUI })).toBe(0);
});
it("sábado dá 0", () => {
  expect(dailyQuota({ weeklyTarget: 25, sentNewThisWeek: 0, channelRemaining: 20, now: new Date("2026-11-21T10:00:00-03:00") })).toBe(0);
});
it("3 dias úteis pulam o fim de semana", () => {
  // sexta 13/11 → quarta 18/11 = 3 dias úteis
  expect(businessDaysBetween(new Date("2026-11-13T16:00:00-03:00"), new Date("2026-11-18T09:00:00-03:00"))).toBe(3);
  expect(businessDaysBetween(new Date("2026-11-13T16:00:00-03:00"), new Date("2026-11-17T09:00:00-03:00"))).toBe(2);
});
it("weekStart é a segunda de Brasília", () => {
  expect(weekStart(QUI).toISOString()).toBe("2026-11-16T03:00:00.000Z");
});
```

- [ ] **Step 2: Rodar e ver falhar** — `pnpm vitest run src/contracts/queue.test.ts` → falha por função inexistente.
- [ ] **Step 3: Implementar em `src/contracts/queue.ts`.** `spDay` com `Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })`. `dailyQuota` = `min(channelRemaining, ceil((weeklyTarget − sentNewThisWeek) / dias úteis restantes na semana contando hoje))`, piso 0, e 0 fora de dia útil.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat: calendário de Brasília e cota diária pela meta semanal`.

---

### Task 2: Achado válido, texto e link

**Files:**
- Modify: `src/contracts/queue.ts`, `src/contracts/queue.test.ts`

**Interfaces:**
- Consumes: `spDay` (Task 1).
- Produces:
  - `type FindingPolicy = "script" | "conferido"`; `FINDING_POLICIES` (array const).
  - `validFinding<F extends { origin: string; verifiedAt: Date; summary: string }>(policy: FindingPolicy, findings: F[], now: Date): F | null` — o achado válido mais recente.
  - `renderMessage(template: string, v: { nome: string; achado: string }): string`
  - `contactLink(channel: Channel, lead: { whatsapp: string | null; phone: string | null; instagram: string | null }, message: string): string | null`
  - `gapWaitMs(channel: Channel, lastSentAt: Date | null, now: Date): number` — 0 quando liberado.

- [ ] **Step 1: Testes que falham**

```ts
const NOW = new Date("2026-11-19T10:00:00-03:00");
const f = (origin: string, iso: string) => ({ origin, verifiedAt: new Date(iso), summary: "x" });
it("script: vale achado de até 24h, de qualquer origem", () => {
  expect(validFinding("script", [f("script", "2026-11-18T11:00:00-03:00")], NOW)).not.toBeNull();
  expect(validFinding("script", [f("script", "2026-11-18T09:00:00-03:00")], NOW)).toBeNull();
});
it("conferido: só achado conferido hoje", () => {
  expect(validFinding("conferido", [f("conferido", "2026-11-19T08:00:00-03:00")], NOW)).not.toBeNull();
  expect(validFinding("conferido", [f("conferido", "2026-11-18T20:00:00-03:00")], NOW)).toBeNull();
  expect(validFinding("conferido", [f("script", "2026-11-19T08:00:00-03:00")], NOW)).toBeNull();
});
it("renderMessage troca {nome} e {achado} e mantém o resto", () => {
  expect(renderMessage("Oi, {nome}. Vi que {achado}. Faz sentido?", { nome: "Pizzaria X", achado: "43% sem foto" }))
    .toBe("Oi, Pizzaria X. Vi que 43% sem foto. Faz sentido?");
});
it("WhatsApp: dígitos, DDI 55 e texto codificado", () => {
  expect(contactLink("whatsapp", { whatsapp: "(47) 99270-6419", phone: null, instagram: null }, "43% & mais\nlinha"))
    .toBe("https://wa.me/5547992706419?text=43%25%20%26%20mais%0Alinha");
  expect(contactLink("whatsapp", { whatsapp: "554792706419", phone: null, instagram: null }, "oi"))
    .toBe("https://wa.me/554792706419?text=oi");
});
it("WhatsApp cai no telefone; número curto não gera link", () => {
  expect(contactLink("whatsapp", { whatsapp: null, phone: "+55 11 93010-7531", instagram: null }, "oi")).toContain("wa.me/5511930107531");
  expect(contactLink("whatsapp", { whatsapp: "9999", phone: null, instagram: null }, "oi")).toBeNull();
});
it("Instagram: link da conversa, sem texto", () => {
  expect(contactLink("instagram", { whatsapp: null, phone: null, instagram: "lojahaja_amor" }, "oi")).toBe("https://ig.me/m/lojahaja_amor");
  expect(contactLink("instagram", { whatsapp: null, phone: null, instagram: null }, "oi")).toBeNull();
});
it("intervalo: 3 min no WhatsApp, 2 nos demais", () => {
  const last = new Date(NOW.getTime() - 60_000);
  expect(gapWaitMs("whatsapp", last, NOW)).toBe(120_000);
  expect(gapWaitMs("instagram", last, NOW)).toBe(60_000);
  expect(gapWaitMs("whatsapp", null, NOW)).toBe(0);
});
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** Reutilizar `normalizePhone` de `src/domains/leads/normalize.ts`; com 10 ou 11 dígitos, prefixar `55`. Canais `email` e `indicacao` devolvem `null` em `contactLink`.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat: validade do achado, texto e link de contato da fila`.

---

### Task 3: Campos da frente

**Files:**
- Modify: `src/db/schema.ts` (tabela `fronts`)
- Create: `drizzle/0002_*.sql` (gerado por `pnpm db:generate`)

**Interfaces:**
- Produces, em `fronts`: `findingPolicy: text("finding_policy").notNull().default("conferido")`, `messageTemplate: text("message_template")`, `followUpTemplate: text("follow_up_template")`, `weeklyTarget: integer("weekly_target").notNull().default(25)`.

- [ ] **Step 1:** Acrescentar os quatro campos em `schema.ts`.
- [ ] **Step 2:** `pnpm db:generate` e conferir que o SQL só tem quatro `ALTER TABLE "fronts" ADD COLUMN`.
- [ ] **Step 3:** Aplicar no banco local (`pnpm db:migrate`) e conferir com `SELECT slug, finding_policy, weekly_target FROM fronts`: todas com `conferido` e `25`.
- [ ] **Step 4: Commit** — `feat: frente guarda política de achado, textos e meta semanal`.

---

### Task 4: Montagem da fila

**Files:**
- Modify: `src/contracts/queue.ts`, `src/contracts/queue.test.ts`
- Create: `src/domains/outreach/queue.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1 a 3; `checkEngagement` de `src/contracts/engagement.ts`.
- Produces (puro, em `contracts/queue.ts`):

```ts
type QLead = { id: string; name: string; stage: Stage; whatsapp: string | null; phone: string | null;
  instagram: string | null; followers: number | null; engagementPct: number | null;
  signals: Record<string, unknown>; createdAt: Date };
type QFinding = { leadId: string; summary: string; origin: string; verifiedAt: Date; evidenceUrl: string };
type QContact = { id: string; leadId: string; channel: string; sentAt: Date; isFollowUp: boolean; repliedAt: Date | null };
type QFront = { channel: Channel; dailyLimit: number; weeklyTarget: number; findingPolicy: FindingPolicy;
  messageTemplate: string | null; followUpTemplate: string | null; usesEngagement: boolean; engagementMin: number | null };
type QItem = { lead: QLead; finding: QFinding | null; message: string; link: string };
type Queue = { quota: number; sentToday: number; waitMs: number;
  novos: QItem[]; followUps: QItem[]; replied: QLead[];
  excluded: { semTexto: boolean; achadoVencido: number; semContato: number; semEngajamento: number } };
function selectQueue(i: { front: QFront; leads: QLead[]; findings: QFinding[]; contacts: QContact[];
  channelContacts: { sentAt: Date }[]; now: Date }): Queue
```

- Produces (banco, em `domains/outreach/queue.ts`):
  - `buildQueue(frontSlug: string, now?: Date): Promise<{ front: Front; queue: Queue } | null>`
  - `markSent(leadId: string, kind: "first" | "followup", now?: Date): Promise<ActionResult>`
  - `skipToday(leadId: string, now?: Date): Promise<ActionResult>` — grava `signals.pulado_em = spDay(now)`.

Regras de `selectQueue`:
- `channelContacts` são todos os contatos do canal da frente desde o começo da semana (de qualquer frente); `sentToday` e o restante do canal saem deles.
- **novos:** etapa `importado`, `qualificado` ou `aprovado`; sem nenhum contato; `signals.pulado_em` diferente de hoje; `contactLink` não nulo (senão conta em `semContato`); se `usesEngagement`, `checkEngagement` ok (senão `semEngajamento`); `validFinding` não nulo (senão `achadoVencido`). Ordem: `signals.score` numérico decrescente, depois `createdAt`. Corta em `quota`.
- **followUps:** etapa `contatado`; exatamente um contato, sem resposta, com `businessDaysBetween(sentAt, now) >= 3`. Não entram na meta semanal; respeitam o restante do canal.
- **replied:** etapa `respondeu`.
- Sem `messageTemplate`: `excluded.semTexto = true` e `novos` vazio. Follow-up usa `followUpTemplate`; se faltar, `followUps` vazio.
- `message` = `renderMessage(template, { nome: lead.name, achado: finding.summary })`.

Regras de `markSent` (uma transação, relendo o estado):
- `first`: recusa se o lead já tem contato, se não está mais em `novos` da fila recalculada, ou se `waitMs > 0`. Grava o contato (canal da frente, texto renderizado, `sentAt = now`) e leva a etapa direto para `contatado`.
- `followup`: recusa se já existe follow-up, se houve resposta, ou se `waitMs > 0`. Grava com `isFollowUp = true`.

- [ ] **Step 1: Testes que falham (puros).** Um caso por regra acima, com `now = 2026-11-19T10:00:00-03:00`, frente `{ channel: "whatsapp", dailyLimit: 20, weeklyTarget: 25, findingPolicy: "script", messageTemplate: "Oi {nome}: {achado}", followUpTemplate: "Oi {nome}, ainda faz sentido?", usesEngagement: false, engagementMin: null }`:
  - 8 leads elegíveis, 0 enviados na semana → `quota` 13 (25 ÷ 2 dias úteis restantes), `novos` com os 8, em ordem de `signals.score`.
  - 30 elegíveis e 18 contatos do canal hoje → `novos.length` 2.
  - lead com achado de 30 h atrás → fora de `novos`, `excluded.achadoVencido` 1.
  - lead sem WhatsApp e sem telefone → `excluded.semContato` 1.
  - lead com `signals.pulado_em: "2026-11-19"` → fora; com `"2026-11-18"` → dentro.
  - contatado em 13/11 sem resposta → em `followUps`; com resposta → fora; com follow-up já feito → fora; contatado em 17/11 → fora.
  - frente sem `messageTemplate` → `novos` vazio e `excluded.semTexto` true.
  - frente `usesEngagement: true` e lead sem engajamento medido → `excluded.semEngajamento` 1.
  - último contato do canal há 1 min → `waitMs` 120000.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar `selectQueue`.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Implementar `domains/outreach/queue.ts`** seguindo o estilo de `src/domains/leads/journey.ts` (mesmo `ActionResult`). `buildQueue` faz quatro consultas (frente, leads da frente, achados e contatos desses leads, contatos do canal desde `weekStart(now)`) e chama `selectQueue`.
- [ ] **Step 6: Teste de integração no banco local** (arquivo temporário, não versionado, como foi feito no commit `9201813`): criar frente e 2 leads com achado de script de agora; `markSent(first)` duas vezes seguidas no mesmo lead → a segunda devolve `ok: false` e existe 1 contato; segundo lead logo em seguida → recusado pelo intervalo; `markSent(followup)` duas vezes → 1 follow-up.
- [ ] **Step 7: Commit** — `feat: montagem da fila do dia e registro de envio`.

---

### Task 5: Tela da fila

**Files:**
- Create: `src/app/fila/page.tsx`, `src/app/fila/actions.ts`, `src/app/fila/queue-item.tsx`
- Modify: `src/app/page.tsx` (link "fila de hoje" no lugar de "aprovação de lote")
- Delete: `src/app/aprovacao/` (3 arquivos), `src/domains/outreach/approve.ts`, `src/domains/outreach/limits.ts` e seu teste, se nada mais os importar (conferir com grep antes).
- Modify: `PRODUCT.md` (fluxo 5 vira "Abrir a fila do dia"; a regra "Nada é enviado sem marcação aprovado" vira "Nada entra na fila sem achado válido pela política da frente").

**Interfaces:**
- Consumes: `buildQueue`, `markSent`, `skipToday` (Task 4).
- Produces: rota `/fila?frente=<slug>` (sem parâmetro: primeira frente ativa com `messageTemplate`, senão a primeira ativa). Actions `enviei(formData)`, `pular(formData)` validadas com zod (`leadId` uuid, `kind`).

Conteúdo da tela, no visual atual (mesmas classes de `src/app/leads/[id]/page.tsx`):
- Cabeçalho: data de hoje, seletor de frente (links), "Meta da semana: N · hoje: Q novos · <canal>: X de L enviados hoje". Se `waitMs > 0`: "Próximo envio liberado às HH:MM".
- Seção Novos: nome (link para `/leads/[id]`), cidade de `signals`, achado com data da medição e link da evidência, texto da mensagem, botões.
- `queue-item.tsx` (client): botão "abrir conversa" abre `link` em nova aba e, no Instagram, copia a mensagem para a área de transferência e mostra "mensagem copiada"; botões "enviei" e "pular" são `<form action>`. Com `waitMs > 0`, "abrir conversa" e "enviei" ficam desabilitados.
- Seção Follow-ups: igual, com o texto de follow-up e `kind=followup`.
- Seção Responderam: lista com link para o lead.
- Rodapé "Fora da fila": as contagens de `excluded`; `semTexto` mostra "Esta frente não tem texto de mensagem. Configure em /frentes."
- Frente `conferido` com `achadoVencido > 0`: lista esses leads com link "conferir achado" para `/leads/[id]`.

- [ ] **Step 1:** Implementar a página, as actions e o componente.
- [ ] **Step 2:** Remover `/aprovacao` e os módulos sem uso; atualizar `page.tsx` e `PRODUCT.md`.
- [ ] **Step 3: Verificar no servidor local.** Subir o app, abrir `/fila?frente=ecommerce` e conferir no HTML: cabeçalho com meta e contagem, seção de follow-ups com os leads do histórico contatados há 3 dias úteis ou mais, e o aviso de texto não configurado. `curl` em `/aprovacao` devolve 404.
- [ ] **Step 4:** `pnpm vitest run && pnpm tsc --noEmit && pnpm eslint src`.
- [ ] **Step 5: Commit** — `feat: tela da fila do dia; sai a aprovação de lote`.

---

### Task 6: Edição das frentes e reconferência do achado

**Files:**
- Create: `src/app/frentes/page.tsx`, `src/app/frentes/actions.ts`, `src/app/frentes/front-form.tsx`
- Create: `src/contracts/front.ts`, `src/contracts/front.test.ts`
- Modify: `src/app/page.tsx` (link "frentes"), `src/domains/leads/findings.ts`, `src/app/leads/[id]/actions.ts`, `src/app/leads/[id]/page.tsx`

**Interfaces:**
- Produces:
  - `frontEditSchema` (zod): `id` uuid; `dailyLimit` inteiro 1 a 50; `weeklyTarget` inteiro 0 a 100, **múltiplo de 5**; `findingPolicy` em `FINDING_POLICIES`; `messageTemplate` e `followUpTemplate` texto opcional, vazio vira `null`; `active` booleano.
  - `reconfirmFinding(findingId: string, now?: Date): Promise<ActionResult>` em `findings.ts` — só para achado de origem `conferido`; atualiza `verifiedAt`.

- [ ] **Step 1: Testes que falham** em `front.test.ts`: `weeklyTarget: 25` passa; `23` falha com "de 5 em 5"; `-5` falha; `messageTemplate: "  "` vira `null`; `findingPolicy: "qualquer"` falha.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar `front.ts`**, a tela `/frentes` (uma linha por frente, com formulário; "leads novos por semana" é um `<select>` de 0 a 100 de 5 em 5) e a action de salvar.
- [ ] **Step 4:** Implementar `reconfirmFinding` e o botão "reconferi hoje" ao lado de cada achado conferido na página do lead.
- [ ] **Step 5: Verificar no servidor local:** salvar meta 15 e um texto na frente `ecommerce`; `/fila?frente=ecommerce` passa a mostrar "Meta da semana: 15"; reconferir um achado faz o lead sair de "achado vencido" e entrar em Novos.
- [ ] **Step 6:** `pnpm vitest run && pnpm tsc --noEmit && pnpm eslint src`.
- [ ] **Step 7: Commit** — `feat: edição de frentes e reconferência de achado`.

---

## Fora deste plano

Porta do Captor, frente delivery e rotina das 6h; supressão e botão "pediu para parar"; criação de frente nova e sugestão de nichos; layout. Os textos de mensagem de cada frente são escritos com o Lemuel, não pelo implementador.
