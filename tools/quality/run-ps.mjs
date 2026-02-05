import { spawnSync } from 'node:child_process';

function tryRun(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error?.code === 'ENOENT') {
    return { ok: false };
  }
  return { ok: true, result };
}

const [, , scriptPath, ...scriptArgs] = process.argv;

if (!scriptPath) {
  console.error('Usage: node tools/quality/run-ps.mjs <script.ps1> [args...]');
  process.exit(1);
}

const baseArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...scriptArgs];
const candidates = process.platform === 'win32' ? ['pwsh', 'powershell'] : ['pwsh'];

for (const command of candidates) {
  const attempt = tryRun(command, baseArgs);
  if (!attempt.ok) continue;
  const { result } = attempt;
  process.exit(result.status ?? 1);
}

console.error(`Unable to run PowerShell script "${scriptPath}": neither "pwsh" nor "powershell" was found.`);
process.exit(1);

