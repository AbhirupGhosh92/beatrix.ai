"""Tests for email-vars.sh. Run: python3 -m unittest discover -s scripts/deploy -p 'test_*.py'"""

import os
import subprocess
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "email-vars.sh")


def run(admin=None, dev=None):
    env = {k: v for k, v in os.environ.items() if k not in ("ADMIN_EMAILS", "DEVELOPER_MEMBERS")}
    if admin is not None:
        env["ADMIN_EMAILS"] = admin
    if dev is not None:
        env["DEVELOPER_MEMBERS"] = dev
    return subprocess.run(["bash", SCRIPT], env=env, capture_output=True, text=True)


class EmailVarsTest(unittest.TestCase):
    def test_unset_prints_nothing_and_succeeds(self):
        r = run()
        self.assertEqual((r.returncode, r.stdout), (0, ""))
        self.assertIn("committed tfvars", r.stderr)

    def test_empty_or_blank_is_treated_as_unset(self):
        for value in ("", "   "):
            with self.subTest(value=value):
                r = run(admin=value)
                self.assertEqual((r.returncode, r.stdout), (0, ""))

    def test_values_become_var_arguments_one_per_line(self):
        r = run(admin='["a@example.com", "b@example.com"]', dev='["user:a@example.com"]')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(
            r.stdout.splitlines(),
            ["-var", 'allowed_admin_emails=["a@example.com", "b@example.com"]', "-var", 'developer_members=["user:a@example.com"]'],
        )

    def test_only_one_set_is_fine(self):
        r = run(admin='["a@example.com"]')
        self.assertEqual(r.stdout.splitlines(), ["-var", 'allowed_admin_emails=["a@example.com"]'])

    def test_empty_list_is_allowed(self):
        self.assertEqual(run(admin="[]").stdout.splitlines()[1], "allowed_admin_emails=[]")

    def test_emails_are_never_logged(self):
        r = run(admin='["secret@example.com"]')
        self.assertNotIn("secret@example.com", r.stderr)
        self.assertIn("1 entries", r.stderr)

    def test_invalid_values_stop_the_run(self):
        bad = [
            "a@example.com",  # not a list
            '["a@example.com"',  # unclosed
            '[a@example.com]',  # unquoted
            '["${file(\\"/etc/passwd\\")}"]',  # interpolation
            '["%{ if true }x%{ endif }"]',  # directive
            '["a@example.com"]\n["b@example.com"]',  # two lines
            '["a\\"b"]',  # escape
        ]
        for value in bad:
            with self.subTest(value=value):
                r = run(admin=value)
                self.assertEqual(r.returncode, 1, r.stderr)
                self.assertEqual(r.stdout, "")


if __name__ == "__main__":
    unittest.main()
