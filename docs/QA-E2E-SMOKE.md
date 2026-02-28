# QA E2E Smoke (Canônico) — Wave 4 / Story 8.2

Objetivo: executar smoke reproduzível de Dashboard, Scraper e Leads com evidências padronizadas e sem ruído de portas/origens.

## Pré-requisitos

1. Ambiente com dependências instaladas.
2. Não manter backend alternativo ativo em outras portas durante execução.
3. Usar runtime profile canônico (backend `8000`, dashboard `5173`).

## Execução

Na raiz do repositório:

```bash
npm run qa:smoke:e2e
```

O script faz:

1. `runtime up` do perfil canônico.
2. Health check de backend/dashboard.
3. Smoke de APIs essenciais (Dashboard, Scraper, Leads, Activity).
4. Smoke de rotas de UI (`/dashboard`, `/scraper`, `/leads`, `/whatsapp`).
5. Smoke visual automatizado com screenshots das 4 rotas principais.
6. Geração de evidências em `/tmp/findvan-qa-e2e-smoke/<run_id>/`.
7. `runtime down` ao final (pass/fail).

Modo alternativo (sem gerenciar runtime, para ambientes já ativos):

```bash
npm run qa:smoke:e2e:external
```

## Evidências padrão

Diretório por execução:

- `/tmp/findvan-qa-e2e-smoke/<run_id>/checks.tsv`
- `/tmp/findvan-qa-e2e-smoke/<run_id>/summary.json`
- `/tmp/findvan-qa-e2e-smoke/<run_id>/summary.md`
- `/tmp/findvan-qa-e2e-smoke/<run_id>/visual-summary.json`
- `/tmp/findvan-qa-e2e-smoke/<run_id>/screenshots/dashboard.png`
- `/tmp/findvan-qa-e2e-smoke/<run_id>/screenshots/scraper.png`
- `/tmp/findvan-qa-e2e-smoke/<run_id>/screenshots/leads.png`
- `/tmp/findvan-qa-e2e-smoke/<run_id>/screenshots/whatsapp.png`
- `/tmp/findvan-qa-e2e-smoke/<run_id>/bodies/*.txt`

Atalho da última execução:

- `/tmp/findvan-qa-e2e-smoke/latest`

## Critério de aprovação

1. Todos os checks HTTP em `2xx`.
2. Rotas de UI retornando HTML válido.
3. Smoke visual sem erro fatal e com screenshots geradas.
4. `summary.json` com `totals.fail = 0`.

## Checklist de gate @qa

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run qa:smoke:e2e`
- [ ] Relatório da story atualizado com caminho de evidências
