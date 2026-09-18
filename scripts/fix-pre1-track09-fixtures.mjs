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

for (const invalid of ['br#r#"', 'b"{"value":', '"{"value":1}".to_string()', '"{"value":3}".to_string()']) {
  if (source.includes(invalid)) throw new Error(`Track 09 fixture normalization left invalid literal: ${invalid}`);
}

fs.writeFileSync(path, source);
console.log('Normalized Track 09 Rust JSON fixture literals.');
