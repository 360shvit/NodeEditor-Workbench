import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'release-spec/preact-provenance.json'), 'utf8'));
assert.equal(policy.schemaVersion, 1);
assert.equal(ts.version, '5.8.3', 'provenance comparison uses the reviewed locked parser');
if (!process.argv[2]) throw new Error('Pass the official package/dist/preact.module.js from the archive pinned in release-spec/preact-provenance.json');
const upstreamBytes = fs.readFileSync(process.argv[2]);
assert.equal(sha256(upstreamBytes), policy.upstreamModuleSha256, 'upstream module differs from the verified official package');
const upstream = upstreamBytes.toString('utf8');
const local = fs.readFileSync(path.join(root, policy.downstreamFile), 'utf8').replaceAll('\r\n', '\n');
assert.equal(sha256(local), policy.downstreamSha256Lf, 'downstream bytes require renewed review');
assert.ok(local.startsWith('// Preact, MIT License\nvar '));
const localBoundary = local.indexOf('globalThis.PreactLite=');
const upstreamBoundary = upstream.indexOf('export{');
assert.ok(localBoundary > 0 && upstreamBoundary > 0);

function canonical(code) {
  const file = 'input.js';
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(source.parseDiagnostics.length, 0, 'comparison input must parse');
  const host = {
    getSourceFile: name => name === file ? source : undefined,
    writeFile() {}, getCurrentDirectory: () => '', getDirectories: () => [],
    fileExists: name => name === file, readFile: name => name === file ? code : undefined,
    getCanonicalFileName: name => name, useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n', getDefaultLibFileName: () => '',
  };
  const program = ts.createProgram([file], { allowJs: true, checkJs: true, noLib: true, target: ts.ScriptTarget.Latest }, host);
  const checker = program.getTypeChecker();
  const bindings = new Map(), labels = new Map(), positions = new Map();
  function visit(node) {
    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      if (ts.isLabeledStatement(parent) && parent.label === node) {
        if (!labels.has(parent)) labels.set(parent, `label${labels.size}`);
        positions.set(node.getStart(source), labels.get(parent)); return;
      }
      if ((ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) && parent.label === node) {
        let target = parent.parent;
        while (target && !(ts.isLabeledStatement(target) && target.label.text === node.text)) target = target.parent;
        assert.ok(target && labels.has(target), 'every label reference must resolve');
        positions.set(node.getStart(source), labels.get(target)); return;
      }
      const property = (ts.isPropertyAccessExpression(parent) && parent.name === node) || (ts.isPropertyAssignment(parent) && parent.name === node);
      const symbol = checker.getSymbolAtLocation(node);
      if (!property && symbol?.declarations?.some(d => ts.isVariableDeclaration(d) || ts.isParameter(d) || ts.isFunctionDeclaration(d) || ts.isFunctionExpression(d))) {
        if (!bindings.has(symbol)) bindings.set(symbol, `binding${bindings.size}`);
        positions.set(node.getStart(source), bindings.get(symbol));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  const scan = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, code);
  const tokens = []; let kind;
  while ((kind = scan.scan()) !== ts.SyntaxKind.EndOfFileToken) tokens.push(positions.get(scan.getTokenPos()) ?? scan.getTokenText());
  return { tokens, bindings: bindings.size };
}

// Establish that normalization preserves semantics-relevant differences.
assert.deepEqual(canonical('function a(x){return x.value}'), canonical('function b(y){return y.value}'));
for (const different of ['function b(y){return y.other}', 'function b(y){return other.value}', 'function b(y){return y.value+1}']) {
  assert.notDeepEqual(canonical('function a(x){return x.value}'), canonical(different));
}
const lhs = canonical(local.slice(local.indexOf('var '), localBoundary));
const rhs = canonical(upstream.slice(0, upstreamBoundary));
assert.deepEqual(lhs, rhs, 'downstream body is not a binding-preserving rename of the official runtime');
assert.equal(lhs.tokens.length, policy.bodyTokens);
assert.equal(lhs.bindings, policy.localBindings);
const exports = upstream.slice(upstreamBoundary).match(/^export\{([^}]+)\};/)[1].split(',').map(part => {
  const [binding, name] = part.split(' as '); return [name, binding];
});
const downstreamExports = local.slice(localBoundary).match(/^globalThis\.PreactLite=\{([^}]+)\};\s*$/)[1].split(',').map(part => part.split(':'));
assert.deepEqual(downstreamExports, exports, 'global adapter changes an exported binding');
console.log(`Preact ${policy.upstreamVersion} provenance: PASS (${lhs.tokens.length} tokens, ${lhs.bindings} bindings; property/global/literal/operator and export parity)`);
