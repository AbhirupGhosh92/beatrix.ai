#!/usr/bin/env bash
# Stops whatever is listening on a TCP port (default 3000, e.g. a leftover `next dev`).
# Usage: scripts/stop-port.sh [port]
set -euo pipefail

port="${1:-3000}"

if ! [[ "$port" =~ ^[0-9]+$ ]]; then
  echo "Invalid port: $port" >&2
  exit 1
fi

pids="$(lsof -ti "tcp:$port" -sTCP:LISTEN || true)"

if [[ -z "$pids" ]]; then
  echo "Nothing is listening on port $port."
  exit 0
fi

echo "Stopping process(es) on port $port: $(echo "$pids" | tr '\n' ' ')"
# shellcheck disable=SC2086
kill $pids 2>/dev/null || true

# Give it a moment to shut down cleanly, then force-kill anything left.
for _ in 1 2 3 4 5; do
  sleep 0.5
  [[ -z "$(lsof -ti "tcp:$port" -sTCP:LISTEN || true)" ]] && { echo "Port $port is free."; exit 0; }
done

echo "Still running, forcing shutdown..."
# shellcheck disable=SC2046
kill -9 $(lsof -ti "tcp:$port" -sTCP:LISTEN || true) 2>/dev/null || true
sleep 0.5

if [[ -z "$(lsof -ti "tcp:$port" -sTCP:LISTEN || true)" ]]; then
  echo "Port $port is free."
else
  echo "Could not free port $port." >&2
  exit 1
fi
