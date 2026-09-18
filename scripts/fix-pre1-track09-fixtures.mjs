import fs from 'node:fs';

const path = 'src-tauri/src/main.rs';
let source = fs.readFileSync(path, 'utf8');
const replacements = [
  ['b"{"value":2}"', 'br#"{"value":2}"#'],
  ['b"{"value":3}"', 'br#"{"value":3}"#'],
  ['b"{"value":4}"', 'br#"{"value":4}"#'],
  ['"{"value":1}".to_string()', 'r#"{"value":1}"#.to_string()'],
  ['"{"value":3}".to_string()', 'r#"{"value":3}"#.to_string()'],
  ['"{"value":2}"', 'r#"{"value":2}"#'],
];
for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Missing malformed Track 09 fixture literal: ${before}`);
  source = source.split(before).join(after);
}
fs.writeFileSync(path, source);
console.log('Normalized Track 09 Rust JSON fixture literals.');
