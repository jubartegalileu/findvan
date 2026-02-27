# 🎨 Design Squad — Agent Commands

> **8 specialized design agents** integrated with Claude Code via AIOS slash commands

---

## ✅ Installation Complete

Your design squad is now fully operational in Claude Code. All 8 agents are registered and ready to use.

### Available Agents (8)

| # | Agent | Command | Focus |
|---|-------|---------|-------|
| 1 | 🎨 **Brad Frost** | `/brad-frost` | Atomic Design, Design Systems |
| 2 | 📊 **Dan Mall** | `/dan-mall` | Adoption, Stakeholder Buy-In |
| 3 | 🔧 **Dave Malouf** | `/dave-malouf` | DesignOps, Team Scaling |
| 4 | 🎯 **Design Chief** | `/design-chief` | Triage & Routing |
| 5 | 🏗️ **DS Foundations** | `/ds-foundations-lead` | Foundations Pipeline |
| 6 | 🎭 **DS Token Arch** | `/ds-token-architect` | Token Architecture |
| 7 | 🤖 **Nano Banana** | `/nano-banana-generator` | Code Generation |
| 8 | 📚 **Storybook Expert** | `/storybook-expert` | Storybook & Stories |

---

## 🚀 How to Use

### Option 1: Slash Command (Fastest)
```
/brad-frost
/dan-mall
/dave-malouf
/design-chief
/ds-foundations-lead
/ds-token-architect
/nano-banana-generator
/storybook-expert
```

### Option 2: Shorthand (@)
```
@brad-frost
@dan-mall
@dave-malouf
@design-chief
@ds-foundations-lead
@ds-token-architect
@nano-banana-generator
@storybook-expert
```

### Option 3: Menu (Type `/`)
1. Type `/` in Claude Code
2. Search for the agent name (e.g., "brad-frost")
3. Click to activate

### Option 4: Full AIOS Pattern
```
/design:agents:brad-frost
/design:agents:dan-mall
/design:agents:dave-malouf
/design:agents:design-chief
/design:agents:ds-foundations-lead
/design:agents:ds-token-architect
/design:agents:nano-banana-generator
/design:agents:storybook-expert
```

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| **DESIGN-SQUAD-AGENTS.md** | Complete agent descriptions & commands |
| **QUICK-REFERENCE.md** | Quick lookup & decision tree |
| **README.md** | This file |
| **agents/{agent}.md** | Individual agent activation wrappers |

---

## 🎯 Quick Start Examples

### Example 1: Design System Audit
```
/brad-frost
Type: *audit
→ Complete interface inventory & pattern analysis
```

### Example 2: Getting Buy-In
```
/dan-mall
Type: *roi-calculate
→ Calculate design system ROI for stakeholders
```

### Example 3: DesignOps Assessment
```
/dave-malouf
Type: *designops-assess
→ Evaluate your design operations maturity
```

### Example 4: Unsure Where to Start?
```
/design-chief
Type: *triage
→ Describe your need → Get routed to right specialist
```

### Example 5: Setup Storybook
```
/storybook-expert
Type: *setup-storybook
→ Install and configure Storybook with best practices
```

---

## 📚 Agent Commands

Once activated, each agent provides specialized commands. Type `*help` to see all:

### Brad Frost (`/brad-frost`)
```
*audit              - Interface inventory & pattern audit
*consolidate        - Pattern consolidation & deduplication
*tokenize           - Extract design tokens
*setup              - Greenfield design system setup
*agentic-audit      - AI-powered audit
*calculate-roi      - ROI calculation
```

### Dan Mall (`/dan-mall`)
```
*pitch              - Create stakeholder pitch
*roi-calculate      - Calculate design system ROI
*adoption-plan      - Build adoption strategy
*metrics            - Define success metrics
*change-management  - Organizational change plan
```

### Dave Malouf (`/dave-malouf`)
```
*designops-assess   - DesignOps maturity assessment
*scale-team         - Team scaling strategy
*process-optimize   - Design process optimization
*tool-stack         - Tool evaluation & selection
*governance-setup   - Design governance framework
```

### Design Chief (`/design-chief`)
```
*triage             - Classify & route request
*route              - Route to specialist
*review-plan        - Review design deliverable plan
*handoff            - Coordinate handoff to other squad
```

### DS Foundations Lead (`/ds-foundations-lead`)
```
*foundations-pipeline    - Run complete F1-F3 pipeline
*f1-audit               - F1 base components audit
*f2-design              - F2 derived components design
*f3-governance          - F3 governance setup
*figma-tokens-setup     - Figma tokens pipeline
```

### DS Token Architect (`/ds-token-architect`)
```
*token-architecture     - Design token architecture
*normalize-tokens       - Token normalization
*figma-variables        - Figma variables mapping
*w3c-dtcg              - W3C DTCG token format
*multi-brand-tokens    - Multi-brand token system
```

### Nano Banana Generator (`/nano-banana-generator`)
```
*generate-component     - Generate component code
*scan-inventory         - Component inventory scan
*migrate-legacy         - Migrate legacy components
*figma-to-code         - Figma → Code generation
*atomize               - Atomize monolithic components
```

### Storybook Expert (`/storybook-expert`)
```
*setup-storybook        - Install & configure Storybook
*write-story            - Write component story (CSF3)
*play-function          - Create interaction test
*visual-regression      - Setup visual regression
*autodocs-setup         - Enable autodocs
*migrate-storybook      - Migrate to CSF3
*brownfield-migration   - Full brownfield migration
```

---

## 🔄 Agent Collaboration

Agents work together through handoffs:

```
User Request
    ↓
@design-chief (triage)
    ├─ Routes to @brad-frost (design systems)
    ├─ Routes to @dan-mall (adoption)
    ├─ Routes to @dave-malouf (designops)
    ├─ Routes to @ds-foundations-lead (foundations)
    ├─ Routes to @ds-token-architect (tokens)
    ├─ Routes to @nano-banana-generator (code gen)
    └─ Routes to @storybook-expert (storybook)
```

---

## 🛠️ Technical Details

### File Structure
```
.claude/commands/design/
├── README.md                     # This file
├── QUICK-REFERENCE.md            # Quick lookup guide
├── DESIGN-SQUAD-AGENTS.md        # Complete documentation
└── agents/
    ├── brad-frost.md
    ├── dan-mall.md
    ├── dave-malouf.md
    ├── design-chief.md
    ├── ds-foundations-lead.md
    ├── ds-token-architect.md
    ├── nano-banana-generator.md
    └── storybook-expert.md
```

### Agent Definition Location
```
squads/design/agents/
├── brad-frost.md
├── dan-mall.md
├── dave-malouf.md
├── design-chief.md
├── ds-foundations-lead.md
├── ds-token-architect.md
├── nano-banana-generator.md
└── storybook-expert.md
```

### AIOS Integration
- **Type:** Squad-based agents
- **Pattern:** `/design:agents:{agent-id}`
- **Status:** Fully integrated with Claude Code
- **Version:** 1.0.0-aios

---

## 🎓 First Steps

1. **Type `/brad-frost`** to activate Brad Frost agent
2. **Type `*help`** to see available commands
3. **Type `*audit`** to run a design system audit
4. **Type `*exit`** when done

Or start with **`/design-chief`** if you're unsure what you need.

---

## 📞 Support

- **Command not working?** Check the spelling (case-sensitive)
- **Agent not found?** Try `/` and search for the name
- **Need help?** Type `*help` within any agent
- **Want to exit?** Type `*exit`

---

## 📋 Checklist: Your Setup

- ✅ 8 agents created and registered
- ✅ Slash commands configured
- ✅ Documentation files created
- ✅ AIOS integration complete
- ✅ Ready for use!

---

**Design Squad Version:** 1.0.0-aios
**Last Updated:** 2026-02-26
**Status:** ✨ Production Ready

Try `/brad-frost` or `/design-chief` to get started!
