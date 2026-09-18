import fs from 'node:fs';

const path = 'src-tauri/src/main.rs';
let source = fs.readFileSync(path, 'utf8');

// prepare-pre1-track09 intentionally keeps its large Rust fixture insertion simple.
// Normalize only the malformed JSON literals it produces, then repair the one
// overlap where a later string-literal replacement can occur inside an already
// normalized byte raw string. The final forms below are idempotent and compile as
// Rust raw strings.
const replacements = [
  ['b"{"value":2}"', 'br#"{"value":2}"#'],
  ['b"{"value":3}"', 'br#"{"value":3}"#'],
  ['b"{"value":4}"', 'br#"{"value":4}"#'],
  ['"{"value":1}".to_string()', 'r#"{"value":1}"#.to_string()'],
  ['"{"value":3}".to_string()', 'r#"{"value":3}"#.to_string()'],
  ['"{"value":2}"', 'r#"{"value":2}"#'],
];
for (const [before, after] of replacements) {
  if (source.includes(before)) source = source.split(before).join(after);
}

// The generic value:2 string replacement is also a substring of the already
// normalized byte raw literal. Collapse that overlap back to the canonical form.
source = source
  .split('br#r#"{"value":2}"##').join('br#"{"value":2}"#')
  .split('br#r#"{"value":3}"##').join('br#"{"value":3}"#')
  .split('br#r#"{"value":4}"##').join('br#"{"value":4}"#');

// Track 09 hardens rollback so an unsafe/non-file target is rejected during
// preflight instead of first failing when remove_file is attempted. Keep the old
// regression fixture, but assert the stronger fail-closed diagnostic.
const oldRollbackAssertion = 'assert!(error.contains("Cannot remove partially committed Apply target"));';
const hardenedRollbackAssertion = 'assert!(error.contains("Refusing to overwrite unsafe or newer Apply target"));';
if (source.includes(oldRollbackAssertion)) {
  source = source.replace(oldRollbackAssertion, hardenedRollbackAssertion);
}
if (!source.includes(hardenedRollbackAssertion)) {
  throw new Error('Track 09 rollback fixture does not assert the hardened fail-closed diagnostic.');
}

for (const invalid of ['br#r#"', 'b"{"value":', '"{"value":1}".to_string()', '"{"value":3}".to_string()']) {
  if (source.includes(invalid)) throw new Error(`Track 09 fixture normalization left invalid literal: ${invalid}`);
}

fs.writeFileSync(path, source);

// v0.11.11 originally pinned the exact one-argument exit_application signature.
// Track 09 intentionally widens that lifecycle boundary so application exit is
// serialized against an active Apply transaction. Keep the old window-state
// behavior assertion, but update it to require the stronger transaction guard.
const windowTestPath = 'scripts/test-native-window-persistence-v0.11.11.mjs';
let windowTest = fs.readFileSync(windowTestPath, 'utf8');
const oldExitAssertion = 'assert.match(rust, /fn exit_application\\(app: AppHandle\\)/);';
const hardenedExitAssertions = `assert.match(rust, /fn exit_application\\(app: AppHandle, state: State<'_, DesktopState>\\)/);\nassert.match(rust, /state\\.apply_transaction_lock\\.lock\\(\\)/);`;
if (windowTest.includes(oldExitAssertion)) {
  windowTest = windowTest.replace(oldExitAssertion, hardenedExitAssertions);
}
if (!windowTest.includes("fn exit_application\\(app: AppHandle, state: State<'_, DesktopState>\\)")) {
  throw new Error('v0.11.11 window-state regression guard was not updated for Track 09 exit serialization.');
}
fs.writeFileSync(windowTestPath, windowTest);

console.log('Normalized Track 09 Rust fixtures, rollback expectation, and lifecycle regression guard.');
