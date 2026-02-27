# Design Squad — Agent Commands

> **AIOS Integration:** 8 specialized design agents available via slash commands

## Activation Patterns

Use ANY of these patterns to activate each agent:

```
@agent-id          # Shorthand (e.g., @brad-frost)
/agent-id          # Slash command (e.g., /brad-frost)
/agent-id.md       # Slash with extension (e.g., /brad-frost.md)
/design:agents:agent-id  # Full AIOS pattern (e.g., /design:agents:brad-frost)
```

---

## 1️⃣ Brad Frost — Atomic Design & Pattern Consolidation

**Focus:** Design systems, atomic design methodology, pattern audit & consolidation, token extraction

```bash
@brad-frost
/brad-frost
/design:agents:brad-frost
```

**When to use:**
- Complete design system audit (brownfield)
- Pattern consolidation & deduplication
- Design tokens extraction
- Atomic design setup (greenfield)
- Component building (atoms → molecules → organisms)
- Accessibility & WCAG compliance

**Key commands:**
- `*audit` - Interface inventory & pattern audit
- `*consolidate` - Pattern consolidation
- `*tokenize` - Extract design tokens
- `*setup` - Greenfield design system setup
- `*agentic-audit` - AI-powered audit

---

## 2️⃣ Dan Mall — Design System Adoption & Stakeholder Buy-In

**Focus:** Organizational adoption, stakeholder engagement, change management, design system ROI

```bash
@dan-mall
/dan-mall
/design:agents:dan-mall
```

**When to use:**
- Getting stakeholder buy-in for design systems
- Measuring design system ROI
- Organizational adoption strategy
- Change management for design system rollout
- Demonstrating design system value
- Building business cases for design investment

**Key commands:**
- `*pitch` - Create stakeholder pitch
- `*roi-calculate` - Calculate design system ROI
- `*adoption-plan` - Build adoption strategy
- `*metrics` - Define success metrics
- `*change-management` - Organizational change plan

---

## 3️⃣ Dave Malouf — Design Operations & Scaling

**Focus:** Design operations, team scaling, process optimization, design maturity

```bash
@dave-malouf
/dave-malouf
/design:agents:dave-malouf
```

**When to use:**
- Design operations setup & maturity assessment
- Scaling design teams
- Design process optimization
- Tool stack & infrastructure evaluation
- Design governance & quality gates
- Workflow automation

**Key commands:**
- `*designops-assess` - DesignOps maturity assessment
- `*scale-team` - Team scaling strategy
- `*process-optimize` - Design process optimization
- `*tool-stack` - Tool evaluation & selection
- `*governance-setup` - Design governance framework

---

## 4️⃣ Design Chief — Orchestration & Routing

**Focus:** Request triage, specialist routing, orchestration, scope boundaries

```bash
@design-chief
/design-chief
/design:agents:design-chief
```

**When to use:**
- Unclear which design specialist you need
- Triaging design work requests
- Routing to appropriate specialist
- Orchestrating design system workflows
- Out-of-scope work routing (brand, content, video)

**Key commands:**
- `*triage` - Classify & route request
- `*route` - Route to specialist
- `*review-plan` - Review design deliverable plan
- `*handoff` - Coordinate handoff to other squad

---

## 5️⃣ DS Foundations Lead — Design System Foundations Pipeline

**Focus:** Design system foundations, component base building, tokens pipeline

```bash
@ds-foundations-lead
/ds-foundations-lead
/design:agents:ds-foundations-lead
```

**When to use:**
- Building design system foundations (F1, F2, F3 phases)
- Base component creation & validation
- Derived component architecture
- Figma tokens pipeline setup
- Foundations documentation & handoff

**Key commands:**
- `*foundations-pipeline` - Run complete foundations pipeline
- `*f1-audit` - F1 base components audit
- `*f2-design` - F2 derived components design
- `*f3-governance` - F3 governance setup
- `*figma-tokens-setup` - Figma tokens pipeline

---

## 6️⃣ DS Token Architect — Token Normalization & Architecture

**Focus:** Design tokens architecture, normalization, Figma variables mapping

```bash
@ds-token-architect
/ds-token-architect
/design:agents:ds-token-architect
```

**When to use:**
- Design token architecture & strategy
- Token normalization across systems
- Figma variables mapping
- W3C DTCG token format adoption
- Token scaling for multi-brand systems
- Token governance & documentation

**Key commands:**
- `*token-architecture` - Design token architecture
- `*normalize-tokens` - Token normalization
- `*figma-variables` - Figma variables mapping
- `*w3c-dtcg` - W3C DTCG token format
- `*multi-brand-tokens` - Multi-brand token system

---

## 7️⃣ Nano Banana Generator — Code Generation & Automation

**Focus:** Code generation, component automation, brownfield migration

```bash
@nano-banana-generator
/nano-banana-generator
/design:agents:nano-banana-generator
```

**When to use:**
- Auto-generate component code
- Brownfield component migration
- Figma → Code automation
- Component inventory scanning
- Legacy component refactoring
- Template generation

**Key commands:**
- `*generate-component` - Generate component code
- `*scan-inventory` - Component inventory scan
- `*migrate-legacy` - Migrate legacy components
- `*figma-to-code` - Figma → Code generation
- `*atomize` - Atomize monolithic components

---

## 8️⃣ Storybook Expert — Storybook Setup, Stories & Documentation

**Focus:** Storybook configuration, story writing (CSF3), interaction testing, visual regression

```bash
@storybook-expert
/storybook-expert
/design:agents:storybook-expert
```

**When to use:**
- Storybook setup & configuration
- Writing component stories (CSF3 format)
- Play function interactions
- Visual regression testing
- Component autodocs setup
- Brownfield Storybook migration

**Key commands:**
- `*setup-storybook` - Install & configure Storybook
- `*write-story` - Write component story (CSF3)
- `*play-function` - Create interaction test (play)
- `*visual-regression` - Setup visual regression
- `*autodocs-setup` - Enable autodocs
- `*migrate-storybook` - Migrate legacy stories to CSF3
- `*scan-legacy` - Scan for legacy stories
- `*brownfield-migration` - Full brownfield migration

---

## Quick Reference

| Agent | Activation | Best For |
|-------|-----------|----------|
| 🎨 **Brad Frost** | `/brad-frost` | Design system audit, atomics, tokens |
| 📊 **Dan Mall** | `/dan-mall` | Adoption, ROI, stakeholder buy-in |
| 🔧 **Dave Malouf** | `/dave-malouf` | DesignOps, scaling, process |
| 🎯 **Design Chief** | `/design-chief` | Triage & routing |
| 🏗️ **DS Foundations** | `/ds-foundations-lead` | Foundations pipeline, F1-F3 |
| 🎭 **DS Token Architect** | `/ds-token-architect` | Tokens, Figma variables |
| 🤖 **Nano Banana** | `/nano-banana-generator` | Code gen, migration, automation |
| 📚 **Storybook Expert** | `/storybook-expert` | Storybook, stories, interactions |

---

## Agent Collaboration Matrix

```
Request → @design-chief (triage)
          ├─ Design System? → @brad-frost
          ├─ Adoption? → @dan-mall
          ├─ DesignOps? → @dave-malouf
          ├─ Foundations? → @ds-foundations-lead
          ├─ Tokens? → @ds-token-architect
          ├─ Code Gen? → @nano-banana-generator
          └─ Storybook? → @storybook-expert

Out-of-scope?
          ├─ Brand/Logo → /Brand squad
          └─ Content/Video → /ContentVisual squad
```

---

## How to Register Commands

In Claude Code:

1. **Via Slash Menu:** Type `/` and search for agent name
2. **Via Skills:** Type `/skills` and select `design:*` agents
3. **Via Direct Activation:**
   ```
   /brad-frost          # Loads squads/design/agents/brad-frost.md
   @brad-frost          # Same as above
   /design:agents:brad-frost  # Full AIOS pattern
   ```

---

## File References

- Agents: `squads/design/agents/{agent-id}.md`
- Tasks: `squads/design/tasks/ds-*.md`
- Templates: `squads/design/templates/*.md`
- Workflows: `squads/design/workflows/*.yaml`
- Commands: `.claude/commands/design/agents/{agent-id}.md`

---

**Last Updated:** 2026-02-26
**Squad:** Design
**Version:** 1.0.0-aios
