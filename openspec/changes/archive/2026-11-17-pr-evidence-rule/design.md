# Design

- The PO, not the Tester, captures the evidence: the PR description is the PO's artifact and the Tester is read-only.
- Capture uses headless Chrome (`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=W,H --blink-settings=preferredColorScheme=1 --virtual-time-budget=10000 --screenshot=file URL`; `preferredColorScheme=1` is dark, `0` light). Its minimum window width is about 500px, so 320px layouts are reported from measured results, and that is stated in the PR.
- Every image is opened with the Read tool before it is attached; themes were once swapped and a 375px shot was cropped.
- Images live in `docs/pr-assets/<issue-id>/` on the feature branch and are linked by commit SHA (`https://github.com/<owner>/<repo>/blob/<sha>/docs/pr-assets/<id>/<file>.png?raw=true`) so they survive branch deletion after merge.
- No tooling is added; the rule is instructions only.
