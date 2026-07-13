import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import postcss from 'postcss';

const REPO_ROOT = process.cwd();
const DEFAULT_CSS_ROOT = path.join(REPO_ROOT, 'src');
const DEFAULT_SOURCE_ROOT = path.join(REPO_ROOT, 'src');
const DEFAULT_REPORT_PATH = path.join(
  REPO_ROOT,
  'reports',
  'quality',
  'css-structure.json',
);
const SOURCE_EXTENSIONS = new Set(['.html', '.js', '.jsx', '.ts', '.tsx']);
const INTERACTIVE_ELEMENT_PATTERN =
  /^(?:button|input|textarea|select|form)(?=$|[\s.#:[>+~])/i;

async function collectFiles(root, predicate) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(root, entry.name);
      if (entry.isDirectory()) return collectFiles(absolutePath, predicate);
      return predicate(absolutePath) ? [absolutePath] : [];
    }),
  );
  return nested.flat();
}

function getRuleContext(rule) {
  const context = [];
  let current = rule.parent;
  while (current) {
    if (current.type === 'atrule') {
      context.unshift(`@${current.name} ${current.params}`.trim());
    }
    current = current.parent;
  }
  return context.join(' > ');
}

function isInBaseLayer(rule) {
  let current = rule.parent;
  while (current) {
    if (current.type === 'atrule' && current.name === 'layer') {
      return current.params.trim() === 'base';
    }
    current = current.parent;
  }
  return false;
}

function getClassNames(selector) {
  return [...selector.matchAll(/(?<!\\)\.(-?[_a-zA-Z]+[\w-]*)/g)].map(
    (match) => match[1],
  );
}

function isClassReferenced(className, sourceText) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\w-])${escaped}([^\\w-]|$)`).test(sourceText);
}

export function analyzeCssStructure(stylesheets, sourceText) {
  const violations = [];
  const selectors = new Map();
  const classDefinitions = new Map();

  for (const stylesheet of stylesheets) {
    const root = postcss.parse(stylesheet.css, { from: stylesheet.file });
    root.walkRules((rule) => {
      const context = getRuleContext(rule);
      const location = {
        file: stylesheet.file,
        line: rule.source?.start?.line ?? 1,
      };

      for (const rawSelector of rule.selectors ?? [rule.selector]) {
        const selector = rawSelector.trim().replace(/\s+/g, ' ');
        const selectorKey = `${context}\0${selector}`;
        const previous = selectors.get(selectorKey);
        if (previous) {
          violations.push({
            code: 'duplicate-selector',
            message: `Duplicate selector "${selector}" in the same at-rule context`,
            ...location,
            previous,
          });
        } else {
          selectors.set(selectorKey, location);
        }

        if (
          !isInBaseLayer(rule) &&
          INTERACTIVE_ELEMENT_PATTERN.test(selector)
        ) {
          violations.push({
            code: 'global-interactive-selector',
            message: `Scope the global interactive selector "${selector}" or move it to @layer base`,
            ...location,
          });
        }

        for (const className of getClassNames(selector)) {
          if (!classDefinitions.has(className)) {
            classDefinitions.set(className, location);
          }
        }
      }
    });
  }

  for (const [className, location] of classDefinitions) {
    if (!isClassReferenced(className, sourceText)) {
      violations.push({
        code: 'unused-class',
        message: `Custom class ".${className}" is not referenced by application source`,
        ...location,
      });
    }
  }

  return {
    passed: violations.length === 0,
    stylesheetCount: stylesheets.length,
    customClassCount: classDefinitions.size,
    violations,
  };
}

export async function runCssStructureAudit({
  cssRoot = DEFAULT_CSS_ROOT,
  sourceRoot = DEFAULT_SOURCE_ROOT,
  reportPath = DEFAULT_REPORT_PATH,
} = {}) {
  const cssFiles = await collectFiles(cssRoot, (file) => file.endsWith('.css'));
  const sourceFiles = await collectFiles(sourceRoot, (file) =>
    SOURCE_EXTENSIONS.has(path.extname(file)),
  );
  const [stylesheets, sourceParts] = await Promise.all([
    Promise.all(
      cssFiles.map(async (file) => ({
        file: path.relative(REPO_ROOT, file).replaceAll('\\', '/'),
        css: await fs.readFile(file, 'utf8'),
      })),
    ),
    Promise.all(sourceFiles.map((file) => fs.readFile(file, 'utf8'))),
  ]);
  const report = analyzeCssStructure(stylesheets, sourceParts.join('\n'));
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  return report;
}

async function main() {
  const report = await runCssStructureAudit({
    cssRoot: process.env.CSS_STRUCTURE_CSS_ROOT ?? DEFAULT_CSS_ROOT,
    sourceRoot: process.env.CSS_STRUCTURE_SOURCE_ROOT ?? DEFAULT_SOURCE_ROOT,
    reportPath: process.env.CSS_STRUCTURE_REPORT_PATH ?? DEFAULT_REPORT_PATH,
  });

  if (report.passed) {
    console.log(
      `[css-structure] PASSED: ${report.stylesheetCount} stylesheets, ${report.customClassCount} custom classes`,
    );
    return;
  }

  console.error(
    `[css-structure] FAILED: ${report.violations.length} structural violation(s)`,
  );
  for (const violation of report.violations) {
    console.error(
      `- ${violation.code}: ${violation.file}:${violation.line} ${violation.message}`,
    );
  }
  process.exitCode = 1;
}

if (
  path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)
) {
  await main();
}
