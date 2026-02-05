param(
  [string]$OutDir = "reports/quality"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Write-Section([string]$title) {
  "`n=== $title ===`n"
}

$tsconfigApp = "tsconfig.app.json"
$tsconfigTsPrune = "tsconfig.ts-prune.json"

Write-Output (Write-Section "Environment")
Write-Output ("Node: " + (node -v))
Write-Output ("npm:  " + (npm -v))
Write-Output ("knip: " + (knip --version))
Write-Output ("madge: " + (madge --version))
Write-Output ("depcheck: " + (depcheck --version))

Write-Output (Write-Section "Knip (unused deps/exports/files)")
knip --config .knip.json | Tee-Object -FilePath (Join-Path $OutDir "knip.txt")

Write-Output (Write-Section "ts-prune (unused exports)")
ts-prune -p $tsconfigTsPrune -i 'index\.tsx?:' | Tee-Object -FilePath (Join-Path $OutDir "ts-prune.txt")

Write-Output (Write-Section "Madge (circular deps)")
madge --circular --ts-config $tsconfigApp --extensions ts,tsx src/main.tsx | Tee-Object -FilePath (Join-Path $OutDir "madge-circular.txt")

Write-Output (Write-Section "depcheck (unused/missing deps)")
depcheck | Tee-Object -FilePath (Join-Path $OutDir "depcheck.txt")

Write-Output (Write-Section "ESLint SonarJS (code smells)")
npx eslint -c eslint.sonar.config.js src | Tee-Object -FilePath (Join-Path $OutDir "eslint-sonarjs.txt")
