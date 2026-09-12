import { useMemo, useState } from 'react';
import { findMatchingFields, jsonPathKey, stageFieldChange, type JsonPrimitive, type ProjectField, type ProjectNode } from '../core';
import { useWorkbenchStore } from '../store';
import { WorkbenchDrawer } from './WorkbenchDrawer';

export function FieldMatchesDrawer({ node, field, newValue, onClose }: {
  node: ProjectNode;
  field: ProjectField;
  newValue: JsonPrimitive;
  onClose: () => void;
}) {
  const project = useWorkbenchStore((state) => state.project)!;
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const setChangeSet = useWorkbenchStore((state) => state.setChangeSet);
  const focusNode = useWorkbenchStore((state) => state.focusNode);
  const matches = useMemo(() => findMatchingFields(project, node, field), [project, node, field]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const hasNewValue = newValue !== field.value;
  const keyFor = (item: (typeof matches)[number]) => `${item.fileId}|${jsonPathKey(item.field.jsonPath)}`;

  const stageSelected = () => {
    let next = changeSet;
    for (const item of matches) {
      if (!selected.has(keyFor(item))) continue;
      next = stageFieldChange(next, {
        fileId: item.fileId,
        filePath: item.filePath,
        nodeId: item.nodeId,
        field: item.field.key,
        jsonPath: item.field.jsonPath,
        oldValue: item.field.value,
        newValue,
        location: item.location,
        symbolType: item.field.symbolType,
        source: 'suggestion',
      });
    }
    setChangeSet(next);
    onClose();
  };

  return (
    <WorkbenchDrawer
      title={`Matching ${field.key} values`}
      subtitle={`${matches.length} other match(es) · suggestions only`}
      onClose={onClose}
      ariaLabel="matching values"
      className="match-drawer"
      footer={(
        <>
          <span>{selected.size} selected</span>
          <button className="primary" disabled={!selected.size || !hasNewValue} onClick={stageSelected}>{hasNewValue ? 'Stage selected' : 'Edit source value first'}</button>
        </>
      )}
    >
      <div className="drawer-section match-toolbar">
        <span><code>{String(field.value)}</code> → <code>{String(newValue)}</code></span>
        <button onClick={() => setSelected(new Set(matches.map(keyFor)))}>Select all</button>
        <button onClick={() => setSelected(new Set())}>Clear</button>
      </div>
      <div className="drawer-section">
        {matches.length === 0 && <div className="drawer-empty">No matching values found.</div>}
        {matches.map((item) => {
          const key = keyFor(item);
          return (
            <div className="match-row" key={key}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={(event) => setSelected((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(key); else next.delete(key);
                    return next;
                  })}
                />
                <span><strong>{item.filePath}</strong><small>{item.location} · {item.nodeKind} · {item.field.key}</small></span>
              </label>
              <button onClick={() => focusNode(item.fileId, item.nodeId, item.location)}>Open</button>
            </div>
          );
        })}
      </div>
    </WorkbenchDrawer>
  );
}
