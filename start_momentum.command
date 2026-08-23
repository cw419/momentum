#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "Starting Momentum from: $PROJECT_DIR"
echo "Open http://127.0.0.1:5173/ in your browser."
echo "Press Ctrl+C to stop the development server."

exec npm run dev -- --host 127.0.0.1
