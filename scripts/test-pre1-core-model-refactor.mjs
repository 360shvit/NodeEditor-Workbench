import assert from 'node:assert/strict';
import {
  applyChangeSet,
  buildProject,
  compareDiagnostics,
  emptyChangeSet,
  fieldMatchKey,
  findMatchingFields,
  indexScalarSpans,
  jsonPathKey,
  patchJsonScalars,
  renameSymbol,
  symbolKey,
} from '../.core-build/index.js';

// JSON-path identity must remain structural for punctuation, numeric-looking keys, escapes and Unicode.
const pathCases = [
  [['a.b', 'Value'], ['a', 'b', 'Value']],
  [['items', '0'], ['items', 0]],
  [['quote"key', 'slash\\key'], ['quote', 'key', 'slash\\key']],
  [['ümlaut.键', 0], ['ümlaut', '键', 0]],
];
for (const [left, right] of pathCases) assert.notEqual(jsonPathKey(left), jsonPathKey(right));

const source = '{\n  "a.b": { "Value": "dot" },\n  "a": { "b": { "Value": "nested" } },\n  "0": "string-zero",\n  "items": ["index-zero"],\n  "quote\\\"key": { "slash\\\\key": "old" }\n}\n';
const spans = indexScalarSpans(source);
const makeChange = (id, jsonPath, oldValue, newValue) => ({
  id,
  fileId: 'file:patch',
  filePath: 'Patch.json',
  nodeId: 'patch-node',
  field: String(jsonPath.at(-1)),
  jsonPath,
  oldValue,
  newValue,
  location: 'live',
  source: 'manual',
});
const patched = patchJsonScalars(source, spans, [
  makeChange('dot', ['a.b', 'Value'], 'dot', 'dot-renamed'),
  makeChange('index', ['items', 0], 'index-zero', 'array-renamed'),
  makeChange('escaped', ['quote"key', 'slash\\key'], 'old', 'new'),
]);
const patchedJson = JSON.parse(patched);
assert.equal(patchedJson['a.b'].Value, 'dot-renamed');
assert.equal(patchedJson.a.b.Value, 'nested');
assert.equal(patchedJson['0'], 'string-zero');
assert.equal(patchedJson.items[0], 'array-renamed');
assert.equal(patchedJson['quote"key']['slash\\key'], 'new');
assert.match(patched, /\n  "a":/);
assert.throws(
  () => patchJsonScalars(source, spans, [makeChange('stale', ['a.b', 'Value'], 'not-dot', 'x')]),
  /Source changed before apply/,
);

// Delimiter-bearing symbol types/names are legal strings and must never alias in the index.
const identityProject = buildProject([{
  path: 'Server/HytaleGenerator/Density/Identity.json',
  text: JSON.stringify({
    defOne: { $NodeId: 'Export.A::B', Type: 'Exported', ExportAs: 'C' },
    refOne: { $NodeId: 'Import.A::B', Type: 'Imported', Name: 'C' },
    defTwo: { $NodeId: 'Export.A', Type: 'Exported', ExportAs: 'B::C' },
    refTwo: { $NodeId: 'Import.A', Type: 'Imported', Name: 'B::C' },
    ruleDefOne: { $NodeId: 'Export.A:B', Type: 'Exported', ExportAs: 'C' },
    ruleRefOne: { $NodeId: 'Import.A:B', Type: 'Imported', Name: 'C' },
    ruleDefTwo: { $NodeId: 'Export.A', Type: 'Exported', ExportAs: 'B:C' },
    ruleRefTwo: { $NodeId: 'Import.A', Type: 'Imported', Name: 'B:C' },
  }),
}]);
assert.notEqual(symbolKey('A::B', 'C'), symbolKey('A', 'B::C'));
for (const [type, name] of [['A::B', 'C'], ['A', 'B::C'], ['A:B', 'C'], ['A', 'B:C']]) {
  const record = identityProject.symbolIndex.get(symbolKey(type, name));
  assert.ok(record, `missing symbol ${type}/${name}`);
  assert.equal(record.definitions.length, 1);
  assert.equal(record.references.length, 1);
}
assert.ok(identityProject.semanticReferences.filter((item) => item.relation === 'symbol-import').every((item) => item.status === 'resolved'));

let renamedChanges = emptyChangeSet();
renamedChanges = renameSymbol(identityProject, renamedChanges, 'A::B', 'C', 'Renamed::One');
renamedChanges = renameSymbol(identityProject, renamedChanges, 'A', 'B::C', 'Renamed::Two');
const renamedProject = applyChangeSet(identityProject, renamedChanges).project;
assert.ok(renamedProject.symbolIndex.get(symbolKey('A::B', 'Renamed::One')));
assert.ok(renamedProject.symbolIndex.get(symbolKey('A', 'Renamed::Two')));
assert.equal(renamedProject.symbolIndex.has(symbolKey('A::B', 'C')), false);
assert.equal(renamedProject.symbolIndex.has(symbolKey('A', 'B::C')), false);
assert.throws(() => renameSymbol(identityProject, emptyChangeSet(), 'A::B', 'C', '   '), /non-empty/);

let ruleChanges = emptyChangeSet();
ruleChanges = renameSymbol(identityProject, ruleChanges, 'A:B', 'C', 'RuleOne');
ruleChanges = renameSymbol(identityProject, ruleChanges, 'A', 'B:C', 'RuleTwo');
assert.equal(ruleChanges.rules.length, 2, 'distinct symbol renames must not collide in RefactorRule identity');
assert.equal(new Set(ruleChanges.rules.map((rule) => rule.id)).size, 2);

// Generic field-match identity must not alias nodeKind/field boundaries containing delimiters.
const matchProject = buildProject([{
  path: 'Server/HytaleGenerator/Test/FieldMatch.json',
  text: JSON.stringify({
    first: { $NodeId: 'A|B', Type: 'Custom', C: 'x' },
    second: { $NodeId: 'A', Type: 'Custom', 'B|C': 'x' },
  }),
}]);
const firstNode = matchProject.files[0].nodes.find((node) => node.id === 'A|B');
const secondNode = matchProject.files[0].nodes.find((node) => node.id === 'A');
assert.ok(firstNode && secondNode);
const firstField = firstNode.fields.find((field) => field.key === 'C');
const secondField = secondNode.fields.find((field) => field.key === 'B|C');
assert.ok(firstField && secondField);
assert.notEqual(fieldMatchKey(firstNode.nodeKind, firstField), fieldMatchKey(secondNode.nodeKind, secondField));
assert.deepEqual(findMatchingFields(matchProject, firstNode, firstField), []);
assert.deepEqual(findMatchingFields(matchProject, secondNode, secondField), []);

// Validation identity must include severity and remain collision-free across delimiter-bearing fields.
const emptyProject = buildProject([]);
const warningProject = { ...emptyProject, diagnostics: [{ code: 'type-name-collision', severity: 'warning', message: 'same diagnostic' }] };
const errorProject = { ...emptyProject, diagnostics: [{ code: 'type-name-collision', severity: 'error', message: 'same diagnostic' }] };
const escalation = compareDiagnostics(warningProject, errorProject);
assert.equal(escalation.safe, false);
assert.equal(escalation.addedErrors.length, 1, 'warning -> error escalation must be treated as a new error');

const delimiterBefore = { ...emptyProject, diagnostics: [{ code: 'parse-error', severity: 'error', nodeId: 'node|', message: 'x' }] };
const delimiterAfter = { ...emptyProject, diagnostics: [{ code: 'parse-error', severity: 'error', nodeId: 'node', message: '|x' }] };
const delimiterDiff = compareDiagnostics(delimiterBefore, delimiterAfter);
assert.equal(delimiterDiff.added.length, 1);
assert.equal(delimiterDiff.removed.length, 1);
assert.equal(delimiterDiff.addedErrors.length, 1);

// A malformed file must remain isolated from valid files and emit an explicit parse diagnostic.
const mixedProject = buildProject([
  { path: 'Server/HytaleGenerator/Density/Good.json', text: JSON.stringify({ $NodeId: 'Exported.Density', Type: 'Exported', ExportAs: 'Good' }) },
  { path: 'Server/HytaleGenerator/Density/Bad.json', text: '{"broken":' },
]);
assert.equal(mixedProject.files.length, 2);
assert.ok(mixedProject.symbolIndex.get(symbolKey('Density', 'Good')));
assert.ok(mixedProject.files.find((file) => file.path.endsWith('Bad.json'))?.parseError);
assert.ok(mixedProject.diagnostics.some((item) => item.code === 'parse-error' && item.severity === 'error'));

console.log(JSON.stringify({
  jsonPathAdversarialCases: pathCases.length,
  patchRoundtrip: true,
  symbolIdentityCollisionSafe: true,
  refactorRuleIdentityCollisionSafe: true,
  emptyRenameRejected: true,
  fieldMatchIdentityCollisionSafe: true,
  diagnosticSeverityEscalationSafe: true,
  malformedFileIsolation: true,
}, null, 2));
