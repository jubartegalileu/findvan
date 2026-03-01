# Image Generate Task

> Task ID: image-generate
> Agent: nano-banana-generator
> Version: 1.0.0
> v4.0-compatible: true
> Command: `*generate {brief}`
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[]` · enables: `[image-batch, image-upscale]` · workflow: `standalone`

## Description

Generate one approved image from a structured brief using OpenRouter image models.

## Inputs

- Objective: what the image must communicate
- Subject: main subject
- Setting: context/environment
- Style: aesthetic direction
- Technical: aspect ratio and resolution
- Constraints: forbidden elements and brand limits

## Workflow

1. Normalize input into SCDS blocks.
2. Add explicit negative prompt section.
3. Validate required technical params (`aspect_ratio`, `image_size`).
4. Present final prompt for approval.
5. Generate image only after approval.
6. Save output path and metadata.
7. Return summary with reuse-ready prompt.

## Output

- `output.image_path`
- `output.prompt_final`
- `output.model`
- `output.aspect_ratio`
- `output.image_size`
- `output.notes`

## Failure Handling

- Missing brief fields: request missing SCDS fields before generation.
- Missing technical params: block execution and request aspect ratio + resolution.
- API failure: retry once with same prompt and report error payload.

## Success Criteria

- [ ] Prompt structured in SCDS format
- [ ] Negative prompt included
- [ ] User approval recorded before generation
- [ ] Image generated and path returned
- [ ] Metadata documented
