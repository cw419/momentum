import path from 'node:path';
import ts from 'typescript';

export const TEST_ASSERTION_RULES = Object.freeze([
  'no-ambiguous-boolean-assertion',
  'no-self-equality',
  'no-literal-tautology',
  'no-constant-expect-subject',
  'no-direct-sut-mock',
  'no-direct-sut-spy',
  'no-builtin-prototype-mock',
]);

const BUILTIN_PROTOTYPES = new Set([
  'Array',
  'Date',
  'Function',
  'Map',
  'Number',
  'Object',
  'Promise',
  'Set',
  'String',
  'WeakMap',
  'WeakSet',
]);

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

function getExpectCallFromMatcher(node) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression)
  ) {
    return null;
  }

  let candidate = node.expression.expression;
  while (
    ts.isPropertyAccessExpression(candidate) &&
    ['not', 'rejects', 'resolves'].includes(candidate.name.text)
  ) {
    candidate = candidate.expression;
  }
  return isExpectCall(candidate) ? candidate : null;
}

function getViMethodName(node) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !ts.isIdentifier(node.expression.expression) ||
    node.expression.expression.text !== 'vi'
  ) {
    return null;
  }
  return node.expression.name.text;
}

function getMockedModulePath(node) {
  const argument = node.arguments[0];
  if (argument && ts.isStringLiteral(argument)) return argument.text;
  if (
    argument &&
    ts.isCallExpression(argument) &&
    argument.expression.kind === ts.SyntaxKind.ImportKeyword &&
    argument.arguments[0] &&
    ts.isStringLiteral(argument.arguments[0])
  ) {
    return argument.arguments[0].text;
  }
  return null;
}

function isBuiltinPrototype(node) {
  const target = unwrapExpression(node);
  return (
    ts.isPropertyAccessExpression(target) &&
    target.name.text === 'prototype' &&
    ts.isIdentifier(target.expression) &&
    BUILTIN_PROTOTYPES.has(target.expression.text)
  );
}

function sameExpression(left, right, sourceFile) {
  return (
    unwrapExpression(left).getText(sourceFile) ===
    unwrapExpression(right).getText(sourceFile)
  );
}

function isConstantExpression(node) {
  const expression = unwrapExpression(node);
  if (
    ts.isStringLiteral(expression) ||
    ts.isNumericLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression) ||
    ts.isRegularExpressionLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
  ) {
    return true;
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    return isConstantExpression(expression.operand);
  }
  if (ts.isBinaryExpression(expression)) {
    return (
      isConstantExpression(expression.left) &&
      isConstantExpression(expression.right)
    );
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.every(isConstantExpression);
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.every(
      (property) =>
        ts.isPropertyAssignment(property) &&
        isConstantExpression(property.initializer),
    );
  }
  return false;
}

function lineOf(sourceFile, node) {
  return (
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  );
}

function subjectNamesForTest(filePath) {
  const stem = path
    .basename(filePath)
    .replace(/\.(test|spec)\.[cm]?[jt]sx?$/, '');
  const parts = stem.split('.');
  return new Set([stem, parts[0], parts.at(-1)].filter(Boolean));
}

function moduleBaseName(modulePath) {
  return path.posix.basename(modulePath).replace(/\.[cm]?[jt]sx?$/, '');
}

function collectSutBindings(sourceFile, subjectNames) {
  const bindings = new Set();

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !subjectNames.has(moduleBaseName(statement.moduleSpecifier.text))
    ) {
      continue;
    }

    const importClause = statement.importClause;
    if (!importClause) continue;
    if (importClause.name) bindings.add(importClause.name.text);

    const namedBindings = importClause.namedBindings;
    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      bindings.add(namedBindings.name.text);
    } else if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        bindings.add(element.name.text);
      }
    }
  }

  return bindings;
}

function collectSutInstances(sourceFile, sutBindings) {
  const instances = new Set();

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isNewExpression(unwrapExpression(node.initializer))
    ) {
      const constructor = unwrapExpression(node.initializer).expression;
      if (ts.isIdentifier(constructor) && sutBindings.has(constructor.text)) {
        instances.add(node.name.text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return instances;
}

function rootIdentifier(node) {
  let current = unwrapExpression(node);
  while (
    ts.isPropertyAccessExpression(current) ||
    ts.isElementAccessExpression(current)
  ) {
    current = unwrapExpression(current.expression);
  }
  return ts.isIdentifier(current) ? current.text : null;
}

export function analyzeTestSource({ content, filePath }) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const subjectNames = subjectNamesForTest(filePath);
  const sutBindings = collectSutBindings(sourceFile, subjectNames);
  const sutInstances = collectSutInstances(sourceFile, sutBindings);
  const violations = [];

  function addViolation(node, rule, detail) {
    violations.push({
      line: lineOf(sourceFile, node),
      rule,
      detail,
    });
  }

  function visit(node) {
    const viMethod = getViMethodName(node);
    if (viMethod === 'mock' || viMethod === 'doMock') {
      const modulePath = getMockedModulePath(node);
      if (modulePath && subjectNames.has(moduleBaseName(modulePath))) {
        addViolation(
          node,
          'no-direct-sut-mock',
          `test mocks its own subject module ${modulePath}`,
        );
      }
    }

    if (
      viMethod === 'spyOn' &&
      node.arguments[0] &&
      isBuiltinPrototype(node.arguments[0])
    ) {
      addViolation(
        node,
        'no-builtin-prototype-mock',
        `test replaces shared built-in behavior via ${node.arguments[0].getText(sourceFile)}`,
      );
    } else if (viMethod === 'spyOn' && node.arguments[0]) {
      const targetRoot = rootIdentifier(node.arguments[0]);
      if (
        targetRoot &&
        (sutBindings.has(targetRoot) || sutInstances.has(targetRoot))
      ) {
        addViolation(
          node,
          'no-direct-sut-spy',
          `test spies on its own subject via ${node.arguments[0].getText(sourceFile)}`,
        );
      }
    }

    const expectCall = getExpectCallFromMatcher(node);
    if (expectCall && ts.isPropertyAccessExpression(node.expression)) {
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
      } else if (actual && isConstantExpression(actual)) {
        addViolation(
          node,
          'no-constant-expect-subject',
          `expect subject is constant: ${actual.getText(sourceFile)}`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}
