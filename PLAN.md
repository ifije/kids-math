# Kids Math — Plan

**Created:** 2026-10-24
**Goal:** A distraction-free math practice web page for two kids on iPads.
One child drills multiplication tables, the other practices algebra.
No ads, no accounts, no server, no build step.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Architecture | Single static page: `index.html` + `app.js` + `style.css` | Nothing to run or maintain. Works from any host. |
| Hosting | GitHub Pages, public repo `ifije/kids-math` | `git` and `gh` already installed; publish = commit + push. Free. Reachable from any network, which matters because the iPads are not on this computer's network. |
| Question data | JSON files in `data/`, one per subject | Human-editable. Add a level or a question by editing a file, no code changes. |
| Question source | Two kinds, mixable per level: **generators** (unlimited random questions from a spec) and **hand-written questions** (fixed list) | Multiplication and most algebra drills are best generated. Word problems and tricky cases are best hand-written. |
| Progress | `localStorage` on each iPad | Each kid has their own iPad, so progress is naturally separated. No backend needed. |
| Input | On-screen keypad | iPad keyboard covers half the screen. Keypad gives big tap targets. Physical/desktop keyboard also works. |
| Adaptive drill | Multiplication facts the child gets wrong are asked more often | Cheap to do with localStorage stats; big payoff for times tables. |

## Data format

### Subject file (`data/<subject>.json`)

```json
{
  "subject": "Multiplication",
  "icon": "×",
  "levels": [ ...level objects... ]
}
```

### Level object

```json
{
  "id": "m-7-8-9",
  "name": "7s, 8s and 9s",
  "description": "The hard ones",
  "count": 20,
  "generator": { "type": "multiplication", "tables": [7, 8, 9], "multipliers": [1, 12] },
  "questions": [ { "q": "7 × 8", "a": 56 } ]
}
```

- `count` — how many questions in one session.
- `generator` — optional. Produces random questions. Types are listed in `data/README.md`.
- `questions` — optional. Hand-written list. If both are present, hand-written questions are mixed in with generated ones.
- A level must have at least one of `generator` or `questions`.

### Hand-written question object

```json
{
  "q": "Solve for x:  3x + 4 = 19",
  "a": 5,
  "accept": ["x=5"],
  "hint": "Subtract 4 from both sides first.",
  "explain": "3x = 15, so x = 5."
}
```

- `q` — question text. Use `\n` for a line break.
- `a` — the answer. Number or string. Fractions like `"3/4"` and decimals are fine.
- `accept` — optional extra answers that count as correct.
- `hint` — optional, shown on request.
- `explain` — optional, shown after a wrong answer.

Answers are compared loosely: spaces removed, case ignored, a leading `x =` stripped,
and numeric answers compared as numbers (so `0.5` and `1/2` both match `"1/2"`).

## App flow

1. **Home** — pick a subject (two big cards).
2. **Levels** — pick a level within the subject. Shows last score per level.
3. **Quiz** — one question at a time, keypad, instant feedback, streak counter, timer.
4. **Results** — score, time, list of misses, "practice the misses" button.
5. **Progress** — recent sessions per subject; for multiplication a 12×12 accuracy grid so a parent can see weak facts at a glance. Reset button.

## Files

```
kids_math/
├── index.html            page shell
├── style.css             styles, light + dark
├── app.js                all logic (loading, generators, quiz, stats)
├── data/
│   ├── README.md         how to edit questions
│   ├── multiplication.json
│   └── algebra.json
├── manifest.webmanifest  "Add to Home Screen" on iPad
├── icon.svg / icon-180.png
├── scripts/
│   ├── serve.sh          local preview on this computer
│   ├── validate.py       check JSON files before pushing
│   ├── deploy.sh         validate + commit + push
│   └── clean.sh          remove stray intermediate files
├── PLAN.md  TODO.md  README.md
└── .nojekyll
```

## Routine maintenance

This project creates almost no intermediate files. `scripts/clean.sh` removes anything
stray (`__pycache__`, `*.bak`, `*~`, `.DS_Store`, editor swap files) and is safe to run
any time. Progress data lives only in each iPad's browser and is cleared from the
app's Progress screen. If GitHub Pages ever serves a stale version, a hard refresh on
the iPad (or waiting ~10 minutes for the CDN cache) fixes it.

## Out of scope for v1

- Parent dashboard across devices (needs a backend).
- Accounts or names in the app (public repo, keep it anonymous).
- Fractions/decimals drills, division. Easy to add later as new generator types.
