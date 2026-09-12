import type { DagBranchDirection } from './types.js';

export type LayoutPlacementReasonCode =
  | 'root-origin'
  | 'dag-depth-column'
  | 'dag-main-chain'
  | 'dag-side-auto-up'
  | 'dag-side-auto-down'
  | 'dag-side-forced-up'
  | 'dag-side-forced-down'
  | 'dag-side-density-up'
  | 'dag-side-other-down'
  | 'author-tree'
  | 'author-grid'
  | 'routing-rescue'
  | 'safety-blocked';

export class PlacementReasonBook {
  private readonly values = new Map<string, Set<LayoutPlacementReasonCode>>();
  add(nodeId: string, reason: LayoutPlacementReasonCode): void {
    const set = this.values.get(nodeId) ?? new Set<LayoutPlacementReasonCode>();
    set.add(reason);
    this.values.set(nodeId, set);
  }
  reasonsFor(nodeId: string): LayoutPlacementReasonCode[] {
    return [...(this.values.get(nodeId) ?? [])];
  }
  entries(): Array<[string, LayoutPlacementReasonCode[]]> {
    return [...this.values.entries()].map(([nodeId, reasons]) => [nodeId, [...reasons]]);
  }
}

export function dagSidePlacementReason(
  branchDirection: DagBranchDirection,
  isDensityBranch: boolean,
  resolvedSide: 'up' | 'down',
): LayoutPlacementReasonCode {
  if (branchDirection === 'type') return isDensityBranch ? 'dag-side-density-up' : 'dag-side-other-down';
  if (branchDirection === 'up') return 'dag-side-forced-up';
  if (branchDirection === 'down') return 'dag-side-forced-down';
  return resolvedSide === 'up' ? 'dag-side-auto-up' : 'dag-side-auto-down';
}
