# Brief — Epic 44 (Wave 39): SDR Template Access Request Handoff

## Contexto
As Waves 35-38 fecharam a base de governanca de permissao de templates SDR:
- Wave 35: actor context hardening
- Wave 36: permission precheck
- Wave 37: denial audit
- Wave 38: denial remediation guidance

Com isso, o operador recebe bloqueio com orientacao, mas ainda sem fluxo in-product para solicitar acesso ao owner responsavel.

## Problema
A remediacao atual depende de acao externa/manual fora do produto para desbloqueio de permissao. Isso aumenta tempo de resolucao e gera retrabalho operacional.

## Objetivo
Planejar handoff operacional de solicitacao de acesso a templates SDR negados, mantendo contrato atual retrocompativel e trilha minima de auditoria.

## Escopo In (Planejamento)
1. Definir contrato backend para iniciar solicitacao de acesso vinculada ao contexto de negacao.
2. Definir UX SDR para acionar solicitacao a partir do bloco "Como resolver".
3. Definir gate QA/PO para validar regressao e rastreabilidade de solicitacoes.

## Escopo Out
- Engine completa de aprovacao multi-etapas
- SLA de aprovacao automatizado
- Integracao com IAM corporativo externo

## Criterios de Sucesso
- Planejamento aprovado por PM/SM/PO com stories rastreaveis.
- Stories 44.1-44.3 prontas para execucao com criterios claros.
- Nao ha quebra de contrato nos endpoints SDR existentes.

## Riscos
- Acoplamento prematuro com workflow de aprovacao amplo.
- UX criar expectativa de aprovacao imediata sem garantia operacional.

## Mitigacoes
- Limitar escopo da wave ao handoff inicial e auditoria minima.
- Mensagens explicitas de status de solicitacao (sem promessa de auto-aprovacao).
