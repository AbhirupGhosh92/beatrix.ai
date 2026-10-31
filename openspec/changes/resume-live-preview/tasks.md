# Tasks

## 1. Preview data

- [ ] 1.1 Add `withSampleFallback(structure, data)` to `src/lib/resume/sample.ts` (per-field overlay for single sections, whole-entry rule for repeatable sections, blank values reuse `isBlank`); verify with a node script that an empty resume equals `sampleData`, a filled field replaces only that field, a cleared field returns to the sample, a repeatable section with one filled entry shows only the user's entries, and the user's data is never mutated.

## 2. Live preview in the builder

- [ ] 2.1 Pass `doc.data` from `ResumeEditor` through `ExportPanel` to `TemplatePreview`, render `withSampleFallback` output with a 500ms debounce, cancel stale renders and keep the previous PDF visible until the next is ready; verify `npm run typecheck`, `npm run lint` and `npm run build` pass.
- [ ] 2.2 Update the caption and iframe title to say sample text is shown for fields not filled in; verify the text in the browser.
- [ ] 2.3 Check in a browser (both themes, 320px to 1920px) that typing updates the preview within about a second, a partly filled resume mixes the user's content with sample entries, clearing a field restores the sample, Markdown shows no preview, switching template and an advanced user's structure edit still work, and Generate is still refused for an empty required field and never contains sample text; record what was and was not run.

## 3. Docs

- [ ] 3.1 Update the resume builder paragraph in `CLAUDE.md` (preview is live and derived from `doc.data`, with sample fallback) and the README structure if a file was added; verify the text matches the code.

## Workflow follow-up

- Archive the change with `/opsx:archive` before the PR is ready and commit the merged spec.
