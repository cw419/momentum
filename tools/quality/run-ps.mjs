import { spawnSync } from 'node:child_process';
import path from 'node:path';

function normalizePath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

function isAllowedScript(scriptPath) {
  const normalized = normalizePath(path.resolve(scriptPath));
  const allowedRoot = normalizePath(path.resolve('tools/quality')) + '/';
  return normalized.startsWith(allowedRoot) && normalized.endsWith('.ps1');
}

const [, , scriptPath, ...scriptArgs] = process.argv;

if (!scriptPath) {
  console.error('Usage: node tools/quality/run-ps.mjs <script.ps1> [args...]');
  process.exit(1);
}

if (!isAllowedScript(scriptPath)) {
  console.error(
    `Refusing to execute script outside tools/quality or non-ps1 file: "${scriptPath}"`,
  );
  process.exit(1);
}

const baseArgs = [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  scriptPath,
  ...scriptArgs,
];

const pwshResult = spawnSync('pwsh', baseArgs, { stdio: 'inherit' });
if (pwshResult.error?.code !== 'ENOENT') {
  process.exit(pwshResult.status ?? 1);
}

if (process.platform === 'win32') {
  const powershellResult = spawnSync('powershell', baseArgs, {
    stdio: 'inherit',
  });
  if (powershellResult.error?.code !== 'ENOENT') {
    process.exit(powershellResult.status ?? 1);
  }
}

console.error(
  `Unable to run PowerShell script "${scriptPath}": neither "pwsh" nor "powershell" was found.`,
);
process.exit(1);
