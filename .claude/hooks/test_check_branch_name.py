"""Tests for check-branch-name.py. Run: python3 -I -m unittest discover -s .claude/hooks -p 'test_*.py'"""
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location(
    "check_branch_name", pathlib.Path(__file__).with_name("check-branch-name.py")
)
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)


def bad_names(command, cwd=None):
    names = []
    for tokens in hook.split_commands(command):
        for name in hook.git_names(tokens, cwd) + hook.gh_names(tokens):
            name = hook.clean(name)
            if name and not hook.is_dynamic(name) and name not in hook.LONG_LIVED and not hook.PATTERN.match(name):
                names.append(name)
    return names


class RedirectionTests(unittest.TestCase):
    def test_push_with_stderr_to_stdout_is_allowed(self):
        self.assertEqual(bad_names("git push -u origin feature/79-x 2>&1 | tail -5"), [])

    def test_push_with_other_redirections_is_allowed(self):
        for cmd in (
            "git push origin feature/79-x > /tmp/out",
            "git push origin feature/79-x >> log 2>&1",
            "git push origin feature/79-x 2>/dev/null",
            "git push origin feature/79-x &> out.txt",
            "git push origin feature/79-x >&2",
        ):
            self.assertEqual(bad_names(cmd), [], cmd)

    def test_switch_with_redirection_is_allowed(self):
        self.assertEqual(bad_names("git switch -c feature/79-x main 2>&1"), [])

    def test_invalid_names_are_still_blocked(self):
        self.assertEqual(bad_names("git push origin Bad_Name 2>&1"), ["Bad_Name"])
        self.assertEqual(bad_names("git switch -c wip 2>&1 | tail"), ["wip"])
        self.assertEqual(bad_names("git checkout -b fix-it"), ["fix-it"])


if __name__ == "__main__":
    unittest.main()
