#!/bin/zsh

set -u

PORT=5173
FOUND=0

for PID in ${(f)"$(lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t 2>/dev/null)"}; do
  COMMAND="$(ps -p "$PID" -o command= 2>/dev/null || true)"

  if [[ "$COMMAND" == *vite* || "$COMMAND" == *"npm run dev"* ]]; then
    echo "Stopping Momentum development server (PID $PID)..."
    kill "$PID" 2>/dev/null || true
    FOUND=1
  fi
done

if [[ "$FOUND" -eq 0 ]]; then
  echo "Momentum development server is not running on port ${PORT}."
else
  echo "Momentum development server stopped."
fi
