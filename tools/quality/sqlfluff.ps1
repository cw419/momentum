param(
  [string]$Path = "supabase/migrations"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command sqlfluff -ErrorAction SilentlyContinue)) {
  Write-Output "sqlfluff is not installed. Recommended: pipx install sqlfluff (or: python -m pip install --user sqlfluff)"
  Write-Output "Skipping SQL lint (Path=$Path)."
  exit 0
}

sqlfluff lint --dialect postgres $Path

