import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, 'reports', 'quality');
const outPath = path.join(reportsDir, 'test-assertion-lint.json');
const TEST_FILE_PATTERN = /\.(test|spec)\.[cm]?[jt]sx?$/;

await fs.mkdir(reportsDir, { recursive: true });

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

async function listTestFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['node_modules', 'dist', 'coverage'].includes(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTestFiles(absolutePath)));
    } else if (TEST_FILE_PATTERN.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isExpectCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'expect'
  );
}

function isViMockCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'vi' &&
    node.expression.name.text === 'mock'
  );
}

function sameExpression(left, right, sourceFile) {
  return (
    unwrapExpression(left).getText(sourceFile) ===
    unwrapExpression(right).getText(sourceFile)
  );
}

function lineOf(sourceFile, node) {
  return (
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  );
}

function subjectNameForTest(filePath) {
  return path.basename(filePath).replace(/\.(test|spec)\.[cm]?[jt]sx?$/, '');
}

function moduleBaseName(modulePath) {
  return path.posix.basename(modulePath).replace(/\.[cm]?[jt]sx?$/, '');
}

const files = await listTestFiles(path.join(repoRoot, 'src'));
const violations = [];

for (const file of files) {
  const content = await fs.readFile(file, 'utf8');
  const relativeFile = normalizePath(path.relative(repoRoot, file));
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const subjectName = subjectNameForTest(file);

  function addViolation(node, rule, detail) {
    violations.push({
      file: relativeFile,
      line: lineOf(sourceFile, node),
      rule,
      detail,
    });
  }

  function visit(node) {
    if (isViMockCall(node)) {
      const moduleArgument = node.arguments[0];
      if (
        moduleArgument &&
        ts.isStringLiteral(moduleArgument) &&
        moduleBaseName(moduleArgument.text) === subjectName
      ) {
        addViolation(
          node,
          'no-direct-sut-mock',
          `test mocks its own subject module ${moduleArgument.text}`,
        );
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      isExpectCall(node.expression.expression)
    ) {
      const expectCall = node.expression.expression;
      const actual = expectCall.arguments[0];
      const expected = node.arguments[0];
      const matcher = node.expression.name.text;

      if (matcher === 'toBeTruthy' || matcher === 'toBeFalsy') {
        addViolation(node, 'no-ambiguous-boolean-assertion', matcher);
      } else if (
        actual &&
        expected &&
        ['toBe', 'toEqual', 'toStrictEqual'].includes(matcher) &&
        sameExpression(actual, expected, sourceFile)
      ) {
        addViolation(node, 'no-self-equality', node.getText(sourceFile));
      } else if (
        actual &&
        expected &&
        matcher === 'toBe' &&
        ((actual.kind === ts.SyntaxKind.TrueKeyword &&
          expected.kind === ts.SyntaxKind.TrueKeyword) ||
          (actual.kind === ts.SyntaxKind.FalseKeyword &&
            expected.kind === ts.SyntaxKind.FalseKeyword))
      ) {
        addViolation(node, 'no-literal-tautology', node.getText(sourceFile));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const payload = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  totalTestFilesScanned: files.length,
  rules: [
    'no-ambiguous-boolean-assertion',
    'no-self-equality',
    'no-literal-tautology',
    'no-direct-sut-mock',
  ],
  violationCount: violations.length,
  violations,
};

await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

if (violations.length > 0) {
  console.error(
    `[test-assertion-lint] found ${violations.length} weak assertion or SUT-mock violation(s).`,
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.rule}: ${violation.detail}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `[test-assertion-lint] scanned ${files.length} files; no weak assertions or direct SUT mocks found.`,
  );
}
console.log(
  `[test-assertion-lint] report: ${normalizePath(path.relative(repoRoot, outPath))}`,
);
