import type { Change, ChangeSet, RefactorRule } from './types.js';
import { jsonPathKey } from './jsonPath.js';

export function emptyChangeSet(): ChangeSet {
  return { changes: [], rules: [] };
}

export function upsertChange(changeSet: ChangeSet, change: Change): ChangeSet {
  const key = `${change.fileId}|${jsonPathKey(change.jsonPath)}`;
  const changes = changeSet.changes.filter((item) => `${item.fileId}|${jsonPathKey(item.jsonPath)}` !== key);
  changes.push(change);
  return { ...changeSet, changes };
}

export function addRule(changeSet: ChangeSet, rule: RefactorRule): ChangeSet {
  const rules = changeSet.rules.filter((item) => item.id !== rule.id);
  rules.push(rule);
  return { ...changeSet, rules };
}

export function removeChange(changeSet: ChangeSet, changeId: string): ChangeSet {
  return { ...changeSet, changes: changeSet.changes.filter((change) => change.id !== changeId) };
}

export function removeRule(changeSet: ChangeSet, ruleId: string): ChangeSet {
  return { ...changeSet, rules: changeSet.rules.filter((rule) => rule.id !== ruleId) };
}
