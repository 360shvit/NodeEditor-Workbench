import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildProjectGraph, projectGraphRoots, type ProjectGraphNode } from '../../core';
import { useWorkbenchStore, type ProjectGraphViewportState, type ProjectGraphWorkbenchTab } from '../../store';
import { measurePerformanceSync, recordPerformanceDuration } from '../../support/performanceTracing';
import { useWorkbenchPaneId } from '../../workbench/WorkbenchPaneContext';

const CARD_WIDTH = 224;
const CARD_HEIGHT = 72;
const COLUMN_GAP = 110;
const ROW_GAP = 30;
const PADDING = 44;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2.5;
const MAX_FIT_ZOOM = 1.25;
const VIEW_PADDING = 48;
const CAMERA_UPDATE_THRESHOLDS = { noteworthyMs: 16.7, slowMs: 50, verySlowMs: 120 };
const GESTURE_DURATION_THRESHOLDS = { noteworthyMs: 5000, slowMs: 10000, verySlowMs: 30000 };

type CameraRenderReason = 'pan' | 'zoom' | 'fit' | 'restore';

interface PositionedNode extends ProjectGraphNode {
  x: number;
  y: number;
}

interface PendingCameraRender {
  reason: CameraRenderReason;
  startedAt: number;
}

function layoutGraph(nodes: ProjectGraphNode[]) {
  const byDepth = new Map<number, ProjectGraphNode[]>();
  for (const node of nodes) {
    const list = byDepth.get(node.depth) ?? [];
    list.push(node);
    byDepth.set(node.depth, list);
  }
  for (const list of byDepth.values()) list.sort((a, b) => a.label.localeCompare(b.label));

  const maxDepth = Math.max(0, ...nodes.map((node) => node.depth));
  const maxRows = Math.max(1, ...[...byDepth.values()].map((list) => list.length));
  const contentHeight = maxRows * CARD_HEIGHT + Math.max(0, maxRows - 1) * ROW_GAP;
  const height = Math.max(560, contentHeight + PADDING * 2);
  const width = Math.max(860, PADDING * 2 + (maxDepth + 1) * CARD_WIDTH + maxDepth * COLUMN_GAP);
  const positioned = new Map<string, PositionedNode>();

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const list = byDepth.get(depth) ?? [];
    const groupHeight = list.length * CARD_HEIGHT + Math.max(0, list.length - 1) * ROW_GAP;
    const startY = Math.max(PADDING, (height - groupHeight) / 2);
    list.forEach((node, index) => positioned.set(node.id, {
      ...node,
      x: PADDING + depth * (CARD_WIDTH + COLUMN_GAP),
      y: startY + index * (CARD_HEIGHT + ROW_GAP),
    }));
  }

  return { width, height, positioned };
}

function nodeHint(node: ProjectGraphNode): string {
  switch (node.kind) {
    case 'instance': return 'Instance';
    case 'worldstructure': return 'WorldStructure';
    case 'worldstructure-density': return 'WorldStructure Density';
    case 'biome': return 'Biome';
    case 'biome-density': return 'Biome Density';
    case 'density-symbol': return 'Density dependency';
    case 'unresolved-worldstructure': return 'Unresolved WorldStructure';
    case 'unresolved-biome': return 'Unresolved Biome';
    case 'environment-resource': return 'Environment resource';
    case 'unresolved-resource': return 'Unresolved resource';
    case 'unresolved': return 'Unresolved Density';
  }
}

function svgText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

function sameCamera(left: ProjectGraphViewportState, right: ProjectGraphViewportState) {
  return left.panX === right.panX && left.panY === right.panY && left.zoom === right.zoom;
}

export function ProjectGraphView({ tab }: { tab: ProjectGraphWorkbenchTab }) {
  const project = useWorkbenchStore((state) => state.project);
  const paneId = useWorkbenchPaneId();
  const activePane = useWorkbenchStore((state) => state.activePane);
  const selectFile = useWorkbenchStore((state) => state.selectFile);
  const openReferenceTab = useWorkbenchStore((state) => state.openReferenceTab);
  const openSourceTab = useWorkbenchStore((state) => state.openSourceTab);
  const roots = useMemo(() => project ? projectGraphRoots(project) : [], [project]);
  const liveTab = useWorkbenchStore((state) => state.tabs.find((item): item is ProjectGraphWorkbenchTab => item.id === tab.id && item.kind === 'project-graph'));
  const graphSettings = liveTab?.settings ?? tab.settings;
  const fitRequest = liveTab?.fitRequest ?? tab.fitRequest;
  const setProjectGraphSettings = useWorkbenchStore((state) => state.setProjectGraphSettings);
  const setGraphSettings = useCallback((settings: Partial<typeof graphSettings>) => setProjectGraphSettings(settings, tab.id), [setProjectGraphSettings, tab.id]);
  const selectedRoot = roots.find((root) => root.path === graphSettings.selectedRootPath) ?? roots[0];
  const selectedRootIndex = selectedRoot ? roots.findIndex((root) => root.fileId === selectedRoot.fileId) : -1;
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; panX: number; panY: number }>();
  const wheelCommitTimer = useRef<number>();
  const panStartedRef = useRef<number>();
  const zoomGestureStartedRef = useRef<number>();
  const pendingCameraRenderRef = useRef<PendingCameraRender>();
  const lastFitRequest = useRef(fitRequest);
  const [dragging, setDragging] = useState(false);
  const [camera, setCamera] = useState<ProjectGraphViewportState>(graphSettings.viewport ?? { panX: 0, panY: 0, zoom: 1 });
  const cameraRef = useRef(camera);

  const markCameraRender = useCallback((reason: CameraRenderReason) => {
    pendingCameraRenderRef.current = { reason, startedAt: performance.now() };
  }, []);

  useEffect(() => { cameraRef.current = camera; }, [camera]);

  useLayoutEffect(() => {
    const pending = pendingCameraRenderRef.current;
    if (!pending) return;
    pendingCameraRenderRef.current = undefined;
    const durationMs = performance.now() - pending.startedAt;
    recordPerformanceDuration('graph.render.commit', durationMs, {
      aggregateOnly: true,
      thresholds: CAMERA_UPDATE_THRESHOLDS,
      data: { reason: pending.reason, zoom: camera.zoom },
    });
    if (pending.reason === 'pan' || pending.reason === 'zoom') {
      recordPerformanceDuration(`graph.camera.${pending.reason}`, durationMs, {
        aggregateOnly: true,
        thresholds: CAMERA_UPDATE_THRESHOLDS,
        data: { zoom: camera.zoom },
      });
    }
  }, [camera.panX, camera.panY, camera.zoom]);

  useEffect(() => {
    if (graphSettings.viewport && !sameCamera(graphSettings.viewport, cameraRef.current)) {
      const started = performance.now();
      markCameraRender('restore');
      cameraRef.current = graphSettings.viewport;
      setCamera(graphSettings.viewport);
      recordPerformanceDuration('graph.camera.restore', performance.now() - started, {
        aggregateOnly: true,
        data: { zoom: graphSettings.viewport.zoom },
      });
    }
  }, [graphSettings.viewport?.panX, graphSettings.viewport?.panY, graphSettings.viewport?.zoom, markCameraRender]);

  useEffect(() => () => {
    if (wheelCommitTimer.current) window.clearTimeout(wheelCommitTimer.current);
  }, []);

  useEffect(() => {
    const nextPath = selectedRoot?.path;
    if (nextPath !== graphSettings.selectedRootPath) setGraphSettings({ selectedRootPath: nextPath, viewport: undefined });
  }, [selectedRoot?.path, graphSettings.selectedRootPath, setGraphSettings]);

  const graph = useMemo(() => project
    ? measurePerformanceSync('graph.build', () => buildProjectGraph(project, selectedRoot?.fileId, graphSettings.densityDepth, graphSettings.includeResources), {
        data: { projectFiles: project.files.length, rootIndex: selectedRootIndex, rootKind: selectedRoot?.kind ?? 'none', rootCount: roots.length, densityDepth: graphSettings.densityDepth, includeResources: graphSettings.includeResources },
      })
    : undefined, [project, selectedRoot?.fileId, graphSettings.densityDepth, graphSettings.includeResources]);
  const layout = useMemo(() => measurePerformanceSync('graph.layout', () => layoutGraph(graph?.nodes ?? []), {
    data: { nodeCount: graph?.nodes.length ?? 0, edgeCount: graph?.edges.length ?? 0, rootIndex: selectedRootIndex, rootKind: selectedRoot?.kind ?? 'none' },
  }), [graph]);

  const commitCamera = useCallback((next: ProjectGraphViewportState) => {
    setGraphSettings({ viewport: next });
  }, [setGraphSettings]);

  const fitGraph = useCallback((reason: 'initial' | 'request' = 'request') => {
    const started = performance.now();
    const element = viewportRef.current;
    if (!element || !graph?.root) return;
    const rect = element.getBoundingClientRect();
    const availableWidth = Math.max(1, rect.width - VIEW_PADDING * 2);
    const availableHeight = Math.max(1, rect.height - VIEW_PADDING * 2);
    const zoom = Math.min(MAX_FIT_ZOOM, MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(availableWidth / layout.width, availableHeight / layout.height)));
    const next = {
      zoom,
      panX: (rect.width - layout.width * zoom) / 2,
      panY: (rect.height - layout.height * zoom) / 2,
    };
    markCameraRender('fit');
    cameraRef.current = next;
    setCamera(next);
    commitCamera(next);
    recordPerformanceDuration('graph.camera.fit', performance.now() - started, {
      aggregateOnly: true,
      data: { reason, zoom, nodeCount: graph.nodes.length },
    });
  }, [graph?.root, graph?.nodes.length, layout.width, layout.height, commitCamera, markCameraRender]);

  useEffect(() => {
    const requested = fitRequest !== lastFitRequest.current;
    if (requested) lastFitRequest.current = fitRequest;
    if (activePane !== paneId || !graph?.root || (graphSettings.viewport && !requested)) return;
    const frame = window.requestAnimationFrame(() => fitGraph(requested ? 'request' : 'initial'));
    return () => window.cancelAnimationFrame(frame);
  }, [activePane, paneId, fitRequest, graph?.root?.fileId, graphSettings.viewport, layout.width, layout.height, fitGraph]);

  if (!project || !graph) return null;

  const openNode = (node: ProjectGraphNode) => {
    if ((node.kind === 'density-symbol' || node.kind === 'unresolved') && node.symbolName) {
      openReferenceTab('Density', node.symbolName);
      return;
    }
    if (node.resourcePath) { openSourceTab(node.resourcePath); return; }
    if (node.fileId) selectFile(node.fileId);
  };

  const onNodeKeyDown = (event: React.KeyboardEvent<SVGGElement>, node: ProjectGraphNode) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openNode(node);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as Element;
    if (target.closest('.project-graph-node, .project-graph-overlay')) return;
    const current = cameraRef.current;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: current.panX, panY: current.panY };
    panStartedRef.current = performance.now();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    event.preventDefault();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = { ...cameraRef.current, panX: drag.panX + event.clientX - drag.startX, panY: drag.panY + event.clientY - drag.startY };
    markCameraRender('pan');
    cameraRef.current = next;
    setCamera(next);
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    commitCamera(cameraRef.current);
    const panStarted = panStartedRef.current;
    panStartedRef.current = undefined;
    if (panStarted !== undefined) recordPerformanceDuration('graph.camera.pan.gesture-duration', performance.now() - panStarted, {
      aggregateOnly: true,
      thresholds: GESTURE_DURATION_THRESHOLDS,
      data: { zoom: cameraRef.current.zoom },
    });
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!graph.root) return;
    const target = event.target as Element;
    if (target.closest('.project-graph-overlay')) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointX = event.clientX - rect.left;
    const pointY = event.clientY - rect.top;
    const current = cameraRef.current;
    const factor = Math.exp(-event.deltaY * 0.0015);
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
    if (zoom === current.zoom) return;
    if (zoomGestureStartedRef.current === undefined) zoomGestureStartedRef.current = performance.now();
    const worldX = (pointX - current.panX) / current.zoom;
    const worldY = (pointY - current.panY) / current.zoom;
    const next = {
      zoom,
      panX: pointX - worldX * zoom,
      panY: pointY - worldY * zoom,
    };
    markCameraRender('zoom');
    cameraRef.current = next;
    setCamera(next);
    if (wheelCommitTimer.current) window.clearTimeout(wheelCommitTimer.current);
    wheelCommitTimer.current = window.setTimeout(() => {
      commitCamera(cameraRef.current);
      const zoomStarted = zoomGestureStartedRef.current;
      zoomGestureStartedRef.current = undefined;
      if (zoomStarted !== undefined) recordPerformanceDuration('graph.camera.zoom.gesture-duration', performance.now() - zoomStarted, {
        aggregateOnly: true,
        thresholds: GESTURE_DURATION_THRESHOLDS,
        data: { zoom: cameraRef.current.zoom },
      });
    }, 120);
  };

  return (
    <section className="project-graph-view project-graph-viewport-host">
      <div
        ref={viewportRef}
        className={`project-graph-viewport ${dragging ? 'dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={onWheel}
        aria-label="Project Graph viewport"
      >
        {!graph.root ? (
          <div className="project-graph-empty">
            <h3>No generator flow root detected</h3>
            <p>The graph can start at a recognized HytaleGenerator <code>instance.bson</code> or directly at a WorldStructure when no Instance is present.</p>
          </div>
        ) : (
          <svg
            className="project-graph-svg"
            width="100%"
            height="100%"
            aria-label="Project Graph vector canvas"
          >
            <g className="project-graph-camera" transform={`translate(${camera.panX} ${camera.panY}) scale(${camera.zoom})`}>
              <g className="project-graph-edges" aria-hidden="true">
                {graph.edges.map((edge) => {
                  const source = layout.positioned.get(edge.source);
                  const target = layout.positioned.get(edge.target);
                  if (!source || !target) return null;
                  const x1 = source.x + CARD_WIDTH;
                  const y1 = source.y + CARD_HEIGHT / 2;
                  const x2 = target.x;
                  const y2 = target.y + CARD_HEIGHT / 2;
                  const bend = Math.max(42, (x2 - x1) * 0.45);
                  return <path key={edge.id} className={`project-graph-edge edge-${edge.kind}`} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} />;
                })}
              </g>

              {[...layout.positioned.values()].map((node) => {
                const hint = nodeHint(node);
                const tooltip = node.subtitle ? `${hint}\n${node.subtitle}` : hint;
                return (
                  <g
                    key={node.id}
                    className={`project-graph-node graph-node-${node.kind} ${node.unresolved ? 'unresolved' : ''}`}
                    transform={`translate(${node.x} ${node.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${hint}: ${node.label}${node.subtitle ? ` — ${node.subtitle}` : ''}`}
                    data-tooltip={tooltip}
                    onClick={() => openNode(node)}
                    onKeyDown={(event) => onNodeKeyDown(event, node)}
                  >
                    <rect className="project-graph-node-bg" width={CARD_WIDTH} height={CARD_HEIGHT} rx="7" ry="7" />
                    <text className="project-graph-node-kind" x="12" y="19">{hint}</text>
                    <text className="project-graph-node-label" x="12" y="39">{svgText(node.label, 31)}</text>
                    {node.subtitle && <text className="project-graph-node-subtitle" x="12" y="57">{svgText(node.subtitle, 40)}</text>}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        <div className="project-graph-overlay project-graph-legend" aria-label="Project Graph legend">
          <span><i className="legend-instance" />Instance</span>
          <span><i className="legend-world" />WorldStructure</span>
          <span><i className="legend-biome" />Biome</span>
          <span><i className="legend-density" />Density</span>
          {graphSettings.includeResources && <span><i className="legend-resource" />Resource</span>}
          <span><i className="legend-unresolved" />Unresolved</span>
        </div>
        <div className="project-graph-overlay project-graph-hint">Click files to open them · Density assets open References</div>
      </div>
    </section>
  );
}
