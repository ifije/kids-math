#!/usr/bin/env bash
# Validate the question files, commit everything, and push to GitHub.
# GitHub Pages picks the change up within about a minute.
#   scripts/deploy.sh                 -> commit message "Update questions"
#   scripts/deploy.sh "Add fractions" -> custom commit message
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/validate.py

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to deploy: working tree is clean."
  exit 0
fi

git add -A
git commit -m "${1:-Update questions}"
git push
echo
echo "Pushed. Live at: https://ifije.github.io/kids-math/  (allow ~1 minute, then refresh on the iPad)"
