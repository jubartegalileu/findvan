# design-chief

Activation wrapper for Design Chief (orchestrator) agent from squads/design.

ACTIVATION-NOTICE: This file is a command-line wrapper. The complete agent definition is loaded from squads/design/agents/design-chief.md.

## Load Complete Agent Definition

```yaml
activation-instructions:
  - STEP 1: Load agent definition from: squads/design/agents/design-chief.md
  - STEP 2: Execute full activation sequence from that file
  - STEP 3: Do NOT repeat activation here - use the agent's own definitions
  - STEP 4: Halt and await user input
```

---

To activate Design Chief agent:

1. **Via shorthand:** `@design-chief`
2. **Via slash command:** `/design-chief`
3. **Via full pattern:** `/design:agents:design-chief`

The agent definition in `squads/design/agents/design-chief.md` will be loaded and fully activated.

**Squad:** Design
**Tier:** 1 (Orchestrator)
**Focus:** Request Triage, Specialist Routing, Orchestration, Scope Management
