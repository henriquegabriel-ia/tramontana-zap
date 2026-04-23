# Story 001 — Respostas automáticas configuráveis por campanha

**Status:** Done ✅
**Tipo:** Brownfield Enhancement
**Epic:** (standalone)
**Autor:** @pm (Morgan)
**Data:** 2026-04-22

## Dev Agent Record

**Agent Model Used:** Opus 4.7 (1M context)

### Completion Notes

- ✅ Migration aplicada em produção (Supabase smartzap)
- ✅ Types, API, Hook, Service, UI, Webhook implementados
- ✅ Typecheck: exit 0
- ✅ Build local: sucesso
- ✅ Deploy em produção: commit `9c67e5d`
- ✅ Validação E2E real via UI — campanha "Campanha 22 de abr." configurou "Quero saber mais!" → "Obrigado pelo seu contato.", disparou template, cliente clicou, auto-reply enviado, contadores incrementaram (`auto_reply_sent_count=1`, `quick_reply_match_count=1`), `campaign_contact.status` → `replied`.
- ℹ️ Na 1ª iteração, bug de join embutido frágil (`.select('..., campaigns(...)')`) + fire-and-forget `.then()` cortado pela serverless. Corrigido no commit `1daf0a9`: 2 queries separadas + await.
- ℹ️ Durante diagnóstico, elevei temporariamente `console.log` → `console.warn` por visibilidade no Vercel Hobby. Revertido no commit final.

### Commits

- `cef1955` — feat: auto-reply configurável + contadores (1ª versão)
- `1daf0a9` — fix: queries separadas + await
- `9c67e5d` — chore: elevar logs para warn (diagnóstico)
- `e5f31db` — chore: revert warn → log + story updated
- `b68b4bf` — fix: delay 4.5s antes do auto-reply (rate limit Meta)
- `57be707` — fix: mover auto-reply para antes do workflow builder
- `1c5d205` — debug: webhook_debug_logs (feature permanente de observabilidade)
- `5d11d88` — **fix: normalização telefone BR (bug do 9) — causa raiz** ✅

### Validação E2E final

```
2026-04-23 02:48:00 — Click real do cliente recebido
2026-04-23 02:48:00 — cc found via variantes (4 telefones)
2026-04-23 02:48:00 — quick_reply matched
2026-04-23 02:48:05 — send result: success TRUE (delay 4.5s)
2026-04-23 02:48:05 — counter incremented (quick_reply_match_count=1)
```

Campanha `733a561c` — teste real end-to-end: ✅ PASSOU

### File List

- `supabase/migrations/20260422000000_add_campaign_auto_replies.sql` (novo)
- `docs/stories/001-campaign-auto-replies.md` (novo)
- `types.ts` (modificado)
- `types/campaign.types.ts` (modificado)
- `lib/api-validation.ts` (modificado)
- `lib/supabase-db.ts` (modificado)
- `services/campaignService.ts` (modificado)
- `app/api/campaigns/route.ts` (modificado)
- `app/api/webhook/route.ts` (modificado)
- `hooks/useCampaignNew.ts` (modificado)
- `app/(dashboard)/campaigns/new/page.tsx` (modificado)

### Change Log

| Data | Autor | Descrição |
|---|---|---|
| 2026-04-22 22:30 | @pm (Morgan) | Draft da story |
| 2026-04-22 22:35 | @architect (Aria) | Technical spec + migration + RPC |
| 2026-04-22 22:43 | @dev (Dex) | Implementação 1ª versão (cef1955) |
| 2026-04-22 22:50 | @dev (Dex) | Fix webhook queries separadas (1daf0a9) |
| 2026-04-22 22:58 | @qa (Quinn) | Review CONCERNS — diagnóstico webhook |
| 2026-04-22 23:00 | @dev (Dex) | Log level diagnóstico (9c67e5d) |
| 2026-04-22 23:10 | @dev (Dex) | Validação E2E bem-sucedida, revert logs |


---

## 1. User Story

**Como** gestor de campanhas do Tramontana Consórcios,
**Quero** configurar, no momento da criação de cada campanha, uma resposta automática específica para cada botão *quick_reply* do template selecionado, além de uma resposta genérica de fallback para quem responder com texto livre,
**Para** aumentar o engajamento e entregar retorno imediato e contextual ao cliente, sem depender da disponibilidade de um atendente humano.

---

## 2. Contexto (Brownfield)

### Sistema existente

- **Tramontana Zap** — SaaS single-tenant (Next.js 16 + Supabase + Upstash QStash + Meta WhatsApp Cloud API v24.0).
- Wizard de criação de campanha em 4 steps: **Configuração → Público → Validação → Agendamento**.
- O step **Configuração** já permite selecionar um template aprovado e preencher suas variáveis (header, body, button URLs).
- Templates são sincronizados da Meta e persistidos na tabela `templates`. O `template_snapshot` JSONB é guardado em cada `campaign` no momento do disparo.
- Tabela `campaigns` já possui colunas: `template_name`, `template_snapshot`, `template_variables`, `ab_test_enabled` (feature A/B recente) etc.
- Tabela `campaign_contacts` rastreia status por contato (`pending | sent | delivered | read | replied | failed`).
- Webhook `/api/webhook/route.ts` (~linha 1594) hoje dispara uma **mensagem fixa** ("Ah, que ótimo. Já já um dos nossos analistas entrará em contato com você.") na primeira resposta de qualquer campanha.

### Gap atual

- Mensagem fixa, hardcoded — não contextual.
- Não diferencia **quick_reply clicado** de **texto livre**.
- Não há UI para configurar respostas por campanha.

---

## 3. Acceptance Criteria

**AC1 — UI no wizard**
No `StepTemplateConfig`, após selecionar um template, aparece um card **"Respostas automáticas"** contendo:
  - Um `<input>` por botão `QUICK_REPLY` do template (rotulado com o texto do botão).
  - Um `<input>` "Fallback — texto livre" sempre presente.
Se o template não possuir botões `QUICK_REPLY`, mostra apenas o fallback.

**AC2 — Campos opcionais**
A campanha pode ser criada sem nenhuma resposta configurada. Nesse caso, **nenhuma** resposta automática é enviada (remove-se o comportamento atual hardcoded).

**AC3 — Persistência**
Tabela `campaigns` ganha as colunas:
  - `quick_reply_responses JSONB NULL` — mapa `{ "<texto do botão>": "<resposta>" }`
  - `fallback_response TEXT NULL`
  - `auto_reply_sent_count INTEGER NOT NULL DEFAULT 0`
  - `quick_reply_match_count INTEGER NOT NULL DEFAULT 0`
  - `fallback_sent_count INTEGER NOT NULL DEFAULT 0`
API `/api/campaigns` (POST/PUT) aceita e persiste os 2 primeiros; GET retorna todos. Os contadores são **somente leitura via API** (só o webhook incrementa).

**AC4 — Lógica no webhook**
Quando `/api/webhook/route.ts` recebe mensagem de um telefone cujo `campaign_contacts` está em `sent | delivered | read`:
  - Se o texto recebido corresponde (case-insensitive, trim) a uma chave de `quick_reply_responses` → envia a resposta mapeada.
  - Senão, se existe `fallback_response` não-vazia → envia o fallback.
  - Senão → não envia nada.
A mensagem fixa atual é **removida**.

**AC5 — Sem regressão em `replied`**
O `campaign_contacts.status` continua sendo atualizado para `replied` ao detectar a primeira resposta, independentemente de ter havido auto-reply ou não.

**AC6 — Só primeira resposta**
Como o filtro do webhook exige status em `sent|delivered|read` (e muda para `replied` imediatamente), cada contato recebe **no máximo uma** resposta automática por campanha. Respostas subsequentes do mesmo contato não disparam novo auto-reply.

**AC7 — Edição pós-criação**
Respostas automáticas só podem ser editadas enquanto a campanha está em status `DRAFT`. Após disparar (`SCHEDULED | SENDING | COMPLETED`), os campos ficam somente-leitura na UI.

**AC8 — Escopo de botões**
Somente botões de tipo `QUICK_REPLY` geram inputs. Botões `URL`, `PHONE_NUMBER`, `COPY_CODE`, `FLOW` são ignorados pelo card (não geram input de resposta, pois o clique não gera mensagem de resposta do usuário no chat).

**AC9 — Contadores de efetividade**
Ao enviar um auto-reply com sucesso (Meta retornou 200), o webhook incrementa atomicamente em `campaigns`:
  - `auto_reply_sent_count += 1` (sempre)
  - `quick_reply_match_count += 1` (se match em botão)
  - `fallback_sent_count += 1` (se match em fallback)
Se o envio falhar (erro Meta), nenhum contador é incrementado. Se não houver resposta configurada para o caso, nada é enviado e nada é contado.

---

## 4. Integration Points

| Camada | Arquivo | Mudança |
|---|---|---|
| **DB** | `supabase/migrations/20260422000000_add_campaign_auto_replies.sql` | `ALTER TABLE campaigns` — 2 colunas de config (`quick_reply_responses`, `fallback_response`) + 3 contadores (`auto_reply_sent_count`, `quick_reply_match_count`, `fallback_sent_count`) |
| **Types** | `types.ts` (interface `Campaign`) | Adicionar os dois campos opcionais |
| **UI Step** | `components/features/campaigns/wizard/steps/StepTemplateConfig.tsx` | Novo sub-componente `CampaignAutoRepliesCard` renderizado quando `selectedTemplate` está setado |
| **Hook** | `hooks/useCampaignNew.ts` | Estado `quickReplyResponses: Record<string,string>` + `fallbackResponse: string` + inclusão no payload de criação |
| **API** | `app/api/campaigns/route.ts` (+ possível `services/campaignService.ts`) | Validar (Zod) e persistir novos campos |
| **Webhook** | `app/api/webhook/route.ts` (bloco de auto-reply, ~linha 1594) | Ao localizar `campaign_contact`, ler `campaigns.quick_reply_responses` e `fallback_response`, aplicar lógica do AC4 |

---

## 5. Fora de escopo (próximas stories)

- Analytics de taxa de resposta por botão (dashboard).
- Delay configurável antes de enviar a resposta automática.
- Variáveis `{{nome}}`, `{{telefone}}` etc. dentro das respostas automáticas.
- Respostas automáticas para botões `URL` / `FLOW` (exigiria outro gatilho, não o texto recebido).
- Multi-tenant (projeto é single-tenant).

---

## 6. Riscos & Rollback

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Regressão: `campaign_contacts.status='replied'` deixa de ser atualizado | Baixa | Teste de integração no webhook; AC5 explícito |
| Matching do texto recebido falhar com emojis/espaços no botão | Média | Normalização simples (trim + lowercase); documentar limitação |
| Usuário configura auto-reply mas campanha não é disparada → dados órfãos | Baixa | Colunas opcionais, nullable — sem impacto |
| Campanha antiga (pré-migration) sem as colunas → erro no webhook | Baixa | Campos são nullable; código trata `null` como "não enviar nada" |

**Rollback:** reverter PR reverte UI + webhook. Migration (ADD COLUMN) é segura: deixar colunas no DB não prejudica nada mesmo sem código usando.

---

## 7. Definition of Done

- [ ] Migration aplicada em Supabase (dev + prod).
- [ ] Colunas aparecem em `Campaign` type.
- [ ] Card de auto-replies aparece no wizard após selecionar template com quick_replies.
- [ ] Campo fallback aparece mesmo para templates sem quick_replies.
- [ ] Criar campanha sem auto-reply configurado: não envia mensagem automática.
- [ ] Criar campanha com auto-reply: cliente recebe a resposta mapeada ao texto.
- [ ] Cliente responde com texto livre: recebe fallback (se configurado).
- [ ] `campaign_contacts.status` vai para `replied` em 100% dos casos.
- [ ] Edição bloqueada após campanha sair de DRAFT.
- [ ] Build local (`npm run build`) passa.
- [ ] Deploy em produção (Vercel) bem-sucedido.
- [ ] Validação manual: criar campanha real, enviar para número de teste, clicar botão, verificar auto-reply.

---

## 8. Handoff

**Próximo:** @architect → desenho técnico rápido (schema matching, shape do estado no hook, validação Zod, normalização de texto no webhook).
Depois: @dev → implementação; @qa → review.
