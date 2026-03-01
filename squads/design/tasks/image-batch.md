# Image Batch Task

> Task ID: image-batch
> Agent: nano-banana-generator
> Version: 1.0.0
> v4.0-compatible: true
> Command: `*batch {brief}`
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[image-concept]` · enables: `[prompt-refine]` · workflow: `standalone`

## Description

Generate controlled prompt variations in batch for side-by-side comparison.

## Inputs

- Locked core prompt
- Variation axes (style, palette, framing, mood)
- Number of variants

## Workflow

1. Lock core prompt segment.
2. Define variation matrix (2-4 axes).
3. Generate variants systematically.
4. Run quick quality review per variant.
5. Rank top 3 with rationale.

## Output

- `variants[]` (prompt + image path + notes)
- `top_candidates[]`
- `selection_recommendation`

## Failure Handling

- Unlocked core prompt: block and request a fixed base prompt.
- Excessive variants: cap to manageable batch and prioritize axes.

## Success Criteria

- [ ] Controlled variation matrix used
- [ ] Multiple variants generated
- [ ] Top 3 ranked with clear criteria
