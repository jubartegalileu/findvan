# Brief — Epic 43 (Wave 38): SDR Template Denial Remediation

## Contexto
As Waves 35-37 endureceram permissao de templates SDR:
- Wave 35: actor context hardening
- Wave 36: permission precheck
- Wave 37: denial audit

Hoje o operador ve o bloqueio, mas ainda falta fluxo orientado de resolucao para reduzir retrabalho e chamadas de suporte.

## Problema
Quando mutacoes de template sao negadas, o usuario recebe contexto tecnico (owner/actor/reason), mas nao ha orientacao operacional clara de proximo passo dentro da UI.

## Objetivo
Adicionar fluxo de remediacao guiada para negacoes de permissao em templates SDR, com sugestoes acionaveis e trilha minima de confirmacao de acao.

## Escopo In
1. Backend expor recomendacoes de remediacao por motivo de negacao.
2. SDR mostrar painel de "Como resolver" quando houver bloqueio.
3. Registrar evento de acao de remediacao iniciada (telemetria/auditoria leve).
4. QA gate com regressao SDR/Funil e validacao de contratos.

## Escopo Out
- Mudanca de modelo de permissao (ACL/RBAC completo)
- Multi-tenant isolado por organizacao
- Workflows de aprovacao assincrona entre usuarios

## Criterios de Sucesso
- Reducao de tentativas repetidas de mutacao negada no mesmo contexto owner/actor.
- Usuario consegue identificar proximo passo sem abrir documentacao externa.
- Regressao SDR/Funil permanece verde.

## Riscos
- Sugestoes genericas demais nao resolvem caso real.
- Excesso de ruido na UI se painel aparecer fora de contexto.

## Mitigacoes
- Regras de exibicao condicionais (apenas quando negado).
- Catalogo inicial de recomendacoes por motivo + fallback seguro.
