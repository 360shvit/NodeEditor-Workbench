export type JsonPath = Array<string | number>;

/**
 * Collision-free identity for a JSON path.
 *
 * Dot-joining is not safe because object keys may themselves contain dots and
 * string keys such as "0" must stay distinct from array index 0.
 */
export function jsonPathKey(path: JsonPath): string {
  return JSON.stringify(path);
}

/** Human-readable path for diagnostics only. Never use this as an identity key. */
export function jsonPathDisplay(path: JsonPath): string {
  if (!path.length) return '$';
  return `$${path.map((part) => typeof part === 'number'
    ? `[${part}]`
    : /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part)
      ? `.${part}`
      : `[${JSON.stringify(part)}]`).join('')}`;
}
