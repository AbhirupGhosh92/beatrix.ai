#!/usr/bin/env python3
"""Claude Code PreToolUse hook: enforce branch names on Bash commands.

Allowed branch names (same pattern as .github/workflows/branch-name.yml and
.github/workflows/create-branch.yml):

    feature|bug|spike|hotfix / <issue-id>-<lowercase-hyphenated-summary>
    release / <major>.<minor>[.<patch>]

Blocks (exit code 2, message on stderr) any Bash command that would create or
push a branch with another name: git checkout -b/-B, git switch -c/-C,
git branch <name>, git worktree add -b, git push, and gh api calls that create
refs/heads/<name>. Deleting branches is always allowed, and pushing the
long-lived main/develop branches is allowed.

A name built from shell variables or substitutions (for example "$branch")
cannot be checked here and is allowed; the repository ruleset and the PR
check still enforce it.
"""
import json
import re
import shlex
import subprocess
import sys

PATTERN = re.compile(
    r"^((feature|bug|spike|hotfix)/[0-9]+-[a-z0-9]+(-[a-z0-9]+)*"
    r"|release/[0-9]+\.[0-9]+(\.[0-9]+)?)$"
)
LONG_LIVED = {"main", "develop"}
OPERATORS = {";", "&&", "||", "|", "&", "(", ")", "\n"}
# git global options that consume a following argument
GIT_GLOBAL_WITH_ARG = {"-C", "-c", "--git-dir", "--work-tree", "--namespace"}
# git push options that consume a following argument
PUSH_WITH_ARG = {"-o", "--push-option", "--repo", "--receive-pack", "--exec"}


def split_commands(command):
    """Split a shell command line into per-command token lists."""
    commands = []
    for line in command.splitlines():
        lexer = shlex.shlex(line, posix=True, punctuation_chars=True)
        lexer.whitespace_split = True
        current = []
        for tok in lexer:
            if tok in OPERATORS:
                if current:
                    commands.append(current)
                current = []
            else:
                current.append(tok)
        if current:
            commands.append(current)
    return commands


def is_dynamic(name):
    return any(ch in name for ch in "$`*?[{")


def current_branch(cwd):
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=cwd or None, capture_output=True, text=True, timeout=5,
        )
        name = out.stdout.strip()
        return name if out.returncode == 0 and name and name != "HEAD" else None
    except Exception:
        return None


def clean(name):
    name = name.lstrip("+")
    for prefix in ("refs/heads/",):
        if name.startswith(prefix):
            name = name[len(prefix):]
    return name


def git_names(tokens, cwd):
    """Return branch names a git command would create or push."""
    i = 0
    while i < len(tokens) and tokens[i].startswith(("-",)) is False and "=" in tokens[i]:
        i += 1  # leading VAR=value assignments
    if i >= len(tokens) or tokens[i] != "git":
        return []
    i += 1
    while i < len(tokens) and tokens[i].startswith("-"):
        i += 2 if tokens[i] in GIT_GLOBAL_WITH_ARG else 1
    if i >= len(tokens):
        return []
    sub, args = tokens[i], tokens[i + 1:]

    if sub in ("checkout", "switch"):
        names = []
        for j, a in enumerate(args):
            if a in ("-b", "-B", "-c", "-C", "--orphan", "--create", "--force-create") and j + 1 < len(args):
                names.append(args[j + 1])
        return names

    if sub == "worktree":
        if args[:1] == ["add"]:
            return [args[j + 1] for j, a in enumerate(args) if a in ("-b", "-B") and j + 1 < len(args)]
        return []

    if sub == "branch":
        flags = {a for a in args if a.startswith("-")}
        if flags & {"-d", "-D", "--delete", "-l", "--list", "-a", "--all", "-r", "--remotes",
                    "--show-current", "-v", "-vv", "--contains", "--merged", "--no-merged",
                    "-u", "--set-upstream-to", "--unset-upstream", "--edit-description"}:
            return []
        positional = [a for a in args if not a.startswith("-")]
        if flags & {"-m", "-M", "--move", "-c", "-C", "--copy"}:
            return positional[-1:]
        return positional[:1]

    if sub == "push":
        if {"--delete", "-d", "--tags", "--mirror"} & set(args):
            return []
        positional, skip = [], False
        for a in args:
            if skip:
                skip = False
            elif a in PUSH_WITH_ARG:
                skip = True
            elif not a.startswith("-"):
                positional.append(a)
        refspecs = positional[1:]
        if not refspecs:
            branch = current_branch(cwd)
            return [branch] if branch else []
        names = []
        for spec in refspecs:
            src, _, dst = spec.partition(":")
            if ":" in spec and not src:
                continue  # ":branch" deletes a remote branch
            target = clean(dst if ":" in spec else src)
            if target == "HEAD" or (":" not in spec and clean(src) == "HEAD"):
                branch = current_branch(cwd)
                if branch:
                    names.append(branch)
            elif not target.startswith("refs/") and target not in ("", "HEAD"):
                names.append(target)
        return names

    return []


def gh_names(tokens):
    """Return branch names created through `gh api .../git/refs`."""
    if "gh" not in tokens or "api" not in tokens:
        return []
    if not any(t.endswith("git/refs") or "/git/refs" in t for t in tokens):
        return []
    names = []
    for j, tok in enumerate(tokens):
        for candidate in (tok, tokens[j + 1] if tok in ("-f", "-F", "--field", "--raw-field") and j + 1 < len(tokens) else ""):
            m = re.match(r"^ref=refs/heads/(.+)$", candidate)
            if m:
                names.append(m.group(1))
    return names


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0  # not a payload we understand; do not block
    if payload.get("tool_name") != "Bash":
        return 0
    command = (payload.get("tool_input") or {}).get("command") or ""
    cwd = payload.get("cwd")
    try:
        commands = split_commands(command)
    except ValueError:
        return 0  # unbalanced quotes etc.; cannot analyse, do not block

    bad = []
    for tokens in commands:
        for name in git_names(tokens, cwd) + gh_names(tokens):
            name = clean(name)
            if not name or is_dynamic(name) or name in LONG_LIVED:
                continue
            if not PATTERN.match(name):
                bad.append(name)

    if bad:
        print(
            "Blocked: invalid branch name " + ", ".join(f"'{b}'" for b in bad) + ".\n"
            "Branches must be <feature|bug|spike|hotfix>/<issue-id>-<summary> "
            "(lowercase, hyphenated, e.g. feature/1234-add-login) or "
            "release/<major.minor[.patch]> (e.g. release/2.1.0).\n"
            "Create the GitHub issue first if there is no issue ID, then use its number.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
