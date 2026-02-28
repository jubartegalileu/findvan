# Integration Readiness Contracts (Wave 4 / Story 8.3)

Objetivo: preparar contratos e adapters-base para evolução de integrações (WhatsApp/API e novas fontes OSINT), mantendo compatibilidade total com Waves 1-3.

## Princípios

1. Backward compatibility first
- Nenhum endpoint existente foi alterado semanticamente.
- Novos contratos são aditivos.

2. Adapter boundary
- O backend expõe contratos mínimos e providers pluggable.
- Integrações reais entram depois sem acoplamento ao core atual.

3. No rollout prematuro
- Providers atuais são `noop` (readiness mode).
- Sem envio real de mensagem e sem novas coletas reais nesta wave.

## Contratos definidos

Arquivo: `packages/backend/app/integrations/contracts.py`

1. Mensageria (WhatsApp-ready)
- `OutboundMessage`
- `MessageReceipt`
- `MessagingProvider` (Protocol)
- Estados: `queued`, `sent`, `delivered`, `failed`

2. OSINT Sources (source-ready)
- `OsintSearchRequest`
- `OsintLeadCandidate`
- `OsintProvider` (Protocol)
- Sources previstas: `google_maps`, `facebook`, `linkedin`, `manual`

## Registry e providers

Arquivos:
- `packages/backend/app/integrations/registry.py`
- `packages/backend/app/integrations/providers/noop_messaging.py`
- `packages/backend/app/integrations/providers/noop_osint.py`

Comportamento:
- Registry resolve providers por env vars:
  - `FINDVAN_MESSAGING_PROVIDER`
  - `FINDVAN_OSINT_PROVIDER`
- Fallback seguro para `noop`/`manual`.

## Endpoint de contrato

- `GET /api/integrations/contracts`
- Versionamento: ver `docs/INTEGRATION-CONTRACT-VERSIONING.md`

Retorno:
- versão de contrato
- descriptor de mensageria e OSINT
- snapshot de readiness e modo de compatibilidade

## Próxima wave (recomendado)

1. Implementar provider real WhatsApp mantendo mesmo `MessagingProvider`.
2. Implementar provider real de nova fonte OSINT mantendo `OsintProvider`.
3. Adicionar testes de contrato provider por provider.
