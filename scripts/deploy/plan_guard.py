#!/usr/bin/env python3
"""Fail a deployment when a Terraform plan would destroy or replace stateful resources.

Reads the JSON of a saved plan (`terraform show -json tfplan`) and checks every resource
change. A resource of a protected type that would be deleted, or replaced (which deletes the
old one), blocks the run before any approval or apply happens. The only way past the guard is
the explicit `--allow-destructive` flag (the `allow_destructive` input of the Deploy workflow).

Usage:
  plan_guard.py plan.json [--allow-destructive] [--summary FILE] [--github-output FILE]

Exit codes: 0 = plan accepted, 1 = blocked, 2 = unreadable input.
"""

import argparse
import json
import sys

# Resources that hold data or identity. Removing or recreating one of these loses data or
# breaks every consumer, so the plan must never do it unless the operator asks for it.
PROTECTED_TYPES = frozenset(
    {
        "google_firestore_database",  # all Firestore data
        "google_firestore_document",  # e.g. allowed_emails/{email} admin entries
        "google_storage_bucket",  # CMS files
        "google_firebase_app_hosting_backend",  # the live site and its rollouts
        "google_firebase_project",
        "google_firebase_web_app",  # app id used by the web config
        "google_service_account",  # runtime identities (invoker allow-list)
        "google_iam_workload_identity_pool",  # CI login
        "google_iam_workload_identity_pool_provider",
        "google_firebaserules_release",  # live security rules
        "google_secret_manager_secret",  # model API key (its versions are set by hand)
    }
)


def classify(actions):
    """Map terraform's action list for one resource to a single label."""
    acts = list(actions)
    if acts == ["no-op"]:
        return "no-op"
    if acts == ["read"]:
        return "read"
    if "delete" in acts and "create" in acts:
        return "replace"
    if acts == ["delete"]:
        return "delete"
    if acts == ["create"]:
        return "create"
    if acts == ["update"]:
        return "update"
    # Unknown combination: treat anything containing delete as destructive.
    return "delete" if "delete" in acts else "update"


def analyse(plan):
    """Return (counts, changes, blocked) for a parsed plan."""
    counts = {"create": 0, "update": 0, "delete": 0, "replace": 0}
    changes = []
    blocked = []
    for rc in plan.get("resource_changes", []) or []:
        label = classify(rc.get("change", {}).get("actions", []))
        if label in counts:
            counts[label] += 1
        if label in ("no-op", "read"):
            continue
        entry = {"address": rc.get("address", "?"), "type": rc.get("type", "?"), "action": label}
        changes.append(entry)
        if label in ("delete", "replace") and entry["type"] in PROTECTED_TYPES:
            blocked.append(entry)
    return counts, changes, blocked


def render_summary(counts, changes, blocked, allow_destructive):
    lines = ["### Terraform plan guard", ""]
    lines.append(
        "| create | update | delete | replace |\n|---:|---:|---:|---:|\n"
        f"| {counts['create']} | {counts['update']} | {counts['delete']} | {counts['replace']} |"
    )
    lines.append("")
    if not changes:
        lines.append("No infrastructure changes: every resource is left exactly as it is.")
    else:
        lines.append("| Action | Resource | Protected |")
        lines.append("|---|---|:--:|")
        for c in sorted(changes, key=lambda c: (c["action"], c["address"])):
            protected = "yes" if c["type"] in PROTECTED_TYPES else ""
            lines.append(f"| {c['action']} | `{c['address']}` | {protected} |")
    lines.append("")
    if blocked and allow_destructive:
        lines.append(
            f"**WARNING:** {len(blocked)} protected resource(s) will be deleted or replaced. "
            "Allowed because `allow_destructive` was set."
        )
    elif blocked:
        lines.append(
            f"**BLOCKED:** {len(blocked)} protected resource(s) would be deleted or replaced. "
            "Nothing was applied. Fix the Terraform change, or re-run with `allow_destructive` "
            "only after reading the restore steps in docs/DEPLOYMENT.md."
        )
    else:
        lines.append("Guard passed: no protected resource is deleted or replaced.")
    lines.append("")
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("plan_json")
    parser.add_argument("--allow-destructive", action="store_true")
    parser.add_argument("--summary", help="append a markdown summary to this file")
    parser.add_argument("--github-output", help="append key=value outputs to this file")
    args = parser.parse_args(argv)

    try:
        with open(args.plan_json, encoding="utf-8") as fh:
            plan = json.load(fh)
    except (OSError, ValueError) as exc:
        print(f"plan_guard: cannot read plan JSON: {exc}", file=sys.stderr)
        return 2
    if not isinstance(plan, dict):
        print("plan_guard: plan JSON is not an object", file=sys.stderr)
        return 2

    counts, changes, blocked = analyse(plan)
    summary = render_summary(counts, changes, blocked, args.allow_destructive)
    print(summary)
    if args.summary:
        with open(args.summary, "a", encoding="utf-8") as fh:
            fh.write(summary + "\n")
    if args.github_output:
        with open(args.github_output, "a", encoding="utf-8") as fh:
            fh.write(f"changes={len(changes)}\n")
            fh.write(f"destructive={len(blocked)}\n")

    if blocked and not args.allow_destructive:
        for b in blocked:
            print(f"::error::Plan would {b['action']} protected resource {b['address']}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
