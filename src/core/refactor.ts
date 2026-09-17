import { addRule, upsertChange } from './changeSet.js';
import { buildProject } from './project.js';
import { symbolKey } from './symbolIndex.js';
import { patchJsonScalars } from './textPatcher.js';
import { jsonPathKey } from './jsonPath.js';
import type {
  ApplyResult,
  Change,
  ChangeSet,
  ProjectModel,
  RenameSymbolOptions,
  SourceFileInput,
} from './types.js';

function changeId(fileId: string, path: Array<string | number>): string {
  return `${fileId}:${jsonPathKey(path)}`;
}

function occurrenceToChange(
  occurrence: { fileId: string; filePath: string; nodeId: string; field: string; jsonPath: Array<string | number>; location: 'live' | 'floating'; symbolType: string },
  oldValue: string,
  newValue: string,
  source: Change['source'],
): Change {
  return {
    id: changeId(occurrence.fileId, occurrence.jsonPath),
    fileId: occurrence.fileId,
    filePath: occurrence.filePath,
    nodeId: occurrence.nodeId,
    field: occurrence.field,
    jsonPath: occurrence.jsonPath,
    oldValue,
    newValue,
    location: occurrence.location,
    source,
    symbolType: occurrence.symbolType,
  };
}

export function renameSymbol(
  project: ProjectModel,
  changeSet: ChangeSet,
  symbolType: string,
  oldName: string,
  newName: string,
  options: RenameSymbolOptions = {},
): ChangeSet {
  if (!newName.trim()) throw new Error('Symbol rename target must be non-empty.');
  const record = project.symbolIndex.get(symbolKey(symbolType, oldName));
  if (!record) return changeSet;

  const includeLive = options.includeLive ?? true;
  const includeFloating = options.includeFloating ?? false;
  const includeDefinition = options.includeDefinition ?? true;
  const includeReferences = options.includeReferences ?? true;
  const allowed = (location: 'live' | 'floating') => location === 'live' ? includeLive : includeFloating;

  let next = changeSet;
  if (includeDefinition) {
    for (const occurrence of record.definitions.filter((item) => allowed(item.location))) {
      next = upsertChange(next, occurrenceToChange(occurrence, oldName, newName, 'manual'));
    }
  }
  if (includeReferences) {
    for (const occurrence of record.references.filter((item) => allowed(item.location))) {
      next = upsertChange(next, occurrenceToChange(occurrence, oldName, newName, 'symbol-propagation'));
    }
  }

  next = addRule(next, {
    id: JSON.stringify(['symbol', symbolType, oldName]),
    kind: 'symbolRename',
    symbolType,
    oldValue: oldName,
    newValue: newName,
  });
  return next;
}

export function stageFieldChange(
  changeSet: ChangeSet,
  change: Omit<Change, 'id' | 'source'> & { source?: Change['source'] },
): ChangeSet {
  return upsertChange(changeSet, {
    ...change,
    id: changeId(change.fileId, change.jsonPath),
    source: change.source ?? 'manual',
  });
}

export function applyChangeSet(project: ProjectModel, changeSet: ChangeSet): ApplyResult {
  const changesByFile = new Map<string, Change[]>();
  for (const change of changeSet.changes) {
    const list = changesByFile.get(change.fileId) ?? [];
    list.push(change);
    changesByFile.set(change.fileId, list);
  }

  const inputs: SourceFileInput[] = project.files.map((file) => ({
    path: file.path,
    text: patchJsonScalars(file.sourceText, file.scalarSpans, changesByFile.get(file.id) ?? []),
    workspaceHint: file.workspace,
  }));

  return {
    project: buildProject(inputs, project.inventoryPaths),
    changedFileIds: [...changesByFile.keys()],
  };
}

export function suggestRule(changeSet: ChangeSet, symbolType: string | undefined, value: unknown): string | undefined {
  if (!symbolType || typeof value !== 'string') return undefined;
  const rule = changeSet.rules.find(
    (item) => item.kind === 'symbolRename' && item.symbolType === symbolType && item.oldValue === value,
  );
  return typeof rule?.newValue === 'string' ? rule.newValue : undefined;
}
