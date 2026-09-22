// Diagnostics accept metadata, never arbitrary project values or error text.
// Keep these fields aligned with the reviewed instrumentation call sites.
const scalarFields = new Set(`collisions stagedChanges limit includeProjectPaths canonicalizationChecks fastPathCandidates fastPathUsed inputCount symbolCount projectDiagnostics nodeCount fileCount patchCount resultFiles blocked inventoryFiles semanticInputs projectFiles nodes symbols semanticReferences environmentReferences prefabReferences workspaces discoveryRoots restoredTabs restoredNavigationEntries changedPathCount invalidatedChanges invalidatedHistory pendingChanges changeCount changedFiles conflicts outputFiles written recent enabled desktop persisted sidebarWidth splitRatio splitViewEnabled minSidebarWidth maxSidebarWidth minSplitRatio maxSplitRatio uiScale percent size position maximized assigned descriptorCount rootCount eligibleFiles selectionMode visibleRows expandedFolders queryLength semanticFiles resourceFiles zoom rootIndex densityDepth includeResources edgeCount directories visitedEntries symlinkEntries reparsePointEntries workspaceMarkers candidateFiles semanticBytes probeBytes requestMs nativeTotalMs status durationMs line column count diagnosticDataOmitted`.split(' '));
const pathFields = new Set(['path', 'paths', 'filePath', 'filePaths', 'changedPaths']);
const containers = new Set(['metadata', 'counts', 'timings']);
const stringFields: Record<string, readonly string[]> = {
  source: ['pointer', 'keyboard', 'settings', 'reset', 'restore', '<app-source>'],
  appliedBy: ['native', 'css', 'css-fallback'],
  host: ['desktop', 'browser'], sourceKind: ['directory', 'snapshot'],
  mode: ['apply', 'project-copy', 'zip-export'],
  kind: ['switch-project', 'close-project', 'exit-app'],
  outcome: ['blocked-conflict', 'blocked-late-conflict', 'blocked-collision', 'applied', 'exported', 'cancelled'],
  status: ['failed', 'completed'], classification: ['normal', 'noteworthy', 'slow', 'very-slow'],
  strategy: ['normalize', 'author-normalize', 'dag-rebuild'],
  reason: ['workspace-authority-changed', 'project-model-miss', 'pan', 'zoom', 'fit', 'reset', 'restore', 'root-change'],
  scopeKind: ['builtin', 'all', 'project', 'workspace', 'folder', 'file', 'selection'],
  rootKind: ['none', 'worldstructure', 'biome', 'density', 'WorldStructure', 'Biome', 'Density'],
  retainedPane: ['primary', 'secondary'], trackedWindow: ['main'],
  channel: ['stable', 'preview'], resourceKind: ['environment', 'prefab'],
  command: ['quickOpen', 'showExplorer', 'showSearch', 'openDiagnostics', 'openChanges', 'openLayout', 'openWorldgenPerformance', 'openProjectGraph', 'navigateBack', 'navigateForward', 'reopenClosedTab'],
  errorName: ['Error', 'TypeError', 'SyntaxError', 'RangeError', 'ReferenceError', 'URIError', 'EvalError', 'AbortError', 'UnknownError'],
};

export function safeDiagnosticName(value: string): string {
  // Internal operation names may include a fixed local bridge route, never queries.
  if (/^[A-Za-z0-9_.-]+$/.test(value) || /^desktop\.request:\/api\/[a-z-]+(?:\/[a-z-]+)*$/.test(value)) return value.slice(0, 120);
  return 'diagnostic.redacted-name';
}

export function scrubAbsolutePaths(value: string): string {
  // A path field is either an explicitly relative path or entirely redacted.
  // Do not try to guess where a space-containing absolute path ends.
  const normalized = value.replaceAll('\\', '/').trim();
  if (normalized.includes(':') || normalized.startsWith('/') || normalized.split('/').includes('..') || /[\x00-\x1f\x7f]/.test(value)) return '<local-path>';
  return value.slice(0, 600);
}

export function safeDiagnosticData(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const seen = new WeakSet<object>();
  let remaining = 80;
  function visit(input: Record<string, unknown>, depth: number): Record<string, unknown> {
    if (depth >= 4 || seen.has(input)) return {};
    seen.add(input);
    const output: Record<string, unknown> = {};
    let keys = 0;
    for (const key in input) {
      if (!Object.hasOwn(input, key)) continue;
      if (++keys > 40 || --remaining < 0) break;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) continue; // Never execute getters while logging.
      const raw: unknown = descriptor.value;
      if (pathFields.has(key)) {
        if (typeof raw === 'string') output[key] = scrubAbsolutePaths(raw);
        else if (Array.isArray(raw)) {
          const paths: string[] = [];
          for (let i = 0; i < Math.min(raw.length, 30) && remaining > 0; i++, remaining--) {
            const item = Object.getOwnPropertyDescriptor(raw, String(i));
            if (item && 'value' in item && typeof item.value === 'string') paths.push(scrubAbsolutePaths(item.value));
          }
          output[key] = paths;
        }
      } else if (scalarFields.has(key) && (typeof raw === 'boolean' || raw === null || (typeof raw === 'number' && Number.isFinite(raw)))) output[key] = raw;
      else if (typeof raw === 'string' && Object.hasOwn(stringFields, key) && stringFields[key].includes(raw)) output[key] = raw;
      else if (key === 'operation' && typeof raw === 'string') output[key] = safeDiagnosticName(raw);
      else if (key === 'endpoint' && typeof raw === 'string' && /^\/api\/[a-z-]+(?:\/[a-z-]+)*$/.test(raw)) output[key] = raw.slice(0, 120);
      else if ((key === 'version' || key === 'expectedVersion') && typeof raw === 'string' && /^\d{1,5}\.\d{1,5}\.\d{1,5}(?:-[a-z0-9.-]{1,30})?$/.test(raw)) output[key] = raw;
      else if (containers.has(key) && raw && typeof raw === 'object' && !Array.isArray(raw)) output[key] = visit(raw as Record<string, unknown>, depth + 1);
    }
    return output;
  }
  // Unexpected proxies must not turn error handling into another uncaught error.
  try { return data ? visit(data, 0) : undefined; } catch { return { diagnosticDataOmitted: true }; }
}

export function diagnosticErrorName(error: unknown): string {
  try {
    if (error instanceof Error && stringFields.errorName.includes(error.name)) return error.name;
  } catch { /* An untrusted thrown object may have throwing accessors. */ }
  return 'UnknownError';
}
