# Design System Squad — Governance Flow

## Overview

O squad opera com 7 agentes organizados em 3 camadas: orquestração, especialistas de domínio e especialistas técnicos. Todo request entra pelo **Design Chief**, que classifica, roteia e acompanha a execução.

---

## Fluxo Geral

```mermaid
flowchart TD
    USER([Usuario]) --> DC{Design Chief}

    DC -->|"design system, component,<br/>token, atomic, a11y"| BF[Brad Frost<br/><small>Arquitetura & Componentes</small>]
    DC -->|"designops, maturity,<br/>process, scaling"| DM_malouf[Dave Malouf<br/><small>DesignOps & Processos</small>]
    DC -->|"buy-in, stakeholder,<br/>pitch, adoption"| DM_mall[Dan Mall<br/><small>Adoção & Buy-in</small>]
    DC -->|"brand, logo, video,<br/>photo"| OUT([Out of Scope<br/>/Brand · /ContentVisual])

    BF -->|"extrair/estruturar tokens"| TA[DS Token Architect<br/><small>Atlas — Figma→Tokens</small>]
    BF -->|"stories, testes visuais"| SE[Storybook Expert<br/><small>Stories & Testing</small>]
    BF -->|"pipeline Figma→shadcn"| FL[Foundations Lead<br/><small>Pipeline 3 Fases</small>]

    FL -->|"Phase 1: tokens"| TA
    FL -->|"Phase 2-3: componentes"| BF

    DM_mall -->|"direção aprovada,<br/>hora de construir"| BF
    DM_mall -->|"escalar time,<br/>governance"| DM_malouf

    DM_malouf -->|"time pronto,<br/>hora de construir"| BF

    SE -->|"componente inexistente,<br/>precisa criar"| BF
    SE -->|"spec Figma diverge"| FL

    BF -->|"precisa routing"| DC
    BF -->|"precisa vender DS"| DM_mall
    BF -->|"precisa escalar"| DM_malouf

    style DC fill:#1a1a2e,stroke:#e94560,color:#fff,stroke-width:2px
    style BF fill:#1a1a2e,stroke:#0f3460,color:#fff,stroke-width:2px
    style TA fill:#1a1a2e,stroke:#16213e,color:#fff
    style FL fill:#1a1a2e,stroke:#16213e,color:#fff
    style SE fill:#1a1a2e,stroke:#16213e,color:#fff
    style DM_malouf fill:#1a1a2e,stroke:#533483,color:#fff
    style DM_mall fill:#1a1a2e,stroke:#533483,color:#fff
    style OUT fill:#2d2d2d,stroke:#666,color:#999
    style USER fill:#0f3460,stroke:#e94560,color:#fff
```

---

## Camadas

### Camada 0 — Orquestração

| Agente | Papel | Nunca faz |
|--------|-------|-----------|
| **Design Chief** | Classifica requests como IN_SCOPE ou OUT_OF_SCOPE. Roteia para o especialista certo. Gerencia quality gates e handoffs entre agentes. | Implementar código, rodar audits, criar componentes |

### Camada 1 — Especialistas de Domínio

| Agente | Domínio | Entrega |
|--------|---------|---------|
| **Brad Frost** | Arquitetura DS, componentes, tokens, a11y, audits | Componentes, auditorias, migration strategies, documentação |
| **Dave Malouf** | DesignOps, processos, maturidade, scaling | Maturity assessments, métricas, team models, governance |
| **Dan Mall** | Stakeholder buy-in, adoção, exploração visual | Element Collages, stakeholder pitches, ROI arguments |

### Camada 2 — Especialistas Técnicos

| Agente | Domínio | Delegado por |
|--------|---------|--------------|
| **DS Token Architect (Atlas)** | Transformação Figma→tokens (JSON/CSS/TS) | Brad Frost, Foundations Lead |
| **Foundations Lead** | Pipeline 3 fases Figma→shadcn | Design Chief (via workflow) |
| **Storybook Expert** | Stories, interaction testing, visual regression | Brad Frost (após componente pronto) |

---

## Workflows Nomeados

O Design Chief seleciona o workflow baseado no tipo de request:

```mermaid
flowchart LR
    DC{Design Chief} --> W1[audit-only]
    DC --> W2[brownfield-complete]
    DC --> W3[greenfield-new]
    DC --> W4[dtcg-tokens-governance]
    DC --> W5[foundations-pipeline]
    DC --> W6[motion-quality]
    DC --> W7[agentic-readiness]
    DC --> W8[self-healing]

    W1 -->|"auditar sem modificar"| BF[Brad Frost]
    W2 -->|"DS existente, adaptar"| BF
    W3 -->|"DS do zero"| BF
    W4 -->|"tokens W3C DTCG"| TA[Atlas]
    W5 -->|"Figma→shadcn 3 fases"| FL[Foundations Lead]
    W6 -->|"auditar motion/animações"| BF
    W7 -->|"validar AI-readiness"| BF
    W8 -->|"detectar e corrigir drift"| BF

    style DC fill:#1a1a2e,stroke:#e94560,color:#fff,stroke-width:2px
    style W1 fill:#2d2d2d,stroke:#444,color:#ccc
    style W2 fill:#2d2d2d,stroke:#444,color:#ccc
    style W3 fill:#2d2d2d,stroke:#444,color:#ccc
    style W4 fill:#2d2d2d,stroke:#444,color:#ccc
    style W5 fill:#2d2d2d,stroke:#444,color:#ccc
    style W6 fill:#2d2d2d,stroke:#444,color:#ccc
    style W7 fill:#2d2d2d,stroke:#444,color:#ccc
    style W8 fill:#2d2d2d,stroke:#444,color:#ccc
    style BF fill:#1a1a2e,stroke:#0f3460,color:#fff
    style TA fill:#1a1a2e,stroke:#16213e,color:#fff
    style FL fill:#1a1a2e,stroke:#16213e,color:#fff
```

| Workflow | Quando usar | Agente principal |
|----------|-------------|------------------|
| `audit-only` | Auditar DS sem modificar código | Brad Frost |
| `brownfield-complete` | DS existente, adaptar/melhorar | Brad Frost |
| `greenfield-new` | Criar DS do zero | Brad Frost |
| `dtcg-tokens-governance` | Estruturar tokens no formato W3C DTCG | Atlas |
| `foundations-pipeline` | Pipeline completo Figma→shadcn (3 fases) | Foundations Lead |
| `motion-quality` | Auditar motion e animações | Brad Frost |
| `agentic-readiness` | Validar se DS está AI-ready | Brad Frost |
| `self-healing` | Detectar e corrigir drift automaticamente | Brad Frost |

---

## Foundations Pipeline (Detalhe)

O workflow mais complexo. Foundations Lead orquestra 3 fases sequenciais com QA gates bloqueantes:

```mermaid
flowchart TD
    FIGMA[(Figma<br/>Variables & Components)] --> F1

    subgraph "Phase 1 — Foundations & Tokens"
        F1[f1-ingest-figma-tokens] --> F1b[f1-map-tokens-to-shadcn]
        F1b --> F1c[f1-apply-foundations]
        F1c --> F1d{f1-qa-foundations}
    end

    F1d -->|PASS| F2

    subgraph "Phase 2 — Base Components"
        F2[f2-ingest-base-components] --> F2b[f2-adapt-shadcn-components]
        F2b --> F2d{f2-qa-base-components}
    end

    F2d -->|PASS| F3

    subgraph "Phase 3 — Derived Components"
        F3[f3-derive-components] --> F3d{f3-qa-derived-components}
    end

    F3d -->|PASS| DONE([DS Customizado])

    F1d -->|FAIL| F1
    F2d -->|FAIL| F2
    F3d -->|FAIL| F3

    F1 -.->|"delega tokens"| TA[Atlas]
    F2b -.->|"delega patterns"| BF[Brad Frost]

    style FIGMA fill:#2d2d2d,stroke:#e94560,color:#fff
    style DONE fill:#0f3460,stroke:#e94560,color:#fff
    style F1d fill:#1a1a2e,stroke:#e94560,color:#fff
    style F2d fill:#1a1a2e,stroke:#e94560,color:#fff
    style F3d fill:#1a1a2e,stroke:#e94560,color:#fff
    style TA fill:#1a1a2e,stroke:#16213e,color:#fff
    style BF fill:#1a1a2e,stroke:#0f3460,color:#fff
```

**Regras do pipeline:**
- Cada fase tem um QA gate bloqueante — não avança sem PASS
- Phase 1 produz `globals.css` com tokens mapeados para CSS vars do shadcn
- Phase 2 adapta componentes base (Button, Input, Card, etc.) preservando props API e a11y
- Phase 3 deriva componentes compostos a partir dos base adaptados
- Cores sempre em OKLch. Dark mode parity obrigatória. Zero tokens inventados.

---

## Handoff entre Agentes

Cada agente sabe quando escalar ou delegar:

| De | Para | Quando |
|----|------|--------|
| **Qualquer agente** | Design Chief | Request fora do domínio do agente atual |
| Brad Frost | Dan Mall | Precisa vender o DS para stakeholders |
| Brad Frost | Dave Malouf | DS precisa de DesignOps (scaling, processos) |
| Brad Frost | Atlas | Componentes prontos, extrair tokens |
| Dan Mall | Brad Frost | Direção visual aprovada, hora de construir |
| Dan Mall | Dave Malouf | Buy-in obtido, precisa escalar o time |
| Dave Malouf | Brad Frost | Time estruturado, hora de construir |
| Storybook Expert | Brad Frost | Componente não existe, precisa criar |
| Storybook Expert | Foundations Lead | Spec Figma diverge do componente |
| Foundations Lead | Atlas | Token normalization (Phase 1) |
| Foundations Lead | Brad Frost | Component patterns (Phase 2-3) |

---

## Scope Boundaries

O Design Chief rejeita requests fora do escopo do squad:

| Request | Destino | Motivo |
|---------|---------|--------|
| Brand, logo, identidade visual | `/Brand` | Squad separado |
| Thumbnail, foto, vídeo, color grading | `/ContentVisual` | Squad separado |
| Pricing, positioning | `/Brand` | Estratégia de marca |

Tudo que envolve **tokens, componentes, a11y, stories, DesignOps ou adoção** é IN_SCOPE.
