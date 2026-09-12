import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildLayoutProposal,
  stageLayoutProposal,
  summarizeGeometry,
  type LayoutProposal,
  type ProjectFile,
} from '../../core';
import { ExplorerSelectionDialog } from '../../components/ExplorerSelectionDialog';
import { beginPerformanceOperation, recordPerformanceDuration } from '../../support/performanceTracing';
import { graphFileInfo, presetLabel } from './visualLayoutUi';
import {
  useWorkbenchStore,
  type LayoutSpacingPreset,
  type VisualLayoutSettings,
} from '../../store';


type ProposalSettingsSnapshot = {
  strategy: VisualLayoutSettings['strategy'];
  preset: LayoutSpacingPreset;
  horizontalGap: number;
  verticalGap: number;
  alignmentTolerance: number;
  dagBranchDirection: VisualLayoutSettings['dagBranchDirection'];
};

function formatOffset(value: number) {
  return `${value >= 0 ? '+' : ''}${Math.round(value * 100) / 100}`;
}

function isUserFacingLayoutWarning(warning: string) {
  return !warning.startsWith('Reader v2 sees ');
}

function strategyLabel(strategy: VisualLayoutSettings['strategy']) {
  if (strategy === 'normalize') return 'Normalize';
  if (strategy === 'dag-rebuild') return 'DAG Rebuild';
  return 'Author Normalize';
}

export function VisualLayoutTab() {
  const project = useWorkbenchStore((state) => state.project)!;
  const projectVersion = useWorkbenchStore((state) => state.projectVersion);
  const editing = useWorkbenchStore((state) => state.editing);
  const visualSelectedFileIds = useWorkbenchStore((state) => state.visualSelectedFileIds);
  const setVisualSelectedFileIds = useWorkbenchStore((state) => state.setVisualSelectedFileIds);
  const settings = useWorkbenchStore((state) => state.visualSettings);
  const generateRequest = useWorkbenchStore((state) => state.visualLayoutGenerateRequest);
  const filePickerRequest = useWorkbenchStore((state) => state.visualLayoutFilePickerRequest);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const setChangeSet = useWorkbenchStore((state) => state.setChangeSet);
  const [proposal, setProposal] = useState<LayoutProposal>();
  const layoutRenderStartedRef = useRef<number>();
  const layoutRenderTraceRef = useRef<string>();
  const [proposalKey, setProposalKey] = useState('');
  const [proposalSettings, setProposalSettings] = useState<ProposalSettingsSnapshot>();
  const [stageStatus, setStageStatus] = useState<string>();
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const lastGenerateRequestRef = useRef(generateRequest);
  const lastFilePickerRequestRef = useRef(filePickerRequest);

  const fileRows = useMemo(() => project.files.map((file) => ({ file, ...graphFileInfo(file) })), [project]);
  const eligibleRows = fileRows.filter((row) => row.eligible);
  const selectedFiles = visualSelectedFileIds.map((id) => project.fileMap.get(id)).filter((file): file is ProjectFile => Boolean(file));
  const summary = useMemo(
    () => summarizeGeometry(selectedFiles, settings.includeLive, settings.includeFloating),
    [selectedFiles, settings.includeLive, settings.includeFloating],
  );
  const currentProposalKey = useMemo(() => JSON.stringify({
    projectVersion,
    fileIds: [...visualSelectedFileIds].sort(),
    strategy: settings.strategy,
    horizontalGap: settings.strategy === 'normalize' ? undefined : settings.horizontalGap,
    verticalGap: settings.strategy === 'normalize' ? undefined : settings.verticalGap,
    alignmentTolerance: settings.strategy === 'author-normalize' ? settings.alignmentTolerance : undefined,
    dagBranchDirection: settings.strategy === 'dag-rebuild' ? settings.dagBranchDirection : undefined,
    includeLive: settings.strategy === 'normalize' ? undefined : settings.includeLive,
    floaterMode: settings.strategy === 'normalize' ? undefined : settings.floaterMode,
  }), [projectVersion, settings, visualSelectedFileIds]);
  const stale = Boolean(proposal && proposalKey !== currentProposalKey);
  const stagedLayoutInScope = changeSet.changes.filter((change) => change.source === 'layout' && visualSelectedFileIds.includes(change.fileId)).length;
  const proposalWarningCount = proposal?.files.reduce((sum, file) => sum + file.metrics.warnings.filter(isUserFacingLayoutWarning).length, 0) ?? 0;

  useEffect(() => setStageStatus(undefined), [currentProposalKey]);
  useEffect(() => {
    const started = layoutRenderStartedRef.current;
    if (started === undefined || !proposal) return;
    layoutRenderStartedRef.current = undefined;
    recordPerformanceDuration('layout.render.commit', performance.now() - started, {
      traceId: layoutRenderTraceRef.current,
      data: { fileCount: proposal.files.length, patchCount: proposal.patches.length },
    });
    layoutRenderTraceRef.current = undefined;
  }, [proposal]);

  const generateProposal = () => {
    if (!selectedFiles.length) return;
    setStageStatus(undefined);
    const operation = beginPerformanceOperation('layout.generate', {
      data: {
        strategy: settings.strategy,
        fileCount: selectedFiles.length,
        nodeCount: selectedFiles.reduce((sum, file) => sum + file.nodes.length, 0),
      },
    });
    try {
      const layoutSettings = operation.phase('input.prepare', () => ({
        strategy: settings.strategy,
        horizontalGap: settings.horizontalGap,
        verticalGap: settings.verticalGap,
        alignmentTolerance: settings.alignmentTolerance,
        dagBranchDirection: settings.dagBranchDirection,
        includeLive: settings.strategy === 'normalize' ? true : settings.includeLive,
        floaterMode: settings.strategy === 'normalize' ? 'ignore' : settings.floaterMode,
      }));
      const next = operation.phase('proposal-build', () => buildLayoutProposal(selectedFiles, layoutSettings), { fileCount: selectedFiles.length });
      operation.phase('result.materialize', () => {
        layoutRenderStartedRef.current = performance.now();
        layoutRenderTraceRef.current = operation.traceId;
        setProposal(next);
        setProposalSettings({
          strategy: settings.strategy,
          preset: settings.spacingPreset,
          horizontalGap: settings.horizontalGap,
          verticalGap: settings.verticalGap,
          alignmentTolerance: settings.alignmentTolerance,
          dagBranchDirection: settings.dagBranchDirection,
        });
        setProposalKey(currentProposalKey);
      }, { patchCount: next.patches.length, resultFiles: next.files.length, blocked: next.blocked });
      operation.end({ patchCount: next.patches.length, resultFiles: next.files.length, blocked: next.blocked });
    } catch (error) {
      operation.fail(error);
      throw error;
    }
  };
  const stageProposal = () => {
    if (!proposal || proposal.blocked || stale || !editing) return;
    const operation = beginPerformanceOperation('layout.stage', { data: { patchCount: proposal.patches.length, fileCount: proposal.files.length } });
    try {
      const next = operation.phase('changeset.apply', () => stageLayoutProposal(changeSet, proposal));
      operation.phase('state.commit', () => setChangeSet(next));
      setStageStatus(`Staged ${proposal.patches.length} layout value change(s). Existing staged layout values on the same JSON paths were replaced.`);
      operation.end();
    } catch (error) {
      operation.fail(error);
      throw error;
    }
  };

  const eligibleIds = eligibleRows.map((row) => row.file.id);
  const openFilePicker = () => setFilePickerOpen(true);

  useEffect(() => {
    if (filePickerRequest === lastFilePickerRequestRef.current) return;
    lastFilePickerRequestRef.current = filePickerRequest;
    openFilePicker();
  }, [filePickerRequest]);

  useEffect(() => {
    if (generateRequest === lastGenerateRequestRef.current) return;
    lastGenerateRequestRef.current = generateRequest;
    generateProposal();
  }, [generateRequest]);
  const proposalTotals = proposal?.files.reduce((totals, file) => ({
    overlaps: totals.overlaps + file.metrics.nodeOverlapsAfter,
    flowHits: totals.flowHits + file.metrics.edgeNodeIntersectionsAfter,
    attachmentHits: totals.attachmentHits + file.metrics.attachmentEdgeNodeIntersectionsAfter,
    crossings: totals.crossings + file.metrics.edgeEdgeCrossingsAfter,
  }), { overlaps: 0, flowHits: 0, attachmentHits: 0, crossings: 0 });

  return (
    <div className="visual-layout-tab visual-layout-results">
      <div className="visual-hero compact visual-results-hero">
        <div>
          <div className="heading-line"><h2>Layout results</h2><span className="virtual-tab-badge visual">Tool</span></div>
          <p>Scope, strategy and generation live in the Layout sidebar. Review geometry and proposal safety here, then stage only when the result is ready.</p>
        </div>
      </div>

      <details className="visual-card geometry-card visual-aux-card">
        <summary className="visual-card-summary">
          <span><strong>Geometry coverage</strong><small>{summary.known}/{summary.positioned} positioned nodes use known visual geometry{summary.fallback ? ` · ${summary.fallback} fallback` : ''}.</small></span>
          <span className={`geometry-profile-pill ${summary.fallback ? 'warning' : ''}`}>Hytale Normal</span>
        </summary>
        <div className="geometry-metrics">
          <div><strong>{summary.files}</strong><span>files</span></div>
          <div><strong>{summary.nodes}</strong><span>nodes in scope</span></div>
          <div><strong>{summary.positioned}</strong><span>positioned</span></div>
          <div><strong>{summary.known}</strong><span>known visual spec</span></div>
          <div><strong>{summary.exactHeight}</strong><span>fixed-height</span></div>
          <div><strong>{summary.derived}</strong><span>derived-height</span></div>
          <div><strong>{summary.dynamic}</strong><span>dynamic-height</span></div>
          <div className={summary.fallback ? 'warning' : ''}><strong>{summary.fallback}</strong><span>fallback</span></div>
        </div>
      </details>

      <section className="visual-card layout-proposal-card">
        <header>
          <div><h3>Layout proposal</h3><small>Preview the selected strategy first. Nothing changes until the proposal is staged.</small></div>
          <div className="layout-proposal-actions">
            <button className="primary" disabled={!proposal || proposal.blocked || stale || !editing || proposal.patches.length === 0} onClick={stageProposal}>{stagedLayoutInScope ? 'Replace staged layout' : 'Stage proposal'}</button>
          </div>
        </header>
        {!proposal && <div className="visual-foundation-note"><strong>Ready</strong><span>Choose scope and settings in the Layout sidebar, then generate a read-only proposal. Turn Editing On only when you want to stage the result.</span></div>}
        {proposal && (
          <>
            <div className={`layout-proposal-banner ${proposal.blocked ? 'bad' : stale ? 'warning' : 'ok'}`}>
              <strong>{proposal.blocked ? 'BLOCKED' : stale ? 'STALE' : 'READY'}</strong>
              <span>{proposal.patches.length} value change(s) · {proposal.files.length} file(s){proposalWarningCount ? ` · ${proposalWarningCount} warning(s)` : ''}{!editing ? ' · Editing Off' : ''}</span>
              {proposalSettings && <em>{strategyLabel(proposalSettings.strategy)}{proposalSettings.strategy === 'normalize' ? ' · origin only' : proposalSettings.strategy === 'dag-rebuild' ? ` · ${presetLabel(proposalSettings.preset)} · X ${proposalSettings.horizontalGap} · Y ${proposalSettings.verticalGap} · Branch ${proposalSettings.dagBranchDirection}` : ` · ${presetLabel(proposalSettings.preset)} · X ${proposalSettings.horizontalGap} · Y ${proposalSettings.verticalGap} · Plane ${proposalSettings.alignmentTolerance}`}</em>}
            </div>
            {proposalTotals && <div className="layout-proposal-overview">
              <span><b>{proposal.patches.length}</b>value changes</span>
              <span className={proposalTotals.overlaps ? 'bad' : ''}><b>{proposalTotals.overlaps}</b>node overlaps</span>
              <span className={proposalTotals.flowHits ? 'bad' : ''}><b>{proposalTotals.flowHits}</b>flow wire → node</span>
              <span className={proposalTotals.attachmentHits ? 'warning' : ''}><b>{proposalTotals.attachmentHits}</b>attachment wire → node</span>
              <span className={proposalTotals.crossings ? 'warning' : ''}><b>{proposalTotals.crossings}</b>unrelated crossings</span>
            </div>}
            {stale && <div className="visual-foundation-note warning"><strong>Settings changed</strong><span>This proposal uses the settings shown in its banner. Generate a new proposal before staging.</span></div>}
            {stagedLayoutInScope > 0 && <div className="visual-foundation-note"><strong>{stagedLayoutInScope} staged layout values</strong><span>Changing layout settings does not alter an already staged result. Generate a new proposal, then use <b>Replace staged layout</b>.</span></div>}
            <div className="layout-file-results">
              {proposal.files.map(({ metrics }) => {
                const userWarnings = metrics.warnings.filter(isUserFacingLayoutWarning);
                const diagnosticWarnings = metrics.warnings.filter((warning) => !isUserFacingLayoutWarning(warning));
                return (
                <div className={`layout-file-result ${metrics.blocked ? 'bad' : ''}`} key={metrics.fileId}>
                  <div className="layout-file-result-title"><strong>{metrics.filePath}</strong><small>{metrics.rootNodeId ? `root ${metrics.rootNodeId}` : 'root unresolved'}</small></div>
                  {metrics.blockReasons.length > 0 && <div className="layout-block-reasons" role="status" aria-label="Layout block reasons">
                    <strong>Why this file is blocked</strong>
                    {metrics.blockReasons.map((reason) => <span key={reason.code}><b>{reason.count}</b>{reason.summary}</span>)}
                  </div>}
                  <div className="layout-result-summary">
                    {proposal.strategy === 'normalize' ? <>
                      <span><b>{metrics.translatedNodes}</b>nodes origin-shifted</span>
                      <span><b>{formatOffset(metrics.originOffset.x)}, {formatOffset(metrics.originOffset.y)}</b>rigid offset</span>
                      <span><b>{Math.round(metrics.xSpanAfter)} × {Math.round(metrics.ySpanAfter)}</b>layout span preserved</span>
                      <span><b>{metrics.nodeOverlapsBefore} → {metrics.nodeOverlapsAfter}</b>node overlaps preserved</span>
                      <span><b>{metrics.translatedGroups}</b>groups shifted</span>
                      <span><b>{metrics.translatedComments}</b>comments shifted</span>
                    </> : proposal.strategy === 'dag-rebuild' ? <>
                      <span><b>{metrics.normalizedNodes}</b>nodes rebuilt</span>
                      <span><b>{metrics.dagLevels}</b>DAG depth columns</span>
                      <span><b>{Math.round(metrics.xSpanBefore)} → {Math.round(metrics.xSpanAfter)}</b>X span · gap {metrics.horizontalGap}</span>
                      <span><b>{Math.round(metrics.ySpanBefore)} → {Math.round(metrics.ySpanAfter)}</b>Y span · gap {metrics.verticalGap}</span>
                      <span className={metrics.nodeOverlapsAfter ? 'bad' : ''}><b>{metrics.nodeOverlapsBefore} → {metrics.nodeOverlapsAfter}</b>node overlaps</span>
                      <span className={metrics.edgeNodeIntersectionsAfter ? 'bad' : ''}><b>{metrics.edgeNodeIntersectionsBefore} → {metrics.edgeNodeIntersectionsAfter}</b>flow wire → node</span>
                      <span className={metrics.attachmentEdgeNodeIntersectionsAfter ? 'bad' : ''}><b>{metrics.attachmentEdgeNodeIntersectionsAfter}</b>attachment wire → node</span>
                      <span className={metrics.edgeEdgeCrossingsAfter ? 'warning' : ''}><b>{metrics.edgeEdgeCrossingsAfter}</b>unrelated crossings</span>
                    </> : <>
                      <span><b>{metrics.normalizedNodes}</b>normalized nodes</span>
                      <span><b>{metrics.xNormalizedNodes} / {metrics.yNormalizedNodes}</b>X / Y changed</span>
                      <span><b>{Math.round(metrics.xSpanBefore)} → {Math.round(metrics.xSpanAfter)}</b>X span · gap {metrics.horizontalGap}</span>
                      <span><b>{Math.round(metrics.ySpanBefore)} → {Math.round(metrics.ySpanAfter)}</b>Y span · gap {metrics.verticalGap}</span>
                      <span className={metrics.nodeOverlapsAfter ? 'bad' : ''}><b>{metrics.nodeOverlapsBefore} → {metrics.nodeOverlapsAfter}</b>node overlaps</span>
                      <span className={metrics.edgeNodeIntersectionsAfter ? 'bad' : ''}><b>{metrics.edgeNodeIntersectionsBefore} → {metrics.edgeNodeIntersectionsAfter}</b>flow wire → node</span>
                      <span className={metrics.edgeEdgeCrossingsAfter ? 'warning' : ''}><b>{metrics.edgeEdgeCrossingsAfter}</b>unrelated crossings</span>
                      <span className={metrics.attachmentEdgeNodeIntersectionsAfter ? 'warning' : ''}><b>{metrics.attachmentEdgeNodeIntersectionsAfter}</b>attachment wire audit</span>
                      <span className={metrics.newGroupOverlaps.length ? 'bad' : ''}><b>{metrics.groupOverlapsBefore} → {metrics.groupOverlapsAfter}</b>group overlaps</span>
                      <span><b>{metrics.floatersHandled}/{metrics.floatingNodes}</b>floaters · {metrics.floaterMode}</span>
                    </>}
                  </div>
                  {userWarnings.length > 0 && <div className="layout-result-warnings">{userWarnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}
                  <details className="layout-advanced-diagnostics">
                    <summary>Advanced diagnostics</summary>
                    {diagnosticWarnings.length > 0 && <div className="layout-diagnostic-notes">{diagnosticWarnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}

                    <div className="layout-result-metrics">
                      {proposal.strategy === 'normalize' ? <>
                        <span><b>{formatOffset(metrics.originOffset.x)}, {formatOffset(metrics.originOffset.y)}</b>origin offset</span>
                        <span><b>{metrics.positionedNodes}</b>positioned nodes</span>
                        <span><b>{metrics.floatingNodes}</b>floating nodes shifted with origin</span>
                        <span><b>{metrics.groupOverlapsBefore} → {metrics.groupOverlapsAfter}</b>group overlap relation unchanged</span>
                        <span><b>{metrics.floaterOverlapsBefore} → {metrics.floaterOverlapsAfter}</b>floater overlap relation unchanged</span>
                      </> : proposal.strategy === 'dag-rebuild' ? <>
                        <span><b>{formatOffset(metrics.originOffset.x)}, {formatOffset(metrics.originOffset.y)}</b>original origin offset</span>
                        <span><b>{metrics.treeNodes} / {metrics.treeRoots}</b>DAG nodes / components</span>
                        <span><b>{metrics.dagLevels}</b>depth columns</span>
                        <span><b>{metrics.treeMaxDepth}</b>max depth</span>
                        <span><b>{metrics.forks} / {metrics.branchClusters}</b>forks / child branches</span>
                        <span><b>{metrics.singleChildParents}</b>single-child chains</span>
                        <span><b>{metrics.semanticFlowEdges}</b>same-domain flow edges</span>
                        <span><b>{metrics.semanticAttachmentEdges} + {metrics.semanticOrderedAttachmentEdges}</b>attachments + ordered attachments</span>
                        <span className={metrics.semanticStructuralEdges ? 'warning' : ''}><b>{metrics.semanticStructuralEdges}</b>unresolved structural edges</span>
                        <span><b>{metrics.verticalGap} → {metrics.dagEffectiveVerticalGap}</b>requested → effective Y gap</span>
                        <span><b>{metrics.dagSafetyPasses}</b>routing safety passes</span>
                        <span><b>{metrics.routedFlowEdges}</b>routed flow wires</span>
                        <span><b>{metrics.edgeNodeCorridorIntrusionsAfter}</b>padded flow-corridor intrusions</span>
                        <span><b>{metrics.edgeEdgeCrossingsAfter}</b>unrelated wire crossings</span>
                        <span><b>{metrics.groupOverlapsBefore} → {metrics.groupOverlapsAfter}</b>author group overlaps</span>
                        <span><b>{metrics.translatedGroups} / {metrics.resizedGroups}</b>groups moved / rebuilt</span>
                        <span><b>{metrics.floaterOverlapsBefore} → {metrics.floaterOverlapsAfter}</b>floater overlaps</span>
                      </> : <>
                        <span><b>{formatOffset(metrics.originOffset.x)}, {formatOffset(metrics.originOffset.y)}</b>origin offset</span>
                        <span><b>{metrics.treeNodes} / {metrics.treeRoots}</b>tree nodes / roots</span>
                        <span><b>{metrics.forks} / {metrics.branchClusters}</b>solver flow forks / branch clusters</span>
                        <span><b>{metrics.semanticFlowForks} / {metrics.semanticStructuralForks}</b>Reader v2 flow / structural forks</span>
                        <span><b>{metrics.semanticFlowEdges}</b>same-domain flow edges</span>
                        <span><b>{metrics.semanticAttachmentEdges} + {metrics.semanticOrderedAttachmentEdges}</b>attachments + ordered attachments</span>
                        <span><b>{metrics.semanticMixedParents}</b>mixed flow/attachment parents</span>
                        <span className={metrics.semanticStructuralEdges ? 'warning' : ''}><b>{metrics.semanticStructuralEdges}</b>unresolved semantic edges</span>
                        <span><b>{metrics.singleChildParents} / {metrics.connectionPlanesAligned}</b>single-child / plane aligns</span>
                        <span><b>{metrics.authorDepthBands} / {metrics.deepBranchStarts}</b>depth bands / deep starts</span>
                        <span><b>{metrics.authorDepthXRescues}</b>X-depth collision rescues</span>
                        <span><b>{metrics.contourXRescues}</b>local contour X rescues</span>
                        <span><b>{metrics.attachmentXAdjustments}</b>owner attachment X pads</span>
                        <span><b>{Math.round(metrics.maxAttachmentXAdjustment)}</b>max owner X pad</span>
                        <span><b>{metrics.attachmentContourRescues} / {metrics.attachmentContourShiftedNodes}</b>attachment contour rescues / nodes</span>
                        <span><b>{Math.round(metrics.maxAttachmentContourShift)}</b>max attachment contour shift</span>
                        <span><b>{metrics.routedFlowEdges}</b>routed flow wires</span>
                        <span><b>{metrics.edgeNodeCorridorIntrusionsAfter}</b>padded flow-corridor intrusions</span>
                        <span><b>{metrics.edgeCorridorRepairs} / {metrics.edgeCorridorShiftedNodes}</b>edge-corridor repairs / nodes</span>
                        <span><b>{Math.round(metrics.maxEdgeCorridorShift)}</b>max edge-corridor X shift</span>
                        <span><b>{metrics.flowLanes} / {metrics.flowLaneEdges}</b>flow lanes / lane edges</span>
                        <span><b>{Math.round(metrics.maxConnectionPlaneDeviationBefore)} → {Math.round(metrics.maxConnectionPlaneDeviationAfter)}</b>max lane plane deviation</span>
                        <span><b>{Math.round(metrics.medianConnectionPlaneDeviationBefore)} → {Math.round(metrics.medianConnectionPlaneDeviationAfter)}</b>median lane plane deviation</span>
                        <span><b>{metrics.laneRealignments} / {metrics.laneRealignedNodes}</b>lane re-aligns / moved nodes</span>
                        <span><b>{metrics.laneNormalizationBlocked}</b>blocked lane re-aligns</span>
                        <span><b>{metrics.visualRowEdges} / {metrics.visualRowAuthorJitterEdges}</b>visual rows / author jitter</span>
                        <span><b>{metrics.visualRowMisalignedBefore} → {metrics.visualRowMisalignedAfter}</b>row Y mismatches</span>
                        <span><b>{metrics.visualRowRealignments}</b>visual row re-aligns</span>
                        <span><b>{Math.round(metrics.maxVisualRowDeviationBefore)} → {Math.round(metrics.maxVisualRowDeviationAfter)}</b>max row Y deviation</span>
                        <span><b>{metrics.flowVisualGroups} / {metrics.visualGroups}</b>flow visual modules / all groups</span>
                        <span><b>{metrics.chainRows} / {metrics.chainRowEdges}</b>chain rows / row edges</span>
                        <span><b>{metrics.chainRowsMisalignedBefore} → {metrics.chainRowsMisalignedAfter}</b>misaligned chain rows</span>
                        <span><b>{metrics.rowGuidesAlignedBefore} → {metrics.rowGuidesAlignedAfter}</b>exact author row guides</span>
                        <span><b>{metrics.columnGuidesAlignedBefore} → {metrics.columnGuidesAlignedAfter}</b>exact author column guides</span>
                        <span><b>{metrics.authorRowGuides} / {metrics.authorColumnGuides}</b>author row / column guides</span>
                        <span><b>{metrics.chainRowRealignments}</b>chain-row re-aligns</span>
                        <span><b>{metrics.rowGuideRealignments} / {metrics.columnGuideRealignments}</b>row / column guide re-aligns</span>
                        <span><b>{metrics.authorGridMovedNodes} / {metrics.authorGridBlocked}</b>Author Grid moved / blocked</span>
                        <span><b>{Math.round(metrics.maxRowGuideDeviationBefore)} → {Math.round(metrics.maxRowGuideDeviationAfter)}</b>max cross-group row spread</span>
                        <span><b>{Math.round(metrics.maxColumnGuideDeviationBefore)} → {Math.round(metrics.maxColumnGuideDeviationAfter)}</b>max cross-group column spread</span>
                        <span><b>{Math.round(metrics.maxAuthorGridShiftX)} / {Math.round(metrics.maxAuthorGridShiftY)}</b>max Author Grid X / Y shift</span>
                        <span><b>{metrics.attachmentPixelRows} / {metrics.orderedAttachmentColumns}</b>pixel rows / ordered columns</span>
                        <span><b>{metrics.attachmentPixelRowsMisalignedBefore} → {metrics.attachmentPixelRowsMisalignedAfter}</b>attachment row mismatches</span>
                        <span><b>{metrics.orderedAttachmentColumnsMisalignedBefore} → {metrics.orderedAttachmentColumnsMisalignedAfter}</b>ordered column mismatches</span>
                        <span><b>{metrics.pixelAlignmentRealignments} / {metrics.pixelAlignmentBlocked}</b>pixel re-aligns / blocked</span>
                        <span><b>{Math.round(metrics.maxPixelAlignmentShiftX)} / {Math.round(metrics.maxPixelAlignmentShiftY)}</b>max pixel X / Y shift</span>
                        <span><b>{Math.round(metrics.maxLaneShift)}</b>max lane Y shift</span>
                        <span><b>{Math.round(metrics.maxXRescueShift)}</b>max node-contour X rescue</span>
                        <span><b>{metrics.portAlignmentFallbacks}</b>port-align fallbacks</span>
                        <span><b>{metrics.clusterCollisionsResolved}</b>cluster collisions resolved</span>
                        <span><b>{metrics.clusterShiftedNodes}</b>nodes shifted with clusters</span>
                        <span><b>{Math.round(metrics.maxClusterShift)}</b>max Y cluster shift</span>
                        <span><b>{metrics.treeMaxDepth}</b>max tree depth</span>
                        <span><b>{metrics.floaterOverlapsBefore} → {metrics.floaterOverlapsAfter}</b>floater overlaps</span>
                        <span><b>{metrics.translatedGroups}</b>groups shifted</span>
                        <span><b>{metrics.resizedGroups}</b>groups expanded</span>
                        <span><b>{metrics.groupMembershipByBounds} / {metrics.groupMembershipByCenter}</b>group members by bounds / center</span>
                        <span className={metrics.groupMembershipAmbiguous ? 'bad' : ''}><b>{metrics.groupMembershipAmbiguous}</b>ambiguous node→group memberships</span>
                        <span className={metrics.groupParentAmbiguous ? 'bad' : ''}><b>{metrics.groupParentAmbiguous}</b>ambiguous group→parent memberships</span>
                        <span><b>{metrics.groupAnchorRescues} / {metrics.groupAnchorRescuedNodes}</b>group-anchor rescues / nodes</span>
                        <span><b>{metrics.translatedComments}</b>comments shifted</span>
                      </>}
                    </div>
                  </details>
                </div>
                );
              })}
            </div>
            {stageStatus && <div className="layout-stage-status">{stageStatus}</div>}
          </>
        )}
      </section>

      <ExplorerSelectionDialog
        open={filePickerOpen}
        title="Choose Layout files"
        subtitle="Explorer selection mode · only layout-ready graph files can be checked."
        explorerTitle="Layout file selection"
        explorerSubtitle="Check files or whole folders. Non-layout files stay visible but cannot be selected."
        committedFileIds={visualSelectedFileIds}
        eligibleFileIds={eligibleIds}
        eligibleLabel="layout-ready"
        purpose="Layout"
        sectionLabel="Project · select layout files"
        confirmLabel="Use selected files"
        onCancel={() => setFilePickerOpen(false)}
        onCommit={(fileIds) => {
          setVisualSelectedFileIds(fileIds);
          setFilePickerOpen(false);
        }}
        renderSummary={(fileIds) => (
          <><strong>{fileIds.length}</strong> files · <strong>{fileIds.reduce((sum, id) => sum + (project.fileMap.get(id)?.nodes.length ?? 0), 0)}</strong> nodes selected</>
        )}
      />
    </div>
  );
}
