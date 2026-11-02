"""Tests for check-prod-ref.sh and cut-release.sh. They use temporary git repositories and a stub
`gh`, so nothing touches GitHub. Run: python3 -m unittest discover -s scripts/deploy -p 'test_*.py'"""

import os
import shutil
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
CHECK = os.path.join(HERE, "check-prod-ref.sh")
CUT = os.path.join(HERE, "cut-release.sh")

GH_STUB = r"""#!/usr/bin/env bash
# A tiny stand-in for `gh`: state lives in $GH_STATE as files (refs/<name> = commit, releases/<tag>).
set -euo pipefail
mkdir -p "$GH_STATE/refs" "$GH_STATE/releases"
echo "$*" >> "$GH_STATE/calls"
case "$1 $2" in
  "api repos/"*)
    path="$2"
    shift 2
    case "$path" in
      */git/ref/*)
        name="${path##*/git/ref/}"; file="$GH_STATE/refs/${name//\//_}"
        [[ -f "$file" ]] || exit 1
        printf '{"object":{"type":"commit","sha":"%s"}}\n' "$(cat "$file")" ;;
      */git/refs)
        ref="" sha=""
        while [[ $# -gt 0 ]]; do
          case "$1" in -f) kv="$2"; case "$kv" in ref=*) ref="${kv#ref=}";; sha=*) sha="${kv#sha=}";; esac; shift 2;; *) shift;; esac
        done
        name="${ref#refs/}"; echo "$sha" > "$GH_STATE/refs/${name//\//_}"; echo '{}' ;;
    esac ;;
  "release view") [[ -f "$GH_STATE/releases/$3" ]] || exit 1 ;;
  "release create") tag="$3"; target=""
    shift 3; while [[ $# -gt 0 ]]; do case "$1" in --target) target="$2"; shift 2;; *) shift;; esac; done
    echo "$target" > "$GH_STATE/releases/$tag"; echo "$target" > "$GH_STATE/refs/tags_$tag" ;;
  "release edit") touch "$GH_STATE/releases/$3" ;;
esac
"""


def sh(cmd, cwd, env=None, check=True):
    return subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, check=check)


def git(cwd, *args):
    return sh(["git", "-c", "user.email=t@t", "-c", "user.name=t", *args], cwd).stdout.strip()


class Repo:
    """A bare 'origin' and a clone of it, with one commit on main that has release notes."""

    def __init__(self, notes="What is new\n"):
        self.tmp = tempfile.mkdtemp()
        self.origin = os.path.join(self.tmp, "origin.git")
        self.clone = os.path.join(self.tmp, "clone")
        sh(["git", "init", "--bare", "-b", "main", self.origin], self.tmp)
        sh(["git", "clone", self.origin, self.clone], self.tmp)
        git(self.clone, "checkout", "-b", "main")
        if notes is not None:
            with open(os.path.join(self.clone, "RELEASE_NOTES.md"), "w") as fh:
                fh.write(notes)
        with open(os.path.join(self.clone, "a.txt"), "w") as fh:
            fh.write("a")
        git(self.clone, "add", "-A")
        git(self.clone, "commit", "-m", "first")
        git(self.clone, "push", "origin", "main")
        self.main = git(self.clone, "rev-parse", "HEAD")

    def commit(self, name):
        with open(os.path.join(self.clone, name), "w") as fh:
            fh.write(name)
        git(self.clone, "add", "-A")
        git(self.clone, "commit", "-m", name)
        return git(self.clone, "rev-parse", "HEAD")

    def cleanup(self):
        shutil.rmtree(self.tmp, ignore_errors=True)


class CheckProdRefTest(unittest.TestCase):
    def setUp(self):
        self.repo = Repo()
        self.addCleanup(self.repo.cleanup)

    def check(self, sha, version):
        return sh(["bash", CHECK, sha, version], self.repo.clone, check=False)

    def test_commit_on_main_with_notes_passes(self):
        r = self.check(self.repo.main, "1.3")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_invalid_versions_fail(self):
        for version in ("", "1", "v1.2", "1.2.3.4", "1.x"):
            with self.subTest(version=version):
                self.assertEqual(self.check(self.repo.main, version).returncode, 1)

    def test_commit_not_on_main_fails(self):
        git(self.repo.clone, "checkout", "-b", "feature/x")
        sha = self.repo.commit("b.txt")
        git(self.repo.clone, "push", "origin", "feature/x")
        git(self.repo.clone, "fetch", "origin")
        r = self.check(sha, "1.3")
        self.assertEqual(r.returncode, 1)
        self.assertIn("not reachable from main", r.stderr)

    def test_missing_or_empty_notes_fail(self):
        for notes in (None, "  \n"):
            with self.subTest(notes=notes):
                repo = Repo(notes=notes)
                self.addCleanup(repo.cleanup)
                r = sh(["bash", CHECK, repo.main, "1.3"], repo.clone, check=False)
                self.assertEqual(r.returncode, 1)
                self.assertIn("RELEASE_NOTES.md", r.stderr)

    def test_release_branch_at_another_commit_fails(self):
        other = self.repo.commit("b.txt")
        git(self.repo.clone, "push", "origin", "main")
        git(self.repo.clone, "push", "origin", f"{self.repo.main}:refs/heads/release/1.3")
        r = self.check(other, "1.3")
        self.assertEqual(r.returncode, 1)
        self.assertIn("release/1.3 already exists", r.stderr)

    def test_release_branch_at_the_same_commit_passes(self):
        git(self.repo.clone, "push", "origin", f"{self.repo.main}:refs/heads/release/1.3")
        self.assertEqual(self.check(self.repo.main, "1.3").returncode, 0)

    def test_tag_at_another_commit_fails(self):
        other = self.repo.commit("b.txt")
        git(self.repo.clone, "push", "origin", "main")
        git(self.repo.clone, "tag", "v1.3", self.repo.main)
        git(self.repo.clone, "push", "origin", "v1.3")
        r = self.check(other, "1.3")
        self.assertEqual(r.returncode, 1)
        self.assertIn("v1.3 already exists", r.stderr)


class CutReleaseTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.state = os.path.join(self.tmp, "state")
        gh = os.path.join(self.tmp, "gh")
        with open(gh, "w") as fh:
            fh.write(GH_STUB)
        os.chmod(gh, os.stat(gh).st_mode | stat.S_IEXEC)
        self.work = os.path.join(self.tmp, "work")
        os.mkdir(self.work)
        with open(os.path.join(self.work, "RELEASE_NOTES.md"), "w") as fh:
            fh.write("notes\n")
        self.env = {**os.environ, "GH": gh, "GH_STATE": self.state, "GITHUB_REPOSITORY": "o/r"}

    def cut(self, sha, version):
        return sh(["bash", CUT, sha, version], self.work, env=self.env, check=False)

    def calls(self):
        path = os.path.join(self.state, "calls")
        if not os.path.exists(path):
            return []
        with open(path) as fh:
            return fh.read().splitlines()

    def ref(self, name):
        path = os.path.join(self.state, "refs", name)
        if not os.path.exists(path):
            return None
        with open(path) as fh:
            return fh.read().strip()

    def test_fresh_cut_creates_branch_and_release(self):
        r = self.cut("a" * 40, "1.3")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.ref("heads_release_1.3"), "a" * 40)
        self.assertTrue(os.path.exists(os.path.join(self.state, "releases", "v1.3")))
        self.assertTrue(any(c.startswith("release create v1.3") and "--latest" in c for c in self.calls()))

    def test_rerun_for_the_same_commit_updates_only(self):
        self.assertEqual(self.cut("a" * 40, "1.3").returncode, 0)
        before = len([c for c in self.calls() if "git/refs" in c and "-f" in c])
        r = self.cut("a" * 40, "1.3")
        self.assertEqual(r.returncode, 0, r.stderr)
        after = len([c for c in self.calls() if "git/refs" in c and "-f" in c])
        self.assertEqual(before, after, "the branch must not be created twice")
        self.assertTrue(any(c.startswith("release edit v1.3") for c in self.calls()))

    def test_branch_at_another_commit_changes_nothing(self):
        self.assertEqual(self.cut("a" * 40, "1.3").returncode, 0)
        calls_before = list(self.calls())
        r = self.cut("b" * 40, "1.3")
        self.assertEqual(r.returncode, 1)
        self.assertIn("already points at", r.stderr)
        new = [c for c in self.calls()[len(calls_before):] if not c.startswith("api repos/o/r/git/ref/") ]
        self.assertEqual(new, [], f"unexpected writes: {new}")

    def test_missing_notes_fails(self):
        os.remove(os.path.join(self.work, "RELEASE_NOTES.md"))
        self.assertEqual(self.cut("a" * 40, "1.3").returncode, 1)

    def test_bad_version_fails(self):
        self.assertEqual(self.cut("a" * 40, "x.y").returncode, 1)


if __name__ == "__main__":
    unittest.main()
