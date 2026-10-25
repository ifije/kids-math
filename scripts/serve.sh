#!/usr/bin/env bash
# Preview the site on this computer. Opening index.html straight from disk
# will not work because the browser blocks reading data/*.json from file://.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8000}"
echo "Serving at http://localhost:${PORT}/  (Ctrl+C to stop)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
