"""Tests for scripts/deploy-prod.sh: it must check the commit and version locally and start the prod
workflow with exactly the chosen commit, and it must never start anything it should refuse. A stub `gh`
records its calls. Run: python3 -m unittest discover -s scripts/deploy -p 'test_*.py'"""

import os
import shutil
import stat
import subprocess
import tempfile
import unittest

from test_prod_flow import Repo, git, sh

SCRIPT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "deploy-prod.sh"))

GH_STUB = """#!/usr/bin/env bash
echo "$*" >> "$GH_CALLS"
case "$1 $2" in
  "run list") echo "https://github.com/o/r/actions/runs/1" ;;
esac
exit 0
"""


class DeployProdScriptTest(unittest.TestCase):
    def setUp(self):
        self.repo = Repo()
        self.addCleanup(self.repo.cleanup)
        self.bin = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.bin, ignore_errors=True)
        gh = os.path.join(self.bin, "gh")
        with open(gh, "w") as fh:
            fh.write(GH_STUB)
        os.chmod(gh, os.stat(gh).st_mode | stat.S_IEXEC)
        self.calls = os.path.join(self.bin, "calls")
        self.env = {**os.environ, "PATH": f"{self.bin}:{os.environ['PATH']}", "GH_CALLS": self.calls, "RUN_LOOKUP_DELAY": "0"}

    def run_script(self, *args, stdin=""):
        return subprocess.run(["bash", SCRIPT, *args], cwd=self.repo.clone, env=self.env, input=stdin, capture_output=True, text=True)

    def gh_calls(self):
        if not os.path.exists(self.calls):
            return []
        with open(self.calls) as fh:
            return fh.read().splitlines()

    def started(self):
        return [c for c in self.gh_calls() if c.startswith("workflow run")]

    def test_starts_the_prod_workflow_with_the_chosen_commit_and_version(self):
        r = self.run_script("1.3", "--yes")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(
            self.started(),
            [f"workflow run deploy-prod.yml --ref main -f ref={self.repo.main} -f version=1.3 -f confirm=prod"],
        )
        self.assertNotIn("allow_destructive", " ".join(self.gh_calls()))
        self.assertNotIn("redeploy_all", " ".join(self.gh_calls()))

    def test_a_specific_commit_on_main_is_pinned(self):
        second = self.repo.commit("b.txt")
        git(self.repo.clone, "push", "origin", "main")
        r = self.run_script("1.3", "--ref", self.repo.main, "--yes")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn(f"-f ref={self.repo.main} ", self.started()[0] + " ")
        self.assertNotIn(second, self.started()[0])

    def test_typed_confirmation_is_required_without_yes(self):
        r = self.run_script("1.3", stdin="nope\n")
        self.assertEqual(r.returncode, 1)
        self.assertIn("not confirmed", r.stderr)
        self.assertEqual(self.started(), [])

    def test_typing_prod_confirms(self):
        r = self.run_script("1.3", stdin="prod\n")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(len(self.started()), 1)

    def test_no_stdin_does_not_start_anything(self):
        r = self.run_script("1.3")
        self.assertEqual(r.returncode, 1)
        self.assertEqual(self.started(), [])

    def test_refuses_without_or_with_a_bad_version(self):
        for args in ([], ["v1.3"], ["1"], ["1.3", "1.4"]):
            with self.subTest(args=args):
                r = self.run_script(*args, "--yes")
                self.assertEqual(r.returncode, 1)
        self.assertEqual(self.started(), [])

    def test_refuses_a_commit_that_is_not_on_main(self):
        git(self.repo.clone, "checkout", "-b", "feature/x")
        sha = self.repo.commit("b.txt")
        git(self.repo.clone, "push", "origin", "feature/x")
        r = self.run_script("1.3", "--ref", sha, "--yes")
        self.assertEqual(r.returncode, 1)
        self.assertIn("not reachable from main", r.stderr)
        self.assertEqual(self.started(), [])

    def test_refuses_a_version_already_cut_at_another_commit(self):
        other = self.repo.commit("b.txt")
        git(self.repo.clone, "push", "origin", "main")
        git(self.repo.clone, "push", "origin", f"{self.repo.main}:refs/heads/release/1.3")
        r = self.run_script("1.3", "--ref", other, "--yes")
        self.assertEqual(r.returncode, 1)
        self.assertEqual(self.started(), [])

    def test_refuses_when_release_notes_are_missing(self):
        repo = Repo(notes=None)
        self.addCleanup(repo.cleanup)
        r = subprocess.run(["bash", SCRIPT, "1.3", "--yes"], cwd=repo.clone, env=self.env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 1)
        self.assertEqual(self.started(), [])

    def test_unknown_option_is_refused(self):
        self.assertEqual(self.run_script("1.3", "--allow-destructive", "--yes").returncode, 1)
        self.assertEqual(self.started(), [])


if __name__ == "__main__":
    unittest.main()
