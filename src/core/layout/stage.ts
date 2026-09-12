import { stageFieldChange } from '../refactor.js';
import type { ChangeSet } from '../types.js';
import type { LayoutProposal } from './types.js';

/**
 * A layout proposal is a complete position proposal for its file scope.
 * Re-staging a new proposal therefore replaces older staged layout values for
 * those files instead of leaving stale X/Y patches behind from a prior test.
 * Non-layout refactor/manual changes are preserved.
 */
export function stageLayoutProposal(changeSet: ChangeSet, proposal: LayoutProposal): ChangeSet {
  if (proposal.blocked) return changeSet;
  const fileIds = new Set(proposal.files.map((file) => file.fileId));
  let next: ChangeSet = {
    ...changeSet,
    changes: changeSet.changes.filter((change) => !(change.source === 'layout' && fileIds.has(change.fileId))),
  };
  for (const patch of proposal.patches) {
    next = stageFieldChange(next, {
      fileId: patch.fileId,
      filePath: patch.filePath,
      nodeId: patch.entityId,
      field: patch.field,
      jsonPath: patch.jsonPath,
      oldValue: patch.oldValue,
      newValue: patch.newValue,
      location: patch.location,
      source: 'layout',
    });
  }
  return next;
}
