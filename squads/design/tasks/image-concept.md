# Image Concept Task

> Task ID: image-concept
> Agent: nano-banana-generator
> Version: 1.0.0
> v4.0-compatible: true
> Command: `*concept {brief}`
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[]` · enables: `[image-generate, image-batch]` · workflow: `standalone`

## Description

Create a concept package before generation: visual direction, prompt options, and recommendation.

## Inputs

- Brand/project context
- Target audience
- Desired emotion
- Channel/format
- Constraints

## Workflow

1. Reframe the request as communication goal.
2. Build 3 concept directions (safe, balanced, bold).
3. For each concept, provide SCDS prompt draft.
4. Highlight risks and tradeoffs per concept.
5. Recommend one concept with rationale.
6. Ask for concept approval.

## Output

- `concepts[]` with name, mood, style, SCDS draft
- `recommendation`
- `approval_question`

## Failure Handling

- Vague objective: request concrete conversion or storytelling goal.
- Contradictory constraints: flag conflict and request priority order.

## Success Criteria

- [ ] 3 distinct concepts presented
- [ ] Each concept has SCDS draft
- [ ] Recommendation includes tradeoff rationale
- [ ] User can approve one concept directly
