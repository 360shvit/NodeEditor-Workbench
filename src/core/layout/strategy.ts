import type { ProjectFile } from '../types.js';
import type { LayoutEngineSettings, LayoutFileProposal, LayoutProposal, LayoutStrategy } from './types.js';

export type LayoutFileProposalBuilder = (file: ProjectFile, settings: LayoutEngineSettings) => LayoutFileProposal;
export type LayoutProposalBuilder = (files: ProjectFile[], settings: LayoutEngineSettings) => LayoutProposal;

export interface LayoutStrategyDefinition {
  id: LayoutStrategy;
  buildFileProposal: LayoutFileProposalBuilder;
}

/** Shared proposal envelope so strategy code only owns per-file placement. */
export function buildStrategyProposal(
  files: ProjectFile[],
  settings: LayoutEngineSettings,
  definition: LayoutStrategyDefinition,
): LayoutProposal {
  const proposals = files.map((file) => definition.buildFileProposal(file, settings));
  const warnings = proposals.flatMap((file) => file.metrics.warnings.map((warning) => `${file.filePath}: ${warning}`));
  return {
    strategy: definition.id,
    createdAt: Date.now(),
    files: proposals,
    patches: proposals.flatMap((file) => file.patches),
    blocked: proposals.some((file) => file.metrics.blocked),
    warnings,
  };
}

export function strategyRegistry(definitions: LayoutStrategyDefinition[]): ReadonlyMap<LayoutStrategy, LayoutStrategyDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}
