# Environment Runtime Profile (Wave 4 / Story 8.1)

Este documento define o runtime canônico de desenvolvimento local para reduzir ruído de validação em Dashboard/Scraper/Leads.

## Perfil oficial

- Backend: `http://127.0.0.1:8000`
- Dashboard (Vite): `http://127.0.0.1:5173`
- API consumida pelo Dashboard: `VITE_API_URL=http://127.0.0.1:8000`

## Comandos canônicos

Na raiz do repositório:

```bash
npm run runtime:up
npm run runtime:status
npm run runtime:health
npm run runtime:down
```

## Implementação

Script de runtime: `scripts/runtime-profile.sh`

Comportamento:

1. `up`
- Sobe backend e dashboard em background
- Gera PID files em `.runtime/`
- Gera logs em `.runtime/logs/`

2. `down`
- Encerra somente processos gerenciados pelo profile
- Remove PID files

3. `status`
- Mostra estado dos processos pelos PID files

4. `health`
- Faz check HTTP:
  - `GET /health` do backend
  - root do dashboard

## Observabilidade local

Logs:

- Backend: `.runtime/logs/backend.log`
- Dashboard: `.runtime/logs/dashboard.log`

PID files:

- `.runtime/backend.pid`
- `.runtime/dashboard.pid`

## Regras operacionais

1. Para smoke QA local, use sempre esse profile.
2. Evite rodar backends paralelos em portas diferentes durante validação.
3. Não alterar `VITE_API_URL` manualmente durante o smoke, salvo cenário explícito de teste.
