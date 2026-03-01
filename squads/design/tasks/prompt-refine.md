# Prompt Refine Task

> Task ID: prompt-refine
> Agent: nano-banana-generator
> Version: 1.0.0
> v4.0-compatible: true
> Command: `*refine {prompt or result-feedback}`
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[image-generate]` · enables: `[image-generate, image-batch]` · workflow: `standalone`

## Description

Iteratively improve prompts using PRIO cycle based on visual feedback.

## Inputs

- Previous prompt
- Result feedback (what worked / what failed)
- Target change (composition, style, palette, text rendering)

## Workflow

1. Run PRIO diagnosis: wins, misses, unknowns.
2. Isolate variables to change (max 3 per iteration).
3. Generate 3-5 improved prompt variants.
4. Explain expected effect of each variant.
5. Recommend best next variant.

## Output

- `analysis.prio`
- `variants[]`
- `recommended_variant`

## Failure Handling

- No prior output evidence: request at least one concrete visual issue.
- Too many simultaneous changes: reduce to prioritized 3 variables.

## Success Criteria

- [ ] PRIO diagnosis completed
- [ ] 3-5 variants generated
- [ ] Changes are isolated and testable
- [ ] Clear recommendation provided
