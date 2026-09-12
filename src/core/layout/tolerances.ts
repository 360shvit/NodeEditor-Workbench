import type { LayoutEngineSettings } from './types.js';

function cleanNumber(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Port/inline classification tolerance. */
export function connectionPlaneTolerance(settings: LayoutEngineSettings): number {
  return Math.max(0, settings.alignmentTolerance);
}

/** Legacy floater ordering threshold, named separately so it can diverge later. */
export function floaterRowTolerance(settings: LayoutEngineSettings): number {
  return settings.alignmentTolerance;
}

/** Small visible node-top jitter that may be snapped into one exact row. */
export function visualRowTolerance(settings: LayoutEngineSettings): number {
  const base = connectionPlaneTolerance(settings);
  if (base === 0) return 0;
  return cleanNumber(Math.min(24, Math.max(4, base * 0.25)));
}

/** Author Grid clustering and movement tolerances are named independently. */
export function authorGuideClusterTolerance(settings: LayoutEngineSettings): number {
  return cleanNumber(Math.min(28, Math.max(8, settings.alignmentTolerance * 0.32)));
}
export function authorGuideShiftLimit(settings: LayoutEngineSettings): number {
  return cleanNumber(Math.max(40, Math.min(140, settings.alignmentTolerance * 1.75)));
}
export function authorRowShiftLimit(settings: LayoutEngineSettings): number {
  return cleanNumber(Math.max(24, Math.min(72, settings.alignmentTolerance)));
}
export function pixelAlignmentTolerance(settings: LayoutEngineSettings): number {
  return cleanNumber(Math.min(48, Math.max(10, settings.alignmentTolerance * 0.45)));
}
export function pixelAlignmentShiftLimit(settings: LayoutEngineSettings): number {
  return cleanNumber(Math.min(64, Math.max(20, settings.alignmentTolerance * 0.65)));
}
