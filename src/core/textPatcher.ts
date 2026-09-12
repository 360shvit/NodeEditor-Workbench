import type { Change, JsonPrimitive, ScalarSpan } from './types.js';
import { jsonPathKey } from './jsonPath.js';
export { jsonPathKey } from './jsonPath.js';

class JsonSpanScanner {
  private position = 0;
  readonly spans = new Map<string, ScalarSpan>();

  constructor(private readonly text: string) {}

  scan(): Map<string, ScalarSpan> {
    this.skipWhitespace();
    this.parseValue([]);
    return this.spans;
  }

  private skipWhitespace() {
    while (/\s/.test(this.text[this.position] ?? '')) this.position += 1;
  }

  private parseValue(path: Array<string | number>): void {
    this.skipWhitespace();
    const start = this.position;
    const char = this.text[this.position];
    if (char === '{') {
      this.parseObject(path);
      return;
    }
    if (char === '[') {
      this.parseArray(path);
      return;
    }
    if (char === '"') {
      this.parseStringToken();
      this.spans.set(jsonPathKey(path), { start, end: this.position });
      return;
    }
    this.parsePrimitiveToken();
    this.spans.set(jsonPathKey(path), { start, end: this.position });
  }

  private parseObject(path: Array<string | number>) {
    this.position += 1; // {
    this.skipWhitespace();
    if (this.text[this.position] === '}') { this.position += 1; return; }
    while (this.position < this.text.length) {
      this.skipWhitespace();
      const keyStart = this.position;
      this.parseStringToken();
      const key = JSON.parse(this.text.slice(keyStart, this.position)) as string;
      this.skipWhitespace();
      if (this.text[this.position] !== ':') throw new Error(`Expected ':' at ${this.position}`);
      this.position += 1;
      this.parseValue([...path, key]);
      this.skipWhitespace();
      const char = this.text[this.position];
      if (char === '}') { this.position += 1; return; }
      if (char !== ',') throw new Error(`Expected ',' or '}' at ${this.position}`);
      this.position += 1;
    }
    throw new Error('Unexpected end of JSON object.');
  }

  private parseArray(path: Array<string | number>) {
    this.position += 1; // [
    this.skipWhitespace();
    if (this.text[this.position] === ']') { this.position += 1; return; }
    let index = 0;
    while (this.position < this.text.length) {
      this.parseValue([...path, index]);
      index += 1;
      this.skipWhitespace();
      const char = this.text[this.position];
      if (char === ']') { this.position += 1; return; }
      if (char !== ',') throw new Error(`Expected ',' or ']' at ${this.position}`);
      this.position += 1;
    }
    throw new Error('Unexpected end of JSON array.');
  }

  private parseStringToken() {
    if (this.text[this.position] !== '"') throw new Error(`Expected string at ${this.position}`);
    this.position += 1;
    while (this.position < this.text.length) {
      const char = this.text[this.position];
      if (char === '\\') {
        this.position += 2;
        continue;
      }
      this.position += 1;
      if (char === '"') return;
    }
    throw new Error('Unexpected end of JSON string.');
  }

  private parsePrimitiveToken() {
    const start = this.position;
    while (this.position < this.text.length && !/[\s,\]}]/.test(this.text[this.position])) this.position += 1;
    if (this.position === start) throw new Error(`Expected primitive at ${this.position}`);
  }
}

export function indexScalarSpans(text: string): Map<string, ScalarSpan> {
  return new JsonSpanScanner(text).scan();
}

function scalarEquals(a: JsonPrimitive, b: JsonPrimitive): boolean {
  return Object.is(a, b) || a === b;
}

export function patchJsonScalars(
  sourceText: string,
  spans: Map<string, ScalarSpan>,
  changes: Change[],
): string {
  const patches = changes.map((change) => {
    const span = spans.get(jsonPathKey(change.jsonPath));
    if (!span) throw new Error(`No source span found for ${change.filePath}:${change.jsonPath.join('.')}`);
    const token = sourceText.slice(span.start, span.end);
    const parsed = JSON.parse(token) as JsonPrimitive;
    if (!scalarEquals(parsed, change.oldValue)) {
      throw new Error(`Source changed before apply at ${change.filePath}:${change.jsonPath.join('.')}`);
    }
    return { ...span, replacement: JSON.stringify(change.newValue) };
  }).sort((a, b) => b.start - a.start);

  let text = sourceText;
  for (const patch of patches) {
    text = `${text.slice(0, patch.start)}${patch.replacement}${text.slice(patch.end)}`;
  }
  return text;
}
