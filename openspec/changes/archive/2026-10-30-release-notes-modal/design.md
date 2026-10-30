# Design

- **Source of truth**: the GitHub Release. The repo is public, so the Next.js server reads `GET /repos/<repo>/releases/latest` unauthenticated (browser never calls GitHub). Repo defaults to `AbhirupGhosh92/beatrix.ai`, overridable with `RELEASES_REPO`.
- **Caching**: in memory for 10 minutes, keeping the last good copy if GitHub fails (same pattern as `profileService`). The 60 requests/hour unauthenticated limit is therefore not a concern.
- **Failure**: no release or an error yields `null`; the control is not rendered and the page is unaffected.
- **Rendering**: notes are shown as plain text with simple bullets, never as HTML, so release bodies cannot inject markup.
- **Workflow**: triggered by `push` to `release/**`. The version comes from the branch name passed through `env:`; the job fails if `RELEASE_NOTES.md` is missing or empty. Re-pushing updates the existing release instead of failing. Only the newest version is marked Latest.
- **Assumption**: notes are written by hand on the release branch, short and for end users.
