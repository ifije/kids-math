# Kids Math

A small, ad-free math practice page for iPads. Multiplication tables and algebra.
One static page, no accounts, no server. Hosted on GitHub Pages.

**Live:** https://ifije.github.io/kids-math/

## On the iPad

Open the link in Safari, tap Share, then **Add to Home Screen**. It then opens
full-screen like an app. Progress is saved on that iPad only.

## Editing questions

All questions live in `data/*.json`. See [data/README.md](data/README.md) for the format.
Then:

```
scripts/deploy.sh "what you changed"
```

That validates the JSON, commits, and pushes. The site updates in about a minute.

## Preview on this computer

```
scripts/serve.sh
```

then open http://localhost:8000/ . Opening `index.html` directly from disk will not
work, because browsers block the page from reading the JSON files over `file://`.

## Files

| File | What |
|---|---|
| `index.html`, `style.css`, `app.js` | The whole app |
| `data/multiplication.json`, `data/algebra.json` | The questions |
| `scripts/validate.py` | Checks the JSON for mistakes |
| `scripts/deploy.sh` | Validate + commit + push |
| `scripts/serve.sh` | Local preview |
| `scripts/clean.sh` | Remove stray temp files |
| `PLAN.md`, `TODO.md` | Design notes and task list |

## Maintenance

Nothing runs in the background and nothing accumulates on disk. `scripts/clean.sh`
removes editor and OS leftovers if any appear. Progress on an iPad is cleared from the
app's Progress screen.
