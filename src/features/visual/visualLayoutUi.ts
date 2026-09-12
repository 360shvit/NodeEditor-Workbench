import { buildEditorMetadataForFile, type ProjectFile } from '../../core';
import type { LayoutSpacingPreset, VisualLayoutSettings } from '../../store';

export const spacingDefaults: Record<Exclude<LayoutSpacingPreset, 'custom'>, { horizontalGap: number; verticalGap: number; alignmentTolerance: number }> = {
  compact: { horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100 },
  normal: { horizontalGap: 50, verticalGap: 50, alignmentTolerance: 100 },
  spacious: { horizontalGap: 100, verticalGap: 100, alignmentTolerance: 100 },
};

export function graphFileInfo(file: ProjectFile) {
  const metadata = buildEditorMetadataForFile(file);
  const positioned = file.nodes.filter((node) => metadata.nodes.get(node.id)?.position).length;
  return { positioned, eligible: file.nodes.length > 0 && positioned > 0 };
}

export function presetLabel(preset: LayoutSpacingPreset) {
  if (preset === 'compact') return 'Compact';
  if (preset === 'normal') return 'Normal';
  if (preset === 'spacious') return 'Spacious';
  return 'Custom';
}

export function strategyDescription(strategy: VisualLayoutSettings['strategy']) {
  if (strategy === 'normalize') return 'Rigid origin-only translation: root to (0,0), every existing position moves by the same offset.';
  if (strategy === 'dag-rebuild') return 'Full topology rebuild: long chains stay on a main lane while fork side-branches follow Auto, Up, Down or semantic Type placement.';
  return 'Preserves the author sketch while cleaning spacing, routing, rows, columns and pixel alignment.';
}
