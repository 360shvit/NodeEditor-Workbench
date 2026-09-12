import type { LayoutRect } from './types.js';

export function rectRight(rect: LayoutRect): number { return rect.x + rect.width; }
export function rectBottom(rect: LayoutRect): number { return rect.y + rect.height; }

export function rectContains(outer: LayoutRect, inner: LayoutRect, tolerance = 0.5): boolean {
  return inner.x >= outer.x - tolerance
    && inner.y >= outer.y - tolerance
    && rectRight(inner) <= rectRight(outer) + tolerance
    && rectBottom(inner) <= rectBottom(outer) + tolerance;
}

export function rectsOverlap(a: LayoutRect, b: LayoutRect, tolerance = 0): boolean {
  return a.x < rectRight(b) - tolerance
    && rectRight(a) > b.x + tolerance
    && a.y < rectBottom(b) - tolerance
    && rectBottom(a) > b.y + tolerance;
}

export function unionRects(rects: LayoutRect[]): LayoutRect | undefined {
  if (!rects.length) return undefined;
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map(rectRight));
  const bottom = Math.max(...rects.map(rectBottom));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function overlapPairs<T extends { id: string; rect: LayoutRect }>(items: T[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (rectsOverlap(items[i].rect, items[j].rect)) pairs.push([items[i].id, items[j].id]);
    }
  }
  return pairs;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
