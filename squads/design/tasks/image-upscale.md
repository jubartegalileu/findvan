# Image Upscale Task

> Task ID: image-upscale
> Agent: nano-banana-generator
> Version: 1.0.0
> v4.0-compatible: true
> Command: `*upscale {image} {target}`
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[image-generate]` · enables: `[]` · workflow: `standalone`

## Description

Upscale an approved image preserving composition, readability, and style.

## Inputs

- Source image path
- Target size (`2K` or `4K`)
- Priority (detail vs speed)

## Workflow

1. Validate source image exists and is approved.
2. Confirm target resolution and aspect ratio lock.
3. Apply upscale request using selected model.
4. Check for artifacts (text distortion, oversharpening).
5. Return final file and quality notes.

## Output

- `upscaled.image_path`
- `upscaled.image_size`
- `upscaled.quality_notes`

## Failure Handling

- Missing source file: stop and request valid path.
- Quality regression after upscale: retry once with quality-first settings.

## Success Criteria

- [ ] Upscale performed to requested target
- [ ] Aspect ratio preserved
- [ ] Major artifacts checked and reported
