# Design

## Context

`ResumeEditor` holds the resume as `doc.data` (the JSON the form edits and autosave sends) and renders `ExportPanel`, which renders `TemplatePreview`. Today `TemplatePreview` ignores the data and renders `sampleData(structure)` through `buildDocument` and the real PDF renderer (`toPdf`), loaded on demand. See proposal.md for scope.

## Goals / Non-Goals

**Goals:**
- One source of truth: the preview is derived from `doc.data`, never stored or copied.
- Smooth typing: the PDF is not rebuilt on every keystroke.
- Sample content is only a default for what is empty.

**Non-Goals:**
- Changing validation, the empty-start rule, saving, or the export formats.

## Decisions

**Derive, do not copy.** `ResumeEditor` passes `doc.data` down; `TemplatePreview` computes `withSampleFallback(structure, data)` with `useMemo`. Nothing is added to editor state, so autosave and preview cannot disagree. Alternative: a separate "preview data" state synced by effects (rejected: two copies to keep in step).

**Fallback is per field, with a section rule for entries.** `withSampleFallback(structure, data)` in `src/lib/resume/sample.ts` starts from `sampleData(structure)` and overlays the user's data: a non-repeatable section takes each of the user's non-blank field values over the sample's; a repeatable section takes the user's entries when any entry has a non-blank value (blank entries dropped, as `buildDocument` already does) and the sample entries otherwise. Blankness reuses `isBlank` from `resumeValidation.ts`. This keeps a half-filled entry from being topped up with unrelated sample text inside the same job, which would read as the user's own claims. Alternative: field-level fallback inside user entries (rejected for that reason).

**Debounce and cancel.** The effect that renders the PDF waits about 500ms after the last change, then builds the blob; the existing `ignore` flag discards a render that finished after a newer one started, and the previous object URL is revoked only when the new one is ready, so the iframe does not flash blank between updates. The `toPdf` import stays lazy.

**Where the data comes from.** `ExportPanel` already receives `structure`; it also receives `data` and passes both on. `Generate` is unchanged: it exports `doc.data`, never the fallback, so sample text cannot reach a file.

**Label.** The caption becomes "Preview of your resume. Sample text is shown for fields you have not filled in yet." The iframe title is updated the same way.

## Risks / Trade-offs

- [PDF rebuild cost while typing] → 500ms debounce, cancel stale renders, lazy library; the rebuild is the same code the download runs.
- [A user reads sample text as their own] → The caption says so; the sample is placeholder-style content and Generate never includes it.
- [Iframe reload flicker] → Keep showing the previous PDF until the next one is ready.
- [Reverses the old "never the user's resume" rule] → The spec requirement is renamed and rewritten, not bypassed.

## Open Questions

- Whether the debounce should be shorter for small resumes. Deferrable: it is one constant.
