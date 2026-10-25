# Editing the questions

Everything the kids see comes from the JSON files in this folder. One file per subject.
Edit a file, run `scripts/deploy.sh`, and the change is live in about a minute.

Before pushing, `python3 scripts/validate.py` checks the files for mistakes
(`deploy.sh` runs it for you).

## File shape

```json
{
  "subject": "Algebra",
  "icon": "x",
  "color": "blue",
  "levels": [ ... ]
}
```

- `subject` — shown on the home card.
- `icon` — one or two characters for the card.
- `color` — `orange` or `blue` (add more in `style.css` under `.card .icon.<name>`).

## A level

```json
{
  "id": "a-two-step",
  "name": "Two-step equations",
  "description": "3x + 4 = 19",
  "count": 10,
  "generator": { "type": "two-step", "coefficient": [2, 9], "constant": [1, 15], "solution": [-9, 12] },
  "questions": [ ... ]
}
```

- `id` — unique, never change it once in use (progress is stored against it).
- `count` — questions per session.
- A level needs a `generator`, a `questions` list, or both. With both, up to half of
  the session is hand-written and the rest is generated.

## Hand-written question

```json
{ "q": "Three times a number is 51. What is the number?", "a": 17, "hint": "3x = 51", "explain": "51 ÷ 3 = 17" }
```

- `q` — the text. `\n` makes a new line. Single letters like `x` are shown in italics.
- `a` — the answer. A number, or a string like `"3/4"`.
- `accept` — optional list of other answers to accept, e.g. `["x=17"]`.
- `hint` — optional, shown when the Hint key is pressed.
- `explain` — optional, shown after a wrong answer.

Checking is forgiving: spaces and case are ignored, a leading `x =` is dropped,
and `0.5`, `1/2` and `2/4` all match each other.

## Generator types

All ranges are `[low, high]`, inclusive.

| type | options | produces |
|---|---|---|
| `multiplication` | `tables` (list), `multipliers` [lo,hi], `format` (`"product"` or `"missing-factor"`), `adaptive` (true/false) | `7 × 8` or `7 × ? = 56`. With `adaptive`, facts the child has got wrong before come up more often. |
| `evaluate` | `coefficient`, `constant`, `value` | "Evaluate 3x − 4 when x = 5" |
| `one-step` | `range`, `negatives` (true/false) | `x + 7 = 12`, `x − 5 = 3`, `4x = 28`, `x/3 = 6` |
| `two-step` | `coefficient`, `constant`, `solution` | `3x + 4 = 19` |
| `distributive` | `coefficient`, `constant`, `solution` | `2(x + 3) = 14` |
| `both-sides` | `coefficient`, `constant`, `solution` | `5x + 2 = 2x + 14` |
| `mix` | `generators` (a list of generator objects) | one of the listed generators, chosen at random each question |

All algebra generators produce whole-number answers.

## Adding a new generator type

Add a function to the `GEN` object near the top of `app.js`. It receives the
generator object from the JSON and must return `{ q, a, key }` plus optional
`hint` and `explain`. `key` is a short label used for statistics. Then add a row to
the table above.
