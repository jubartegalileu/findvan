# Style Guide Create Task

> Task ID: style-guide-create
> Agent: nano-banana-generator
> Version: 1.0.0
> v4.0-compatible: true
> Command: `*style-guide {brief}`
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[image-concept]` · enables: `[image-generate, image-batch]` · workflow: `standalone`

## Description

Create a concise visual style guide to stabilize image generation quality.

## Inputs

- Brand intent
- Audience
- Channel constraints
- Existing references (if any)

## Workflow

1. Define visual pillars (mood, color, composition, texture).
2. Define do/dont rules.
3. Map preferred SCDS patterns.
4. Produce reusable prompt template.
5. Provide checklist for future generations.

## Output

- `style_guide.visual_pillars`
- `style_guide.do_rules`
- `style_guide.dont_rules`
- `style_guide.prompt_template`
- `style_guide.review_checklist`

## Failure Handling

- No brand references: create neutral baseline and mark as provisional.
- Conflicting directions: request priority and lock one axis at a time.

## Success Criteria

- [ ] Clear generation rules documented
- [ ] Reusable prompt template included
- [ ] Checklist supports repeatable quality
