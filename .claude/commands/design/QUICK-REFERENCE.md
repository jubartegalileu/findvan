# Design Squad — Quick Command Reference

## 🚀 How to Activate Agents

**Type any of these in Claude Code:**

```
/brad-frost              # Atomic Design & Patterns
@brad-frost              # Same as above

/dan-mall                # Design System Adoption
@dan-mall                # Same as above

/dave-malouf             # Design Operations & Scaling
@dave-malouf             # Same as above

/design-chief            # Request Triage & Routing
@design-chief            # Same as above

/ds-foundations-lead     # Foundations Pipeline (F1-F3)
@ds-foundations-lead     # Same as above

/ds-token-architect      # Token Architecture & Normalization
@ds-token-architect      # Same as above

/nano-banana-generator   # Code Generation & Automation
@nano-banana-generator   # Same as above

/storybook-expert        # Storybook Setup & Stories
@storybook-expert        # Same as above
```

---

## 📋 What Each Agent Does

### 🎨 Brad Frost
**Atomic Design & Pattern Consolidation**

```bash
/brad-frost
```

Commands: `*audit`, `*consolidate`, `*tokenize`, `*setup`, `*agentic-audit`

Use for:
- Design system audit (see all the patterns/chaos)
- Pattern consolidation (reduce 47 buttons → 3)
- Design tokens extraction
- Atomic design greenfield setup

### 📊 Dan Mall
**Design System Adoption & ROI**

```bash
/dan-mall
```

Commands: `*pitch`, `*roi-calculate`, `*adoption-plan`, `*metrics`

Use for:
- Getting stakeholder buy-in
- Calculating design system ROI
- Building adoption strategy
- Demonstrating business value

### 🔧 Dave Malouf
**Design Operations & Team Scaling**

```bash
/dave-malouf
```

Commands: `*designops-assess`, `*scale-team`, `*process-optimize`, `*tool-stack`

Use for:
- DesignOps maturity assessment
- Scaling design teams
- Process optimization
- Tool evaluation & governance

### 🎯 Design Chief
**Orchestration & Request Triage**

```bash
/design-chief
```

Commands: `*triage`, `*route`, `*review-plan`, `*handoff`

Use for:
- Unclear which specialist you need
- Triaging design work
- Routing to the right person
- Orchestrating design workflows

### 🏗️ DS Foundations Lead
**Design System Foundations Pipeline**

```bash
/ds-foundations-lead
```

Commands: `*foundations-pipeline`, `*f1-audit`, `*f2-design`, `*f3-governance`

Use for:
- Building design system foundations (F1, F2, F3)
- Base component creation
- Derived component architecture
- Figma tokens pipeline

### 🎭 DS Token Architect
**Token Architecture & Normalization**

```bash
/ds-token-architect
```

Commands: `*token-architecture`, `*normalize-tokens`, `*figma-variables`, `*w3c-dtcg`

Use for:
- Design token architecture
- Token normalization
- Figma variables mapping
- W3C DTCG token format

### 🤖 Nano Banana Generator
**Code Generation & Automation**

```bash
/nano-banana-generator
```

Commands: `*generate-component`, `*scan-inventory`, `*migrate-legacy`, `*figma-to-code`

Use for:
- Auto-generate component code
- Component inventory scanning
- Brownfield migration
- Figma → Code automation

### 📚 Storybook Expert
**Storybook Setup & Stories**

```bash
/storybook-expert
```

Commands: `*setup-storybook`, `*write-story`, `*play-function`, `*visual-regression`

Use for:
- Storybook setup & configuration
- Writing component stories (CSF3)
- Play function interactions
- Visual regression testing
- Brownfield Storybook migration

---

## 🔄 Decision Tree: Which Agent?

```
Need help? Start with @design-chief
│
├─ Design System Work?          → @brad-frost
├─ Getting Stakeholder Buy-In?  → @dan-mall
├─ DesignOps/Scaling?           → @dave-malouf
├─ Foundations Pipeline?        → @ds-foundations-lead
├─ Design Tokens?               → @ds-token-architect
├─ Code Generation?             → @nano-banana-generator
└─ Storybook?                   → @storybook-expert
```

---

## 📁 Related Files

- **Documentation:** `.claude/commands/design/DESIGN-SQUAD-AGENTS.md`
- **Agent files:** `squads/design/agents/{agent-id}.md`
- **Tasks:** `squads/design/tasks/`
- **Templates:** `squads/design/templates/`
- **Workflows:** `squads/design/workflows/`

---

## ✨ Tips

1. **Type `/` to see all commands** — Claude Code will show all registered design agents
2. **Any agent format works:**
   - `@brad-frost` (shorthand)
   - `/brad-frost` (slash)
   - `/design:agents:brad-frost` (AIOS pattern)
3. **Once activated,** type `*help` to see available commands
4. **Type `*exit`** when done with an agent to return to normal mode

---

**Last Updated:** 2026-02-26
**Design Squad Version:** 1.0.0
