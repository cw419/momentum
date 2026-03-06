param()

$ErrorActionPreference = "Stop"

node tools/quality/smell-audit.mjs
exit $LASTEXITCODE
