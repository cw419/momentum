param(
  [string]$Path = "supabase/migrations",
  [string]$BaseRef = "origin/main",
  [switch]$UseMergeBase
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

$sqlfluffExecutable = $null
$sqlfluffCmd = Get-Command sqlfluff -ErrorAction SilentlyContinue
if ($sqlfluffCmd) {
  $sqlfluffExecutable = $sqlfluffCmd.Source
} else {
  $sqlfluffExecutable = Resolve-PythonUserScriptPath -ScriptName "sqlfluff.exe"
}

if (-not $sqlfluffExecutable) {
  $installHint = "Install with: pipx install sqlfluff (or: python -m pip install --user sqlfluff)."
  if (Test-IsCiEnvironment) {
    Write-Error "sqlfluff is required in CI but not installed or not discoverable on PATH. $installHint"
    exit 1
  }

  Write-Output "[sqlfluff] SKIPPED: sqlfluff is not installed locally. $installHint"
  exit 0
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Output "git is unavailable. Falling back to lint all SQL under $Path."
  & $sqlfluffExecutable lint --dialect postgres $Path
  exit $LASTEXITCODE
}

$changedFiles = @()
$mergeBase = $null

if ($UseMergeBase) {
  try {
    $mergeBase = git merge-base HEAD $BaseRef 2>$null
  } catch {
    $mergeBase = $null
  }

  if ($mergeBase) {
    $changedFiles = @(
      git diff --name-only --diff-filter=ACMR $mergeBase HEAD -- $Path |
        Where-Object { $_ -like "*.sql" } |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -ne "" }
    )
  } else {
    Write-Warning "Unable to determine merge-base for $BaseRef. Falling back to local HEAD diff."
  }
}

if (-not $changedFiles -or $changedFiles.Count -eq 0) {
  # Default local mode: lint only files changed from HEAD (staged + unstaged).
  $changedFiles = @(
    git diff --name-only --diff-filter=ACMR HEAD -- $Path |
      Where-Object { $_ -like "*.sql" } |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_ -ne "" }
  )
}

if (-not $changedFiles -or $changedFiles.Count -eq 0) {
  Write-Output "No changed SQL files detected under $Path."
  exit 0
}

Write-Output "Linting changed SQL files:"
$changedFiles | ForEach-Object { Write-Output " - $_" }

$lintArgs = @("lint", "--dialect", "postgres")
$lintArgs += $changedFiles

& $sqlfluffExecutable @lintArgs
exit $LASTEXITCODE
