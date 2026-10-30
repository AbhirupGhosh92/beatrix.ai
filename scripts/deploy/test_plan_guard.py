"""Tests for plan_guard.py. Run: python3 -m unittest discover -s scripts/deploy -p 'test_*.py'"""

import json
import os
import tempfile
import unittest

import plan_guard


def plan(*changes):
    return {
        "resource_changes": [
            {"address": f"{t}.{n}", "type": t, "change": {"actions": a}} for t, n, a in changes
        ]
    }


def run_guard(plan_dict, *extra):
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "plan.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(plan_dict, fh)
        return plan_guard.main([path, *extra])


class ClassifyTest(unittest.TestCase):
    def test_labels(self):
        self.assertEqual(plan_guard.classify(["no-op"]), "no-op")
        self.assertEqual(plan_guard.classify(["create"]), "create")
        self.assertEqual(plan_guard.classify(["update"]), "update")
        self.assertEqual(plan_guard.classify(["delete"]), "delete")
        self.assertEqual(plan_guard.classify(["delete", "create"]), "replace")
        self.assertEqual(plan_guard.classify(["create", "delete"]), "replace")
        self.assertEqual(plan_guard.classify(["read"]), "read")


class GuardTest(unittest.TestCase):
    def test_empty_plan_passes(self):
        self.assertEqual(run_guard({}), 0)
        self.assertEqual(run_guard({"resource_changes": []}), 0)

    def test_noop_and_in_place_updates_pass(self):
        p = plan(
            ("google_firestore_database", "default", ["no-op"]),
            ("google_firestore_database", "other", ["update"]),
            ("google_storage_bucket", "cms_storage", ["update"]),
            ("google_firestore_document", "allowed_admin", ["create"]),
        )
        self.assertEqual(run_guard(p), 0)

    def test_deleting_protected_resource_is_blocked(self):
        for rtype in sorted(plan_guard.PROTECTED_TYPES):
            with self.subTest(rtype=rtype):
                self.assertEqual(run_guard(plan((rtype, "x", ["delete"]))), 1)

    def test_replacing_protected_resource_is_blocked(self):
        p = plan(("google_storage_bucket", "cms_storage", ["delete", "create"]))
        self.assertEqual(run_guard(p), 1)
        p = plan(("google_firestore_database", "default", ["create", "delete"]))
        self.assertEqual(run_guard(p), 1)

    def test_resumes_bucket_cannot_be_deleted_or_replaced(self):
        # User resumes are personal data: the bucket is a protected google_storage_bucket.
        self.assertEqual(run_guard(plan(("google_storage_bucket", "resumes_storage", ["delete"]))), 1)
        self.assertEqual(run_guard(plan(("google_storage_bucket", "resumes_storage", ["delete", "create"]))), 1)
        self.assertEqual(run_guard(plan(("google_storage_bucket", "resumes_storage", ["update"]))), 0)

    def test_deleting_unprotected_resource_passes(self):
        p = plan(
            ("google_project_iam_member", "deployer", ["delete"]),
            ("google_firebaserules_ruleset", "firestore", ["delete", "create"]),
        )
        self.assertEqual(run_guard(p), 0)

    def test_allow_destructive_lets_it_through(self):
        p = plan(("google_firestore_database", "default", ["delete"]))
        self.assertEqual(run_guard(p, "--allow-destructive"), 0)

    def test_unreadable_input_is_an_error(self):
        self.assertEqual(plan_guard.main(["/nonexistent/plan.json"]), 2)
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "plan.json")
            with open(path, "w", encoding="utf-8") as fh:
                fh.write("not json")
            self.assertEqual(plan_guard.main([path]), 2)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write("[1, 2]")
            self.assertEqual(plan_guard.main([path]), 2)

    def test_summary_and_outputs_are_written(self):
        p = plan(
            ("google_firestore_database", "default", ["delete"]),
            ("google_project_iam_member", "x", ["update"]),
        )
        with tempfile.TemporaryDirectory() as tmp:
            plan_path = os.path.join(tmp, "plan.json")
            summary = os.path.join(tmp, "summary.md")
            out = os.path.join(tmp, "out.txt")
            with open(plan_path, "w", encoding="utf-8") as fh:
                json.dump(p, fh)
            code = plan_guard.main([plan_path, "--summary", summary, "--github-output", out])
            self.assertEqual(code, 1)
            with open(summary, encoding="utf-8") as fh:
                self.assertIn("BLOCKED", fh.read())
            with open(out, encoding="utf-8") as fh:
                text = fh.read()
            self.assertIn("changes=2", text)
            self.assertIn("destructive=1", text)


if __name__ == "__main__":
    unittest.main()
