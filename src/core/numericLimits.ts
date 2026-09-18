export const MAX_EDITOR_LAYOUT_SCALAR = 1_000_000_000;

/**
 * Editor/layout metadata is pixel-space data. Keep it finite and far below
 * JavaScript's arithmetic overflow range before geometry code can consume it.
 */
export function editorLayoutNumber(value: unknown): number | undefined {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value) <= MAX_EDITOR_LAYOUT_SCALAR
    ? value
    : undefined;
}

export function isSafeEditorLayoutNumber(value: unknown): value is number {
  return editorLayoutNumber(value) !== undefined;
}
