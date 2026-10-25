#!/usr/bin/env python3
"""Check the question files in data/ for mistakes before deploying.

Usage:  python3 scripts/validate.py
Exit code 0 = all good, 1 = problems found (listed on stdout).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

GENERATORS = {
    "multiplication": {"tables", "multipliers", "format", "adaptive"},
    "evaluate": {"coefficient", "constant", "value"},
    "one-step": {"range", "negatives"},
    "two-step": {"coefficient", "constant", "solution"},
    "distributive": {"coefficient", "constant", "solution"},
    "both-sides": {"coefficient", "constant", "solution"},
    "mix": {"generators"},
}
RANGE_KEYS = {"multipliers", "coefficient", "constant", "value", "range", "solution"}

problems = []


def err(path, msg):
    problems.append(f"{path}: {msg}")


def check_range(where, key, val):
    if not (isinstance(val, list) and len(val) == 2 and all(isinstance(v, int) for v in val)):
        err(where, f'"{key}" must be [low, high] with whole numbers')
    elif val[0] > val[1]:
        err(where, f'"{key}" has low > high')


def check_generator(where, g):
    if not isinstance(g, dict) or "type" not in g:
        err(where, 'generator must be an object with a "type"')
        return
    t = g["type"]
    if t not in GENERATORS:
        err(where, f'unknown generator type "{t}" (known: {", ".join(sorted(GENERATORS))})')
        return
    for k in g:
        if k != "type" and k not in GENERATORS[t]:
            err(where, f'generator "{t}" does not use option "{k}"')
        if k in RANGE_KEYS:
            check_range(where, k, g[k])
    if t == "multiplication" and "tables" in g:
        if not (isinstance(g["tables"], list) and g["tables"] and all(isinstance(v, int) for v in g["tables"])):
            err(where, '"tables" must be a non-empty list of whole numbers')
    if t == "multiplication" and g.get("format") not in (None, "product", "missing-factor"):
        err(where, '"format" must be "product" or "missing-factor"')
    if t == "mix":
        subs = g.get("generators")
        if not (isinstance(subs, list) and subs):
            err(where, 'mix needs a non-empty "generators" list')
        else:
            for i, s in enumerate(subs):
                check_generator(f"{where} > generators[{i}]", s)


def check_question(where, q):
    if not isinstance(q, dict):
        err(where, "question must be an object")
        return
    if "q" not in q or "a" not in q:
        err(where, 'question needs both "q" and "a"')
    if "accept" in q and not isinstance(q["accept"], list):
        err(where, '"accept" must be a list')
    for k in q:
        if k not in {"q", "a", "accept", "hint", "explain"}:
            err(where, f'unknown question field "{k}"')


def check_file(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(path.name, f"invalid JSON at line {e.lineno}, column {e.colno}: {e.msg}")
        return
    if not isinstance(data, dict) or not isinstance(data.get("levels"), list):
        err(path.name, 'top level must be an object with a "levels" list')
        return
    if not data.get("subject"):
        err(path.name, 'missing "subject"')
    ids = set()
    for i, lvl in enumerate(data["levels"]):
        where = f"{path.name} level[{i}]"
        if not isinstance(lvl, dict):
            err(where, "level must be an object")
            continue
        lid = lvl.get("id")
        where = f'{path.name} "{lid or i}"'
        if not lid or not lvl.get("name"):
            err(where, 'level needs "id" and "name"')
        if lid in ids:
            err(where, f'duplicate level id "{lid}"')
        ids.add(lid)
        if "count" in lvl and not (isinstance(lvl["count"], int) and lvl["count"] > 0):
            err(where, '"count" must be a positive whole number')
        has_gen = "generator" in lvl
        qs = lvl.get("questions")
        if not has_gen and not qs:
            err(where, 'level needs a "generator" or a non-empty "questions" list')
        if has_gen:
            check_generator(where, lvl["generator"])
        if qs is not None:
            if not isinstance(qs, list):
                err(where, '"questions" must be a list')
            else:
                for j, q in enumerate(qs):
                    check_question(f"{where} question[{j}]", q)


def main():
    files = sorted(DATA.glob("*.json"))
    if not files:
        print(f"No JSON files found in {DATA}")
        return 1
    for f in files:
        check_file(f)
    if problems:
        print(f"{len(problems)} problem(s):")
        for p in problems:
            print("  -", p)
        return 1
    print(f"OK: {len(files)} file(s) checked, no problems.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
