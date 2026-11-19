# Etapa 2: entrada do Captor e frente delivery — plano

**Spec:** `docs/superpowers/specs/2026-11-19-etapa-2-captor-design.md`. Execução na própria sessão, teste antes do código, um commit por tarefa no ramo `etapa-2-captor`, sem push e sem produção.

## Tarefas

1. **Contrato da entrada** — `src/contracts/ingest.ts` (+ teste): `ingestSchema` (zod), `isBlockedCity`, `mergeFinding`. `src/domains/auth/ingest-token.ts` (+ teste): `checkIngestToken(header, expected)` em tempo constante; sem chave configurada ou com menos de 32 caracteres, recusa.
2. **Migração 0004** — `findings.hook_by` (texto, nulo) e a frente `delivery` (WhatsApp, 20/dia, meta 25, sem engajamento, política `script`, textos do adendo).
3. **Entrada no banco e rotas** — `src/domains/leads/ingest.ts`: `ingestLeads(payload)` e `pendingHooks(frontSlug)`. Rotas `POST /api/ingest/leads` e `GET /api/ingest/pendentes`. `src/proxy.ts` libera `/api/ingest/`. Teste de integração no banco local. Fila e página do lead mostram "escrito por IA".
4. **Medição só de comida** — `~/prospeccao-ccm/10_medir_comida.py`: relê Cardápio Web, Goomer e Anota; classifica bebida/adicional fora; grava `comida.json` com as pizzas sem foto e sem descrição. Teste da classificação com asserts no próprio arquivo.
5. **Envio** — `~/prospeccao-ccm/11_enviar_crm.py`: monta o corpo a partir de `dossies.csv`, `comida.json` e do texto dos anúncios; `--ensaio` imprime sem enviar. Rodar contra o CRM local.
6. **Rotina das 6h** — reescrever as instruções da tarefa agendada (medir, enviar, buscar pendentes, escrever gancho e lado do cliente, enviar). Não ativar.
7. **Revisão independente** do ramo e correção dos achados com teste.

## Pontos de atenção para a revisão

- Porta sem sessão: chave ausente, curta, errada, corpo gigante, JSON inválido.
- Lead já contatado não pode ter etapa nem contato alterados pela entrada.
- Remedição igual não pode apagar gancho; achado diferente não pode manter gancho velho.
- Limeira com acento, caixa e espaço diferentes.
- Bebida classificada como comida (e o contrário) na medição.
