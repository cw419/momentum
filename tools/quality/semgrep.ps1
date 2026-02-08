param(
  [string]$Config = "auto"
)

$ErrorActionPreference = "Stop"

function Resolve-PythonUserScriptPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptName
  )

  if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    return $null
  }

  $scriptDir = python -c "import pathlib, site; print(pathlib.Path(site.getusersitepackages()).parent / 'Scripts')" 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $scriptDir) {
    return $null
  }

  $candidate = Join-Path $scriptDir.Trim() $ScriptName
  if (Test-Path $candidate) {
    return $candidate
  }

  return $null
}

$semgrepExecutable = $null
$semgrepCmd = Get-Command semgrep -ErrorAction SilentlyContinue
if ($semgrepCmd) {
  $semgrepExecutable = $semgrepCmd.Source
} else {
  $semgrepExecutable = Resolve-PythonUserScriptPath -ScriptName "semgrep.exe"
}

if (-not $semgrepExecutable) {
  Write-Error "semgrep is required but not installed or not discoverable on PATH. Install with: pipx install semgrep (or: python -m pip install --user semgrep)."
  exit 1
}

$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$semgrepDir = Split-Path -Parent $semgrepExecutable
if ($semgrepDir) {
  $env:Path = "$semgrepDir;$env:Path"
}

& $semgrepExecutable scan --error --config $Config --exclude node_modules --exclude dist --exclude coverage --exclude tools/experiments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
