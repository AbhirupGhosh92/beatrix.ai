# #136 scenario results (Tester, browser, side-by-side harness)

The CMS needs an admin login, so the Tester rendered two `JsonTreeEditor`s in a temporary route (since removed): OLD = `main`'s component, NEW = this branch. Document: `{alpha:{x,y}, beta:[1,2,3], gamma:"g", delta:{z}}`. Real key presses and clicks.

| Check | Result |
|---|---|
| Typing X, Y, Z in `alpha`'s key field (NEW) | PASS: same input stayed focused, key `alphaXYZ`, caret kept (inserting "12" at position 2 ended at 4) |
| Same steps on OLD (`main`) | Bug reproduced: key `alphax` only, focus moved to BODY, `alpha` collapsed |
| Rename an expanded entry with children | PASS: stays expanded, still shows `x` and `y` |
| Empty key | PASS: inline "A key cannot be empty.", document unchanged |
| Duplicate key (`beta`) | PASS: inline 'The key "beta" already exists.', document unchanged |
| Rename with search active | PASS: focus kept, row stays visible |
| Move / remove array item, remove map entry, change type, add entry | PASS, add entry identical to `main` |
| Open state after removing a map entry (design decision 3) | No visible drift in the two cases tried |

Not captured: screenshots (the harness was removed and the tool's output was text). Not exercised: the real `/admin/cms`, resume structure editor and tracker tailor JSON (same component, need sessions).
