#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo 'Usage: npm run ship -- --design-reviewed "type: concise summary"' >&2
  exit 2
}

if [[ $# -ne 2 || "$1" != "--design-reviewed" || -z "$2" ]]; then
  usage
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo 'Error: run this command from inside the Momentum Git repository.' >&2
  exit 1
fi

branch="$(git branch --show-current)"
if [[ -z "$branch" || "$branch" == "main" || "$branch" == "master" ]]; then
  echo 'Error: ship from a named feature branch, not the default branch.' >&2
  exit 1
fi

if git diff --cached --quiet; then
  echo 'Error: stage the intended changes before running ship.' >&2
  exit 1
fi

if ! git diff --cached --name-only | rg -Fx 'CHANGELOG.md' >/dev/null; then
  echo 'Error: stage an updated CHANGELOG.md before running ship.' >&2
  exit 1
fi

git diff --cached --check

prettier_files=()
while IFS= read -r -d '' file; do
  case "$file" in
    *.css | *.cjs | *.cts | *.html | *.js | *.json | *.jsonc | *.jsx | *.md | *.mjs | *.mts | *.ts | *.tsx | *.yaml | *.yml)
      prettier_files+=("$file")
      ;;
  esac
done < <(git diff --cached --name-only -z --diff-filter=ACMR)

if [[ ${#prettier_files[@]} -gt 0 ]]; then
  ./node_modules/.bin/prettier --check "${prettier_files[@]}"
fi

if git diff --cached --name-only | rg -q '^(src/|src-tauri/|supabase/migrations/)'; then
  npm run lint
  npm run typecheck
  npm test
fi

git commit -m "$2"
git push origin "$branch"
