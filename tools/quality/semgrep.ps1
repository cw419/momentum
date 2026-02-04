param(
  [string]$Config = "auto"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command semgrep -ErrorAction SilentlyContinue)) {
  Write-Output "semgrep is not installed. Recommended: pipx install semgrep (or: python -m pip install --user semgrep)"
  Write-Output "Skipping Semgrep scan."
  exit 0
}

semgrep scan --config $Config --exclude node_modules --exclude dist --exclude coverage

