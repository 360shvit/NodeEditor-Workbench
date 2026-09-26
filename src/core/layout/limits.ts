import type { LayoutEngineSettings } from './types.js';

/**
 * Deliberately generous UI/core ceiling. Real presets are <= 100 px; this
 * ceiling exists to make arithmetic and generated JSON fail closed on corrupt
 * persisted state or adversarial callers without constraining normal layouts.
 */
export const MAX_LAYOUT_SETTING = 1_000_000;

const STRATEGIES = new Set(['normalize', 'author-normalize', 'dag-rebuild']);
const FLOATER_MODES = new Set(['ignore', 'pack', 'quarantine']);
const DAG_DIRECTIONS = new Set(['auto', 'up', 'down', 'type']);

function requireBoundedSetting(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > MAX_LAYOUT_SETTING) {
    throw new RangeError(`Layout ${name} must be a finite number between 0 and ${MAX_LAYOUT_SETTING}.`);
  }
}

export function validateLayoutEngineSettings(settings: LayoutEngineSettings): void {
  if (!STRATEGIES.has(settings.strategy)) throw new RangeError(`Unknown layout strategy: ${String(settings.strategy)}`);
  requireBoundedSetting('horizontalGap', settings.horizontalGap);
  requireBoundedSetting('verticalGap', settings.verticalGap);
  requireBoundedSetting('alignmentTolerance', settings.alignmentTolerance);
  if (typeof settings.includeLive !== 'boolean') throw new TypeError('Layout includeLive must be boolean.');
  if (!FLOATER_MODES.has(settings.floaterMode)) throw new RangeError(`Unknown floater mode: ${String(settings.floaterMode)}`);
  if (settings.dagBranchDirection !== undefined && !DAG_DIRECTIONS.has(settings.dagBranchDirection)) {
    throw new RangeError(`Unknown DAG branch direction: ${String(settings.dagBranchDirection)}`);
  }
}
