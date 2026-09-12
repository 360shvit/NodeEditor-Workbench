import { useMemo } from 'react';
import { ToolSidebar } from '../../components/ToolSidebar';
import { useWorkbenchStore, type VisualLayoutSettings } from '../../store';
import { graphFileInfo, presetLabel, spacingDefaults, strategyDescription } from './visualLayoutUi';

function SettingToggle({ label, detail, checked, onChange, disabled = false }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`visual-layout-sidebar-toggle ${disabled ? 'disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span><strong>{label}</strong><small>{detail}</small></span>
    </label>
  );
}

export function VisualLayoutSidebar() {
  const project = useWorkbenchStore((state) => state.project);
  const selectedIds = useWorkbenchStore((state) => state.visualSelectedFileIds);
  const setSelectedIds = useWorkbenchStore((state) => state.setVisualSelectedFileIds);
  const settings = useWorkbenchStore((state) => state.visualSettings);
  const setSettings = useWorkbenchStore((state) => state.setVisualSettings);
  const requestFilePicker = useWorkbenchStore((state) => state.requestVisualLayoutFilePicker);
  const requestGenerate = useWorkbenchStore((state) => state.requestVisualLayoutGenerate);

  const rows = useMemo(() => project?.files.map((file) => ({ file, ...graphFileInfo(file) })) ?? [], [project]);
  const eligibleRows = rows.filter((row) => row.eligible);
  const eligibleIds = eligibleRows.map((row) => row.file.id);
  const selectedFiles = selectedIds.map((id) => project?.fileMap.get(id)).filter(Boolean);
  const nodeCount = selectedFiles.reduce((sum, file) => sum + (file?.nodes.length ?? 0), 0);
  const allSelected = eligibleIds.length > 0 && eligibleIds.length === selectedIds.length && eligibleIds.every((id) => selectedIds.includes(id));

  const setSpacingPreset = (preset: 'compact' | 'normal' | 'spacious') => setSettings({ spacingPreset: preset, ...spacingDefaults[preset] });
  const setGap = (key: 'horizontalGap' | 'verticalGap' | 'alignmentTolerance', value: number) => {
    const next = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
    setSettings({ [key]: next, spacingPreset: 'custom' } as Partial<VisualLayoutSettings>);
  };

  if (!project) return null;

  return (
    <ToolSidebar title="Layout" subtitle="Scope & proposal setup" ariaLabel="Layout tool settings" className="visual-layout-sidebar" bodyClassName="visual-layout-sidebar-body">
        <section className="visual-layout-sidebar-section">
          <div className="visual-layout-sidebar-section-title">Scope</div>
          <div className="visual-layout-sidebar-scope-status">
            <strong>{selectedIds.length}</strong><span>of {eligibleRows.length} graph files</span><small>{nodeCount} nodes selected</small>
          </div>
          <button className="primary visual-layout-sidebar-wide" disabled={!eligibleRows.length} onClick={requestFilePicker}>Choose files in Explorer…</button>
          <div className="visual-layout-sidebar-scope-actions">
            <button className={allSelected ? 'active' : ''} disabled={!eligibleRows.length} onClick={() => setSelectedIds(eligibleIds)}>All graph files</button>
            <button disabled={!selectedIds.length} onClick={() => setSelectedIds([])}>Clear</button>
          </div>
          {!eligibleRows.length && <small className="visual-layout-sidebar-help">No JSON file exposes positioned NodeEditor metadata.</small>}
        </section>

        <section className="visual-layout-sidebar-section">
          <div className="visual-layout-sidebar-section-title">Strategy</div>
          <div className="visual-layout-sidebar-strategies" role="group" aria-label="Layout strategy">
            {([
              ['normalize', 'Normalize', 'Root offset only'],
              ['author-normalize', 'Author Normalize', 'Preserve & clean'],
              ['dag-rebuild', 'DAG Rebuild', 'Topology rebuild'],
            ] as const).map(([strategy, label, detail]) => (
              <button key={strategy} className={settings.strategy === strategy ? 'active' : ''} onClick={() => setSettings({ strategy })}>
                <strong>{label}</strong><small>{detail}</small>
              </button>
            ))}
          </div>
          <small className="visual-layout-sidebar-help">{strategyDescription(settings.strategy)}</small>
        </section>

        {settings.strategy !== 'normalize' && (
          <section className="visual-layout-sidebar-section">
            <div className="visual-layout-sidebar-section-title">Spacing</div>
            <div className="visual-layout-sidebar-segments" role="group" aria-label="Spacing preset">
              {(['compact', 'normal', 'spacious'] as const).map((preset) => <button key={preset} className={settings.spacingPreset === preset ? 'active' : ''} onClick={() => setSpacingPreset(preset)}>{presetLabel(preset)}</button>)}
            </div>
            <div className="visual-layout-sidebar-number-grid">
              <label><span>Horizontal</span><input type="number" min="0" value={settings.horizontalGap} onChange={(event) => setGap('horizontalGap', Number(event.target.value))} /></label>
              <label><span>Vertical</span><input type="number" min="0" value={settings.verticalGap} onChange={(event) => setGap('verticalGap', Number(event.target.value))} /></label>
            </div>
            {settings.strategy === 'author-normalize' && (
              <label className="visual-layout-sidebar-field"><span>Connection plane tolerance</span><input type="number" min="0" value={settings.alignmentTolerance} onChange={(event) => setGap('alignmentTolerance', Number(event.target.value))} /></label>
            )}
            {settings.strategy === 'dag-rebuild' && (
              <>
                <div className="visual-layout-sidebar-section-title inline">Branches</div>
                <div className="visual-layout-sidebar-segments branches" role="group" aria-label="Branch direction">
                  {([
                    ['auto', 'Auto'], ['down', 'Down'], ['up', 'Up'], ['type', 'Type'],
                  ] as const).map(([direction, label]) => <button key={direction} className={settings.dagBranchDirection === direction ? 'active' : ''} onClick={() => setSettings({ dagBranchDirection: direction })}>{label}</button>)}
                </div>
              </>
            )}
          </section>
        )}

        <section className="visual-layout-sidebar-section">
          <div className="visual-layout-sidebar-section-title">Advanced</div>
          <SettingToggle label="Live nodes" detail={settings.strategy === 'normalize' ? 'Normalize translates all positioned metadata.' : 'Include positioned live nodes.'} checked={settings.includeLive} disabled={settings.strategy === 'normalize'} onChange={(includeLive) => setSettings({ includeLive })} />
          <SettingToggle label="Floating geometry" detail="Include floating-node geometry in coverage counters." checked={settings.includeFloating} onChange={(includeFloating) => setSettings({ includeFloating })} />
          <label className="visual-layout-sidebar-field">
            <span>Floater handling</span>
            <select disabled={settings.strategy === 'normalize'} value={settings.floaterMode} onChange={(event) => {
              const floaterMode = event.target.value as VisualLayoutSettings['floaterMode'];
              setSettings({ floaterMode, includeFloating: floaterMode === 'ignore' ? settings.includeFloating : true });
            }}>
              <option value="ignore">Ignore · origin shift only</option>
              <option value="pack">Pack · compact</option>
              <option value="quarantine">Quarantine · below live graph</option>
            </select>
          </label>
          <div className="visual-layout-sidebar-engine"><strong>Root → (0,0)</strong><span>{settings.strategy === 'normalize' ? 'Rigid metadata translation only.' : settings.strategy === 'dag-rebuild' ? 'Reader v2 topology · deterministic columns · routing safety.' : 'Reader v2 · routing-aware repair · Author Grid · pixel polish.'}</span></div>
        </section>

        <section className="visual-layout-sidebar-section visual-layout-sidebar-generate">
          <button className="primary visual-layout-sidebar-wide" disabled={!selectedFiles.length} onClick={requestGenerate}>Generate proposal</button>
          <small>Read-only generation. Staging remains in the result tab and still requires Editing On.</small>
        </section>
    </ToolSidebar>
  );
}
