import fs from 'node:fs/promises';
import path from 'node:path';
import {
  CRITICAL_MUTATION_TARGETS,
  CRITICAL_MUTATION_TEST_FILES,
  FULL_MUTATION_SCOPE,
  MUTATION_SCOPE_EXCLUSIONS,
  SEMANTIC_MUTATION_FILES,
  SEMANTIC_MUTATION_ROOTS,
} from './mutation-scope.mjs';

const repoRoot = process.cwd();

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function globToRegExp(pattern) {
  let source = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === '*') {
      const next = pattern[index + 1];
      if (next === '*') {
        const following = pattern[index + 2];
        source += following === '/' ? '(?:.*/)?' : '.*';
        index += following === '/' ? 2 : 1;
      } else {
        source += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    if ('\\^$+?.()|{}[]'.includes(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }

  return new RegExp(`${source}$`);
}

function matchesMutationScope(file) {
  let included = false;

  for (const rawPattern of FULL_MUTATION_SCOPE) {
    const excluded = rawPattern.startsWith('!');
    const pattern = excluded ? rawPattern.slice(1) : rawPattern;
    if (globToRegExp(pattern).test(file)) {
      included = !excluded;
    }
  }

  return included;
}

async function collectSourceFiles(root) {
  const absoluteRoot = path.join(repoRoot, root);
  const entries = await fs.readdir(absoluteRoot, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = normalizePath(path.join(root, entry.name));
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(relativePath)));
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

function isTestFile(file) {
  return (
    file.includes('/__tests__/') || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
  );
}

async function pathExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function evaluateMutationScope() {
  const failures = [];
  const exclusionsByFile = new Map(
    MUTATION_SCOPE_EXCLUSIONS.map((entry) => [entry.file, entry]),
  );
  const governedFiles = (
    await Promise.all(SEMANTIC_MUTATION_ROOTS.map(collectSourceFiles))
  )
    .flat()
    .filter((file) => !isTestFile(file));

  for (const file of [...governedFiles, ...SEMANTIC_MUTATION_FILES]) {
    const exclusion = exclusionsByFile.get(file);
    if (exclusion) {
      if (matchesMutationScope(file)) {
        failures.push(`${file} is both excluded and selected for mutation.`);
      }
    } else if (!matchesMutationScope(file)) {
      failures.push(
        `${file} is not covered by the semantic mutation scope and has no explicit exclusion.`,
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const exclusion of MUTATION_SCOPE_EXCLUSIONS) {
    if (!(await pathExists(exclusion.file))) {
      failures.push(`Mutation exclusion does not exist: ${exclusion.file}`);
    }
    if (!exclusion.reason.trim() || !exclusion.owner.trim()) {
      failures.push(
        `Mutation exclusion requires a reason and owner: ${exclusion.file}`,
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exclusion.expiresAt)) {
      failures.push(
        `Mutation exclusion has an invalid expiry: ${exclusion.file}`,
      );
    } else if (exclusion.expiresAt < today) {
      failures.push(`Mutation exclusion has expired: ${exclusion.file}`);
    }
  }

  for (const file of [
    ...CRITICAL_MUTATION_TARGETS,
    ...CRITICAL_MUTATION_TEST_FILES,
    ...SEMANTIC_MUTATION_FILES,
  ]) {
    if (!(await pathExists(file))) {
      failures.push(`Configured mutation file does not exist: ${file}`);
    }
  }

  for (const target of CRITICAL_MUTATION_TARGETS) {
    if (!matchesMutationScope(target)) {
      failures.push(
        `Critical mutation target is outside the full scope: ${target}`,
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    governedFiles: governedFiles.length + SEMANTIC_MUTATION_FILES.length,
    exclusions: MUTATION_SCOPE_EXCLUSIONS.length,
  };
}

const result = await evaluateMutationScope();
if (!result.passed) {
  for (const failure of result.failures) {
    console.error(`[mutation-scope] ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `[mutation-scope] PASSED: ${result.governedFiles} governed files, ${result.exclusions} explicit exclusion(s).`,
  );
}
