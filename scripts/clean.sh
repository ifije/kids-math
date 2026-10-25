#!/usr/bin/env bash
# Remove stray intermediate files. Safe to run any time.
# The app itself writes nothing to disk; this just tidies editor/OS leftovers.
set -euo pipefail
cd "$(dirname "$0")/.."

find . -path ./.git -prune -o \( \
     -name '__pycache__' -o -name '*.pyc' -o -name '*.bak' -o -name '*~' \
  -o -name '*.swp' -o -name '*.swo' -o -name '.DS_Store' -o -name 'Thumbs.db' \
  -o -name '*.orig' -o -name '*.rej' -o -name '*.tmp' \) -print -exec rm -rf {} + 2>/dev/null || true

echo "Clean."
