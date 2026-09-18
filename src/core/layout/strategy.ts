import { isSafeEditorLayoutNumber } from '../numericLimits.js';
import type { ProjectFile } from '../types.js';
import { validateLayoutEngineSettings } from './limits.js';
import type { LayoutEngineSettings, LayoutFileProposal, LayoutProposal, LayoutScalarPatch, LayoutStrategy } from './types.js';

export type LayoutFileProposalBuilder = (file: ProjectFile, settings: LayoutEngineSettings) => LayoutFileProposal;
export type LayoutProposalBuilder = (files: ProjectFile[], settings: LayoutEngineSettings) => LayoutProposal;

export interface LayoutStrategyDefinition {
  id: LayoutStrategy;
  buildFileProposal: LayoutFileProposalBuilder;
}

function assertPatchScalarSafe(patch: LayoutScalarPatch, side: 'oldValue' | 'newValue'): void {
  const value = patch[side];
  if (typeof value !== 'number') return;
  if (!isSafeEditorLayoutNumber(value)) {
    throw new RangeError(`${patch.filePath}: layout ${side} for ${patch.entityKind} ${patch.entityId} ${patch.field} is outside the safe editor range.`);
  }
}

/** Shared proposal envelope so strategy code only owns per-file placement. */
export function buildStrategyProposal(
  files: ProjectFile[],
  settings: LayoutEngineSettings,
  definition: LayoutStrategyDefinition,
): LayoutProposal {
  validateLayoutEngineSettings(settings);
  const proposals = files.map((file) => definition.buildFileProposal(file, settings));
  const patches = proposals.flatMap((file) => file.patches);
  for (const patch of patches) {
    assertPatchScalarSafe(patch, 'oldValue');
    assertPatchScalarSafe(patch, 'newValue');
  }
  const warnings = proposals.flatMap((file) => file.metrics.warnings.map((warning) => `${file.filePath}: ${warning}`));
  return {
    strategy: definition.id,
    createdAt: Date.now(),
    files: proposals,
    patches,
    blocked: proposals.some((file) => file.metrics.blocked),
    warnings,
  };
}

export function strategyRegistry(definitions: LayoutStrategyDefinition[]): ReadonlyMap<LayoutStrategy, LayoutStrategyDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}
