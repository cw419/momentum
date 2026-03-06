param(
  [string]$Config = "auto"
)

$ErrorActionPreference = "Stop"

function Test-IsCiEnvironment {
  return $env:CI -and $env:CI -ne "0" -and $env:CI -ne "false"
}

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

  $candidate = [System.IO.Path]::Combine($scriptDir.Trim(), $ScriptName)
  if ([System.IO.File]::Exists($candidate)) {
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
  $installHint = "Install with: pipx install semgrep (or: python -m pip install --user semgrep)."
  if (Test-IsCiEnvironment) {
    Write-Error "semgrep is required in CI but not installed or not discoverable on PATH. $installHint"
    exit 1
  }

  Write-Output "[semgrep] SKIPPED: semgrep is not installed locally. $installHint"
  exit 0
}

$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$semgrepDir = [System.IO.Path]::GetDirectoryName($semgrepExecutable)
if ($semgrepDir) {
  $env:Path = "$semgrepDir;$env:Path"
}

& $semgrepExecutable scan --error --config $Config --exclude node_modules --exclude dist --exclude coverage --exclude tools/experiments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
