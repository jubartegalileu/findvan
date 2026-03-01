# Epic 3 — Scraper v2: Inteligencia e Automacao

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md
**Status:** Ready
**Prioridade:** P0 (Must Have)
**Wave:** 1
**Estimativa:** 1.5-2 semanas
**Owner:** @pm (Morgan)

---

## Objetivo

Evoluir o Scraper de uma ferramenta de coleta basica para um **modulo inteligente** com keywords customizaveis, feedback acionavel, transparencia no pipeline de resultados e agendamento automatico.

## Problema

- Scraper usa keyword fixa ("transporte escolar") — Sao Paulo retorna 0 leads em 4 execucoes sem explicacao
- Usuario nao sabe por que uma coleta falhou ou teve baixo rendimento
- Pipeline opaco: "8/100 leads" mas quantos eram duplicados? quantos invalidos?
- Toda coleta e manual — nao ha agendamento

## Valor de Negocio

- **Mais leads:** Keywords customizaveis ampliam o alcance da busca
- **Menos frustacao:** Feedback inteligente guia o usuario quando resultados sao baixos
- **Transparencia:** Saber exatamente o que aconteceu em cada coleta
- **Automacao:** Coletas recorrentes sem intervencao manual

---

## Stories Planejadas

### Story 3.1 — Keywords Customizaveis (P0)
**RF:** RF-S1
**Complexidade:** Pequena (2 pontos)
**Descricao:** Campo de texto multi-valor (chips/tags) no formulario de coleta dentro de secao "Opcoes Avancadas". Default: "transporte escolar". Permite adicionar multiplas keywords. Salva por cidade. Scraper executa busca para cada keyword.
**Dependencias:** Nenhuma

### Story 3.2 — Feedback Inteligente para 0 Resultados (P0)
**RF:** RF-S2
**Complexidade:** Pequena (2 pontos)
**Descricao:** Banner de alerta quando coleta retorna 0 leads. Mostra: motivo provavel, sugestoes de keywords alternativas, contador de execucoes consecutivas com 0 resultados, botao "Editar keywords" direto no alerta.
**Dependencias:** Story 3.1 (keywords customizaveis)

### Story 3.3 — Pipeline de Resultados Transparente (P0)
**RF:** RF-S3
**Complexidade:** Pequena (2 pontos)
**Descricao:** Cada execucao mostra fluxo completo: Encontrados (X) > Validos (Y) > Duplicados (Z) > Novos (W). Barra segmentada com cores por etapa. Tooltip com detalhes de cada etapa.
**Dependencias:** Nenhuma (usa dados ja existentes do scraper)

### Story 3.4 — Agendamento de Coletas Recorrentes (P1)
**RF:** RF-S4
**Complexidade:** Grande (5 pontos)
**Descricao:** Formulario para criar agendamentos com: frequencia (diaria/semanal/mensal), horario, cidade+estado+keywords, quantidade. Lista de agendamentos com toggle on/off. Execucao via Celery ou cron. Limite de 5 agendamentos no MVP.
**Dependencias:** Story 3.1 (keywords), tabela scraper_schedules (nova)

### Story 3.5 — Opcoes Avancadas no Formulario (P1)
**RF:** RF-S6
**Complexidade:** Pequena (2 pontos)
**Descricao:** Toggle "Avancado" no formulario com checkboxes: ignorar leads existentes (default on), validar telefone (default on), buscar CNPJ (default off). Radio button de fonte: Google Maps (ativo), outros "Em breve" (disabled).
**Dependencias:** Story 3.1 (secao avancada ja criada)

### Story 3.6 — Mapa de Cobertura (P2)
**RF:** RF-S5
**Complexidade:** Media (3 pontos)
**Descricao:** Sidebar com lista de estados e barras proporcionais ao numero de cidades. Total de cidades ativas, media leads/cidade. Sugestao de proxima cidade (hardcoded baseado em capitais e populacao).
**Dependencias:** Dados de scrape_jobs existentes

---

## Dependencias entre Stories

```
Story 3.1 (Keywords) ──→ Story 3.2 (Feedback)
                     └──→ Story 3.4 (Agendamento)
                     └──→ Story 3.5 (Opcoes avancadas)

Story 3.3 (Pipeline) [independente]
Story 3.6 (Cobertura) [independente]
```

## Dependencias de Outros Epics

| Dependencia | Epic | Story | Motivo |
|-------------|------|-------|--------|
| Nenhuma critica | — | — | Scraper v2 e majoritariamente independente |

**Nota:** Este epic pode ser iniciado em paralelo com Epic 4 (Leads v2).

## Criterios de Aceite do Epic

- [ ] Keywords editaveis no formulario de coleta
- [ ] Feedback exibido quando coleta retorna 0 leads
- [ ] Pipeline de resultados mostra 4 etapas por execucao
- [ ] Agendamento cria e executa coletas automaticas
- [ ] Opcoes avancadas funcionais
- [ ] Cobertura mostra estados/cidades ja coletados

## Definition of Done

- [ ] Todas as stories P0 implementadas e testadas
- [ ] Teste: executar coleta com keyword customizada e verificar resultado
- [ ] Teste: executar coleta que retorna 0 leads e verificar feedback
- [ ] Teste: pipeline mostra numeros corretos (conferir manualmente)
- [ ] Performance: formulario responde em < 200ms
- [ ] Sem regressoes no scraper existente
