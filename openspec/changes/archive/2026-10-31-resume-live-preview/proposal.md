# Proposal

Fixes #85 (branch `feature/85-resume-live-preview`).

## Why

The template preview shows fixed sample content, so a user cannot see how their own resume looks until they generate a file. The form's data is already the single source of truth (it is what the form edits and autosave stores), so the preview should be drawn from it, with the sample values only as the default for what is not filled in yet.

## What Changes

- The preview renders the open resume's current data live, from the same state the form edits and autosave stores. There is no second copy.
- An empty field, or a repeatable section with no filled entry, shows its sample value in the preview, so a new resume previews as a believable example and the user's own text replaces it field by field.
- The preview says that sample text is shown for the fields not filled in yet.
- Updates are debounced and stale renders are discarded so typing stays smooth.
- The "Template preview with sample data" requirement is replaced by "Live template preview", reversing its rule that the preview never contains the user's resume.

Out of scope: marking sample text inside the PDF, click-to-edit from the preview, scroll sync, a DOCX-specific preview renderer, and any change to the empty-start rule or to validation (Generate still needs real content and never writes sample text).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `resume-builder`: the template preview shows the resume's own content live, with sample values as the default for empty fields.

## Impact

- **Code**: `src/components/resume/TemplatePreview.tsx` (takes the data, debounces, cancels stale renders), `ExportPanel.tsx` and `ResumeEditor.tsx` (pass `doc.data`), a new pure helper `withSampleFallback` in `src/lib/resume/sample.ts`.
- **Backend, infrastructure, config, storage**: none.
- **Docs**: `CLAUDE.md` (resume builder paragraph), README structure if a file is added.
