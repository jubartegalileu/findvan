# Integration Contract Versioning (Wave 5 / Story 9.2)

Objetivo: evoluir contratos de integração de `v1.0.0` para `v1.1.0` sem breaking changes.

## Estratégia adotada

1. Default estável
- `GET /api/integrations/contracts` sem parâmetros retorna `v1.0.0`.
- Isso preserva comportamento de clientes existentes.

2. Opt-in para versão nova
- `GET /api/integrations/contracts?version=1.1` retorna `v1.1.0`.
- Alias suportados: `v1`, `1.0`, `1.0.0`, `v1.1`, `1.1`, `1.1.0`, `latest`.

3. Evolução aditiva
- `v1.1.0` adiciona campos opcionais e features, sem remover requisitos de `v1.0.0`.
- Política: apenas adições em minor version.

## Mudanças v1.1.0

Mensageria:
- `optional_fields`: `template_id`, `idempotency_key`, `metadata`
- `features`: `template_send`, `provider_receipt`, `idempotency`

OSINT:
- `recommended_fields`: adiciona `business_category`, `confidence_score`
- `features`: `source_attribution`, `metadata_passthrough`

## Compatibilidade

- Response inclui:
  - `default_version`
  - `latest_version`
  - `supported_versions`
  - `compatibility` (matriz/política)
- Fallback para versões inválidas: `HTTP 400` com mensagem explícita.
