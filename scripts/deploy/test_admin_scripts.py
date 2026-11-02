"""Tests for scripts/add-admin.sh and scripts/deploy/check-data.sh, with a stub `curl` so nothing reaches
Firestore. Run: python3 -m unittest discover -s scripts/deploy -p 'test_*.py'"""

import json
import os
import shutil
import stat
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ADD = os.path.abspath(os.path.join(HERE, "..", "add-admin.sh"))
CHECK = os.path.join(HERE, "check-data.sh")

CURL_STUB = r"""#!/usr/bin/env bash
# Records its arguments; answers with $STUB_STATUS and writes $STUB_BODY to the -o file.
echo "$*" >> "$CURL_LOG"
out=""
while [[ $# -gt 0 ]]; do
  case "$1" in -o) out="$2"; shift 2 ;; *) shift ;; esac
done
[[ -n "$out" ]] && printf '%s' "${STUB_BODY:-{\}}" > "$out"
printf '%s' "${STUB_STATUS:-200}"
"""


class ScriptTest(unittest.TestCase):
    def setUp(self):
        self.bin = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.bin, ignore_errors=True)
        curl = os.path.join(self.bin, "curl")
        with open(curl, "w") as fh:
            fh.write(CURL_STUB)
        os.chmod(curl, os.stat(curl).st_mode | stat.S_IEXEC)
        self.log = os.path.join(self.bin, "curl.log")
        self.env = {
            **os.environ,
            "PATH": f"{self.bin}:{os.environ['PATH']}",
            "CURL_LOG": self.log,
            "FIRESTORE_TOKEN": "test-token",
            "FIRESTORE_BASE": "http://stub",
        }
        self.env.pop("GITHUB_ACTIONS", None)

    def run_script(self, script, *args, **extra):
        return subprocess.run(["bash", script, *args], env={**self.env, **extra}, capture_output=True, text=True)

    def calls(self):
        if not os.path.exists(self.log):
            return []
        with open(self.log) as fh:
            return fh.read().splitlines()


class AddAdminTest(ScriptTest):
    def test_sets_only_the_admin_fields_with_an_update_mask(self):
        r = self.run_script(ADD, "dev", "You@Example.com ")
        self.assertEqual(r.returncode, 0, r.stderr)
        (call,) = self.calls()
        self.assertIn("-X PATCH", call)
        self.assertIn("projects/beatrix-ai-dev/databases/(default)/documents/allowed_emails/you%40example.com", call)
        for field in ("admin", "allowed", "role"):
            self.assertIn(f"updateMask.fieldPaths={field}", call)
        self.assertNotIn("lastLoginAt", call)
        body = call.split("-d ")[1].split(" http")[0]
        fields = json.loads(body)["fields"]
        self.assertEqual(fields["admin"], {"booleanValue": True})
        self.assertEqual(fields["allowed"], {"booleanValue": True})
        self.assertEqual(fields["role"], {"stringValue": "admin"})

    def test_prod_uses_the_prod_project(self):
        self.assertEqual(self.run_script(ADD, "prod", "a@example.com").returncode, 0)
        self.assertIn("projects/asterion-453905/", self.calls()[0])

    def test_a_project_id_is_accepted(self):
        self.assertEqual(self.run_script(ADD, "some-project-1", "a@example.com").returncode, 0)
        self.assertIn("projects/some-project-1/", self.calls()[0])

    def test_bad_input_sends_nothing(self):
        for args in ((), ("dev",), ("dev", "not-an-email"), ("dev", "a/b@example.com"), ("Prod!", "a@example.com")):
            with self.subTest(args=args):
                self.assertEqual(self.run_script(ADD, *args).returncode, 1)
        self.assertEqual(self.calls(), [])

    def test_a_firestore_error_fails_with_the_status(self):
        r = self.run_script(ADD, "dev", "a@example.com", STUB_STATUS="403")
        self.assertEqual(r.returncode, 1)
        self.assertIn("HTTP 403", r.stderr)

    def test_no_token_fails_without_calling_firestore(self):
        env = {k: v for k, v in self.env.items() if k != "FIRESTORE_TOKEN"}
        env["PATH"] = f"{self.bin}:/usr/bin:/bin"  # no gcloud
        r = subprocess.run(["bash", ADD, "dev", "a@example.com"], env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 1)
        self.assertEqual(self.calls(), [])


class CheckDataTest(ScriptTest):
    def test_empty_collection_warns_with_the_command_and_still_exits_zero(self):
        r = self.run_script(CHECK, "beatrix-ai-dev", "dev", STUB_BODY="{}")
        self.assertEqual(r.returncode, 0)
        self.assertIn("No admin user exists on dev", r.stderr)
        self.assertIn("./scripts/add-admin.sh dev you@example.com", r.stderr)

    def test_existing_admin_is_silent(self):
        r = self.run_script(CHECK, "beatrix-ai-dev", "dev", STUB_BODY='{"documents":[{"name":"x"}]}')
        self.assertEqual(r.returncode, 0)
        self.assertNotIn("No admin user", r.stderr)
        self.assertIn("nothing to fill in", r.stderr)

    def test_in_actions_it_annotates_and_writes_the_summary(self):
        summary = os.path.join(self.bin, "summary.md")
        r = self.run_script(CHECK, "asterion-453905", "prod", STUB_BODY="{}", GITHUB_ACTIONS="true", GITHUB_STEP_SUMMARY=summary)
        self.assertEqual(r.returncode, 0)
        self.assertIn("::warning title=Data to fill::", r.stderr + r.stdout)
        with open(summary) as fh:
            self.assertIn("add-admin.sh prod", fh.read())

    def test_an_unreadable_collection_never_fails_the_run(self):
        r = self.run_script(CHECK, "beatrix-ai-dev", "dev", STUB_STATUS="403")
        self.assertEqual(r.returncode, 0)
        self.assertIn("skipped", r.stderr)

    def test_no_token_is_skipped_quietly(self):
        env = {k: v for k, v in self.env.items() if k != "FIRESTORE_TOKEN"}
        env["PATH"] = f"{self.bin}:/usr/bin:/bin"
        r = subprocess.run(["bash", CHECK, "beatrix-ai-dev", "dev"], env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0)
        self.assertEqual(self.calls(), [])


if __name__ == "__main__":
    unittest.main()
