import { useEffect, useMemo, useState } from 'react';
import {
  findMatchingFields,
  jsonPathKey,
  stageFieldChange,
  suggestRule,
  symbolKey,
  type JsonPrimitive,
  type ProjectField,
  type ProjectNode,
  type SymbolRecord,
} from '../core';
import { useWorkbenchStore } from '../store';
import { fieldVisible } from '../features/inspector/visibility';
import { FieldMatchesDrawer } from './FieldMatchesDrawer';
import { RenameSymbolDialog, type RenameRequest } from './RenameSymbolDialog';
import { useWorkbenchPaneId } from '../workbench/WorkbenchPaneContext';
import { LucideIcon } from './LucideIcon';

function pathText(path: Array<string | number>): string {
  return path.length ? path.map((part) => typeof part === 'number' ? `[${part}]` : part).join('.').replace('.[', '[') : '$';
}

async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); } catch { /* clipboard can be denied; no mutation required */ }
}

export function NodeCard({ node, onShowReferences, matchedFieldPaths = [], matchedNodeMetadata = false, matchedFieldLabel = 'match', matchedNodeLabel = 'query match' }: {
  node: ProjectNode;
  onShowReferences: (record: SymbolRecord) => void;
  matchedFieldPaths?: string[];
  matchedNodeMetadata?: boolean;
  matchedFieldLabel?: string;
  matchedNodeLabel?: string;
}) {
  const paneId = useWorkbenchPaneId();
  const project = useWorkbenchStore((state) => state.project)!;
  const editing = useWorkbenchStore((state) => state.editing);
  const filters = useWorkbenchStore((state) => state.filters);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const focusedNode = useWorkbenchStore((state) => state.focusedNode);
  const activePane = useWorkbenchStore((state) => state.activePane);
  const setChangeSet = useWorkbenchStore((state) => state.setChangeSet);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [renameRequest, setRenameRequest] = useState<RenameRequest>();
  const [matchField, setMatchField] = useState<{ field: ProjectField; newValue: JsonPrimitive }>();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (activePane === paneId && focusedNode?.fileId === node.fileId && focusedNode.nodeId === node.id) setCollapsed(false);
  }, [activePane, focusedNode, node.fileId, node.id, paneId]);

  const visibleFields = useMemo(() => node.fields.filter((field) => fieldVisible(field, filters)), [node.fields, filters]);
  const matchedPaths = useMemo(() => new Set(matchedFieldPaths), [matchedFieldPaths]);
  if (!visibleFields.length) return null;

  const file = project.fileMap.get(node.fileId)!;
  const primaryField = visibleFields.find((field) => field.category === 'export')
    ?? visibleFields.find((field) => field.category === 'import')
    ?? visibleFields.find((field) => field.category === 'seed');

  const pendingFor = (field: ProjectField) => changeSet.changes.find(
    (change) => change.fileId === node.fileId && jsonPathKey(change.jsonPath) === jsonPathKey(field.jsonPath),
  );

  const parseValue = (field: ProjectField, rawNewValue: string): JsonPrimitive | undefined => {
    if (typeof field.value === 'number') {
      const parsed = Number(rawNewValue);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (typeof field.value === 'boolean') {
      if (rawNewValue !== 'true' && rawNewValue !== 'false') return undefined;
      return rawNewValue === 'true';
    }
    if (field.value === null) return rawNewValue === 'null' ? null : rawNewValue;
    return rawNewValue;
  };

  const stage = (field: ProjectField, rawNewValue: string) => {
    const newValue = parseValue(field, rawNewValue);
    if (newValue === undefined || newValue === field.value) return;

    if (field.category === 'export' && field.symbolType && typeof field.value === 'string' && typeof newValue === 'string') {
      setRenameRequest({ node, field, newName: newValue });
      return;
    }

    setChangeSet(stageFieldChange(changeSet, {
      fileId: node.fileId,
      filePath: file.path,
      nodeId: node.id,
      field: field.key,
      jsonPath: field.jsonPath,
      oldValue: field.value,
      newValue,
      location: node.location,
      symbolType: field.symbolType,
    }));
  };

  return (
    <>
      <article className={`node-card ${node.location} ${collapsed ? 'collapsed' : ''}`} id={`node-${paneId}-${encodeURIComponent(node.id)}`}>
        <header>
          <div className="node-heading">
            <strong>{node.nodeKind}</strong>
            {primaryField && <span className="node-primary-value">{String(primaryField.value)}</span>}
            {node.type !== node.nodeKind && <small>{node.type}</small>}
          </div>
          <div className="node-header-actions">
            <div className="node-header-badges">
              {matchedNodeMetadata && <span className="search-match-badge">{matchedNodeLabel}</span>}
              <span className={`location-badge ${node.location}`}>{node.location}</span>
            </div>
            <button
              className="node-collapse-button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${node.nodeKind} node`}
              data-tooltip={collapsed ? 'Expand node' : 'Collapse node'}
            >
              <LucideIcon name={collapsed ? 'chevron-right' : 'chevron-down'} size={15} />
            </button>
          </div>
        </header>
        {!collapsed && <div className="field-list">
          {visibleFields.map((field) => {
            const record = field.symbolType && typeof field.value === 'string'
              ? project.symbolIndex.get(symbolKey(field.symbolType, field.value))
              : undefined;
            const pending = pendingFor(field);
            const suggestion = suggestRule(changeSet, field.symbolType, field.value);
            const draftKey = jsonPathKey(field.jsonPath);
            const displayValue = pending?.newValue ?? field.value;
            const matches = field.refactorBehavior === 'symbol' ? [] : findMatchingFields(project, node, field);
            return (
              <div className={`field-row ${matchedPaths.has(draftKey) ? 'search-match-field' : ''}`} key={draftKey}>
                <div className="field-meta">
                  <span className={`field-category ${field.category}`}>{field.category}</span>
                  <strong>{field.key}</strong>
                  {matchedPaths.has(draftKey) && <span className="search-match-badge">{matchedFieldLabel}</span>}
                </div>
                <div className="field-value">
                  <span className="current-value" data-tooltip={String(field.value)}>{String(field.value)}</span>
                  {editing && (
                    <>
                      <span className="arrow">→</span>
                      <input
                        value={drafts[draftKey] ?? String(displayValue)}
                        onChange={(event) => setDrafts((current) => ({ ...current, [draftKey]: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                        onBlur={(event) => {
                          if (event.target.value !== String(displayValue)) stage(field, event.target.value);
                        }}
                      />
                    </>
                  )}
                </div>
                <div className="field-actions">
                  {record && field.category === 'export' && (
                    <button onClick={() => onShowReferences(record)}>{record.references.length} refs</button>
                  )}
                  {record && field.category === 'import' && (
                    <button className={record.definitions.length ? '' : 'warning-button'} onClick={() => onShowReferences(record)}>
                      {record.definitions.length ? `${record.definitions.length} def` : 'unresolved'}
                    </button>
                  )}
                  {matches.length > 0 && (
                    <button onClick={() => setMatchField({ field, newValue: pending?.newValue ?? field.value })}>{matches.length} matches</button>
                  )}
                  {editing && field.category === 'import' && suggestion && suggestion !== String(displayValue) && (
                    <button className="suggestion" onClick={() => stage(field, suggestion)}>Use suggestion</button>
                  )}
                  {pending && <span className="pending-badge">staged</span>}
                </div>
                {editing && field.category === 'seed' && (
                  <small className="field-help warning">Literal only. Matching seeds can be selected manually; they never propagate as symbol references.</small>
                )}
                {editing && field.category === 'property' && matches.length > 0 && (
                  <small className="field-help">Same {node.nodeKind}.{field.key} value found elsewhere. Matching values are suggestions only.</small>
                )}
              </div>
            );
          })}
        </div>}
        {!collapsed && <details className="technical-details">
          <summary>Technical</summary>
          <div><span>Node ID</span><code>{node.id}</code><button onClick={() => copy(node.id)}>Copy</button></div>
          <div><span>JSON path</span><code>{pathText(node.jsonPath)}</code><button onClick={() => copy(pathText(node.jsonPath))}>Copy</button></div>
        </details>}
      </article>
      {renameRequest && <RenameSymbolDialog request={renameRequest} onClose={() => setRenameRequest(undefined)} />}
      {matchField && (
        <FieldMatchesDrawer
          node={node}
          field={matchField.field}
          newValue={matchField.newValue}
          onClose={() => setMatchField(undefined)}
        />
      )}
    </>
  );
}
