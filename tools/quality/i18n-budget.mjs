import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(
  ROOT,
  'tools',
  'quality',
  'i18n-tr-baseline.json',
);
const TRANSLATIONS_PATH = path.join(SRC_DIR, 'i18n', 'translations.ts');

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    if (!/\.[jt]sx?$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function isProductionSource(filePath) {
  const relativePath = path.relative(ROOT, filePath).replaceAll('\\', '/');
  return (
    !relativePath.includes('/__tests__/') &&
    !/\.(test|spec)\.[jt]sx?$/.test(relativePath)
  );
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function readDictionary(sourceFile, variableName) {
  let dictionary;

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer
    ) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isObjectLiteralExpression(initializer)) dictionary = initializer;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!dictionary) throw new Error(`Could not find ${variableName}`);

  const values = new Map();
  for (const property of dictionary.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    const key =
      ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)
        ? name.text
        : ts.isIdentifier(name)
          ? name.text
          : null;
    const value = unwrapExpression(property.initializer);
    if (
      key &&
      (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
    ) {
      values.set(key, value.text);
    }
  }
  return values;
}

function isNamedCall(node, name) {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isIdentifier(node.expression)) return node.expression.text === name;
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === name
  );
}

function inspectSources() {
  const trCounts = new Map();
  const usedKeys = new Set();
  const unknownDynamicKeys = [];

  for (const filePath of listSourceFiles(SRC_DIR).filter(isProductionSource)) {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    let trCount = 0;

    function visit(node) {
      if (isNamedCall(node, 'tr')) trCount += 1;
      if (isNamedCall(node, 't')) {
        const firstArgument = node.arguments[0];
        if (
          firstArgument &&
          (ts.isStringLiteral(firstArgument) ||
            ts.isNoSubstitutionTemplateLiteral(firstArgument))
        ) {
          usedKeys.add(firstArgument.text);
        } else if (firstArgument) {
          const position = sourceFile.getLineAndCharacterOfPosition(
            firstArgument.getStart(sourceFile),
          );
          unknownDynamicKeys.push(
            `${path.relative(ROOT, filePath)}:${position.line + 1}`,
          );
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    if (trCount > 0) {
      trCounts.set(
        path.relative(ROOT, filePath).replaceAll('\\', '/'),
        trCount,
      );
    }
  }

  return { trCounts, usedKeys, unknownDynamicKeys };
}

function toBaseline(trCounts) {
  return {
    version: 1,
    maxLegacyCalls: [...trCounts.values()].reduce(
      (total, count) => total + count,
      0,
    ),
    maxLegacyFiles: trCounts.size,
  };
}

const translationSource = ts.createSourceFile(
  TRANSLATIONS_PATH,
  fs.readFileSync(TRANSLATIONS_PATH, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const en = readDictionary(translationSource, 'enTranslations');
const zh = readDictionary(translationSource, 'zhTranslations');
const { trCounts, usedKeys, unknownDynamicKeys } = inspectSources();

if (process.argv.includes('--print-baseline')) {
  process.stdout.write(`${JSON.stringify(toBaseline(trCounts), null, 2)}\n`);
  process.exit(0);
}

const errors = [];
for (const [key, value] of en) {
  if (!value.trim()) errors.push(`English translation is empty: ${key}`);
  if (!zh.has(key)) errors.push(`Chinese translation is missing: ${key}`);
}
for (const [key, value] of zh) {
  if (!value.trim()) errors.push(`Chinese translation is empty: ${key}`);
  if (!en.has(key)) errors.push(`English translation is missing: ${key}`);
}
for (const key of usedKeys) {
  if (!en.has(key)) errors.push(`Unknown static translation key: ${key}`);
}
if (unknownDynamicKeys.length > 0) {
  errors.push(
    `Dynamic t() keys cannot be checked: ${unknownDynamicKeys.join(', ')}`,
  );
}

if (!fs.existsSync(BASELINE_PATH)) {
  errors.push('Missing tools/quality/i18n-tr-baseline.json');
} else {
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const currentCalls = [...trCounts.values()].reduce(
    (total, count) => total + count,
    0,
  );
  if (currentCalls > baseline.maxLegacyCalls) {
    errors.push(
      `Legacy tr() calls increased from ${baseline.maxLegacyCalls} to ${currentCalls}`,
    );
  }
  if (trCounts.size > baseline.maxLegacyFiles) {
    errors.push(
      `Files using tr() increased from ${baseline.maxLegacyFiles} to ${trCounts.size}`,
    );
  }
}

const unusedKeys = [...en.keys()].filter((key) => !usedKeys.has(key));
const totalTrCalls = [...trCounts.values()].reduce(
  (total, count) => total + count,
  0,
);
process.stdout.write(
  `i18n budget: ${en.size} keys, ${unusedKeys.length} unused, ${totalTrCalls} legacy tr() calls in ${trCounts.size} files\n`,
);
if (unusedKeys.length > 0) {
  process.stdout.write(`Unused keys: ${unusedKeys.join(', ')}\n`);
}

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.exit(1);
}
