import assert from 'node:assert/strict';
import fs from 'node:fs';

const state = fs.readFileSync('src/features/fileState.ts', 'utf8');
const indicators = fs.readFileSync('src/components/FileStateIndicators.tsx', 'utf8');
const store = fs.readFileSync('src/store.ts', 'utf8');
const explorer = fs.readFileSync('src/components/ProjectExplorer.tsx', 'utf8');
const tabs = fs.readFileSync('src/components/FileTabs.tsx', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');

for (const token of ['stagedCount', 'diagnosticSeverity', 'externallyReloaded', 'externalConflict']) {
  assert.match(state, new RegExp(token));
}
assert.match(store, /invalidatedChangePaths/);
assert.match(store, /filter\(\(change\) => pathAffected\(change\.filePath, changed\)\)/);
assert.match(explorer, /FileStateIndicators/);
assert.match(explorer, /buildFileUiStateIndex/);
assert.match(tabs, /FileStateIndicators/);
assert.match(indicators, /data-state="staged"/);
assert.match(indicators, /data-state="diagnostic"/);
assert.match(indicators, /data-state="external-conflict"/);
assert.match(indicators, /data-state="external-reload"/);
assert.match(styles, /v0\.10\.6 unified file-state indicators/);

// State remains derived/runtime-only. It must not be written into Project Session persistence.
const persistence = fs.readFileSync('src/projects/projectPersistence.ts', 'utf8');
assert.doesNotMatch(persistence, /FileUiState|externalConflict|stagedCount/);
console.log('v0.10.6 file-state model checks passed');
