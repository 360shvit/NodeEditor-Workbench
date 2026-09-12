import assert from 'node:assert/strict';
import fs from 'node:fs';

const native = fs.readFileSync('src-tauri/src/main.rs', 'utf8');
const start = native.indexOf('fn parses_complete_reference_worldgen_report_block()');
const end = native.indexOf('fn ignores_incomplete_newest_worldgen_performance_report()', start);
assert.ok(start >= 0 && end > start, 'reference WorldGen native test fixture must exist');
const testBlock = native.slice(start, end);

// Rust raw strings do not interpret \\t. The reference fixture deliberately uses
// escaped indentation, so it must be a normal string literal or the parser test is
// guaranteed to fail before exercising the real report contract.
assert.doesNotMatch(testBlock, /let fixture = r#+"/);
assert.match(testBlock, /let fixture = "\[2026\/09\/08 15:23:40/);
assert.ok(testBlock.includes('\\tContent Generation: 58.55 ms'));
assert.ok(testBlock.includes('\\t\\tAccess Initialization: 0.452 ms'));
assert.match(testBlock, /parse_worldgen_report\(&lines, 0\)\.expect\("complete reference report"\)/);

const interpretedIndentation = testBlock
  .replaceAll('\\t', '\t')
  .split('\n')
  .filter((line) => line.includes('Content Generation:') || line.includes('Access Initialization:'));
assert.ok(interpretedIndentation.some((line) => line.startsWith('\tContent Generation:')));
assert.ok(interpretedIndentation.some((line) => line.startsWith('\t\tAccess Initialization:')));

console.log('v0.11.32 native safety fixture contract: PASS');
