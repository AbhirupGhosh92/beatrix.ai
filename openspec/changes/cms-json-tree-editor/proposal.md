## Why

Admins change CMS files (`profile.json`, `resume-config.json`, ...) by typing into raw JSON, so one stray comma or quote breaks the file and a single value is hard to find. The shared JSON editor already has a Tree view, but it is read-only. A Firestore-console-style nested field editor lets admins change keys and values directly.

Fixes #112

## What Changes

- The Tree view of the shared JSON editor (`components/ui/JsonEditor`) becomes editable: nested rows with an editable key, a type selector (string, number, boolean, null, map, array) and a value input, plus add, remove and array reorder.
- Tree edits update the same JSON text the Code view edits, so the Code / Tree toggle, Save, Reset, Format, the unsaved-changes badge and the syntax check keep working unchanged.
- The editor takes an optional starting view; `/admin/cms` opens on Tree when the file parses and on Code when it does not. Other places keep opening on Code.
- Duplicate keys in one map are refused with an inline error.
- The existing Collapse / Expand and key search controls stay in Tree view.
- The editor stays read-only (and uses the current viewer) when `readOnly` is set.

Out of scope: drag-and-drop reordering, undo/redo, schema-aware hints, any change to the CMS API, Cloud Functions or storage, and a different starting view for the resume structure editor and the tracker's tailor JSON.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-cms`: the JSON editor gains an editable tree view and the CMS editor opens on it.

## Impact

- `src/components/ui/JsonEditor.tsx` (starting view, editable tree) and a new `src/components/ui/JsonTreeEditor.tsx`.
- `src/app/admin/cms/page.tsx` (starts on Tree).
- The resume structure editor and the tracker's tailor JSON get the editable tree through the shared component; they still open on Code.
- `CLAUDE.md` notes on the JSON editor; no deployment, API or dependency change.
