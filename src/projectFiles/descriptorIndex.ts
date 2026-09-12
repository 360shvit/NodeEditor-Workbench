import type { ProjectModel } from '../core';
import type { LoadedWorkspace } from '../io/folderLoader';
import { beginPerformanceOperation, recordPerformanceDuration } from '../support/performanceTracing';
import { buildProjectFileDescriptors, type ProjectFileDescriptor } from './loadPolicy';

export interface ProjectFileDescriptorSummary {
  total: number;
  semantic: number;
  resources: number;
  workbenchKnown: number;
  inventoryOnly: number;
  manuallyProbed: number;
}

export interface ProjectFileDescriptorIndex {
  descriptors: ProjectFileDescriptor[];
  byPath: Map<string, ProjectFileDescriptor>;
  summary: ProjectFileDescriptorSummary;
}

interface CachedDescriptorIndex {
  sourceEntries: LoadedWorkspace['sourceEntries'];
  semanticInfo: LoadedWorkspace['semanticInfo'];
  label: string;
  value: ProjectFileDescriptorIndex;
}

const descriptorIndexByProject = new WeakMap<ProjectModel, CachedDescriptorIndex>();

function summarize(descriptors: ProjectFileDescriptor[]): ProjectFileDescriptorSummary {
  let semantic = 0;
  let resources = 0;
  let workbenchKnown = 0;
  let inventoryOnly = 0;
  let manuallyProbed = 0;
  for (const descriptor of descriptors) {
    if (descriptor.semanticFile) semantic += 1;
    if (descriptor.resourceRole) resources += 1;
    if (descriptor.workbenchKnown) workbenchKnown += 1;
    if (descriptor.inventoryOnly) inventoryOnly += 1;
    if (descriptor.discoverySource === 'manual-probe') manuallyProbed += 1;
  }
  return { total: descriptors.length, semantic, resources, workbenchKnown, inventoryOnly, manuallyProbed };
}

function cacheMatches(cached: CachedDescriptorIndex, workspace: LoadedWorkspace): boolean {
  return cached.sourceEntries === workspace.sourceEntries
    && cached.semanticInfo === workspace.semanticInfo
    && cached.label === workspace.label;
}

/**
 * Stable, project-scoped Explorer descriptor index.
 *
 * ProjectModel identity is the invalidation boundary. Store reload/apply flows already rebuild the
 * ProjectModel whenever inventory/semantic authority changes. Workspace references are checked as
 * a defensive guard so an inventory replacement cannot accidentally reuse descriptors.
 */
export function getProjectFileDescriptorIndex(project: ProjectModel, workspace: LoadedWorkspace): ProjectFileDescriptorIndex {
  const started = performance.now();
  const cached = descriptorIndexByProject.get(project);
  if (cached && cacheMatches(cached, workspace)) {
    recordPerformanceDuration('explorer.descriptor-index.cache-hit', performance.now() - started, {
      aggregateOnly: true,
      data: { inventoryFiles: workspace.sourceEntries.size, descriptorCount: cached.value.descriptors.length },
    });
    return cached.value;
  }

  recordPerformanceDuration('explorer.descriptor-index.cache-miss', performance.now() - started, {
    aggregateOnly: true,
    data: {
      inventoryFiles: workspace.sourceEntries.size,
      reason: cached ? 'workspace-authority-changed' : 'project-model-miss',
    },
  });

  const operation = beginPerformanceOperation('explorer.descriptor-index.rebuild', {
    data: {
      inventoryFiles: workspace.sourceEntries.size,
      semanticFiles: project.files.length,
      semanticReferences: project.semanticReferences.length,
    },
  });
  try {
    const descriptors = buildProjectFileDescriptors(
      workspace.sourceEntries.keys(),
      workspace.label,
      project.files,
      workspace.semanticInfo,
      project.semanticReferences,
      operation,
    );
    const byPath = operation.phase('path-index', () => new Map(descriptors.map((descriptor) => [descriptor.path, descriptor])), {
      descriptorCount: descriptors.length,
    });
    const summary = operation.phase('summary', () => summarize(descriptors), { descriptorCount: descriptors.length });
    const value = { descriptors, byPath, summary };
    descriptorIndexByProject.set(project, {
      sourceEntries: workspace.sourceEntries,
      semanticInfo: workspace.semanticInfo,
      label: workspace.label,
      value,
    });
    operation.end({ descriptorCount: descriptors.length, resourceFiles: summary.resources });
    return value;
  } catch (error) {
    operation.fail(error);
    throw error;
  }
}

/** Test/support hook only. Normal invalidation is automatic via ProjectModel identity. */
export function clearProjectFileDescriptorIndex(project: ProjectModel): void {
  descriptorIndexByProject.delete(project);
}
