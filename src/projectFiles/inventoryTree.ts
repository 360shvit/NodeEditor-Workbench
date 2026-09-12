import { descriptorMatchesExplorerScope, type ProjectFileDescriptor } from './loadPolicy';

export interface InventoryTreeSummary {
  totalFiles: number;
  semanticFiles: number;
  resourceFiles: number;
  inventoryOnlyFiles: number;
  workbenchKnownFiles: number;
  graphFlowFiles: number;
  manualProbeFiles: number;
}

export interface InventoryTreeFolder {
  kind: 'folder';
  name: string;
  path: string;
  relevantToGraphFlow: boolean;
  workbenchKnown: boolean;
  summary: InventoryTreeSummary;
  children: InventoryTreeNode[];
}

export interface InventoryTreeFile {
  kind: 'file';
  name: string;
  path: string;
  relevantToGraphFlow: boolean;
  descriptor: ProjectFileDescriptor;
}

export type InventoryTreeNode = InventoryTreeFolder | InventoryTreeFile;

function emptySummary(): InventoryTreeSummary {
  return {
    totalFiles: 0,
    semanticFiles: 0,
    resourceFiles: 0,
    inventoryOnlyFiles: 0,
    workbenchKnownFiles: 0,
    graphFlowFiles: 0,
    manualProbeFiles: 0,
  };
}

function includeDescriptor(summary: InventoryTreeSummary, descriptor: ProjectFileDescriptor): void {
  summary.totalFiles += 1;
  if (descriptor.semanticFile) summary.semanticFiles += 1;
  if (descriptor.resourceRole) summary.resourceFiles += 1;
  if (descriptor.inventoryOnly) summary.inventoryOnlyFiles += 1;
  if (descriptor.workbenchKnown) summary.workbenchKnownFiles += 1;
  if (descriptor.relevantToGraphFlow) summary.graphFlowFiles += 1;
  if (descriptor.discoverySource === 'manual-probe') summary.manualProbeFiles += 1;
}

export function buildInventoryTree(descriptors: ProjectFileDescriptor[], workspaceFilter = 'all'): InventoryTreeNode[] {
  const roots: InventoryTreeNode[] = [];
  const folders = new Map<string, InventoryTreeFolder>();
  const filtered = descriptors.filter((descriptor) => descriptorMatchesExplorerScope(descriptor, workspaceFilter));

  for (const descriptor of filtered) {
    const parts = descriptor.path.replace(/\\/g, '/').split('/').filter(Boolean);
    let children = roots;
    let current = '';
    const ancestors: InventoryTreeFolder[] = [];
    for (const part of parts.slice(0, -1)) {
      current = current ? `${current}/${part}` : part;
      let folder = folders.get(current);
      if (!folder) {
        folder = {
          kind: 'folder',
          name: part,
          path: current,
          relevantToGraphFlow: false,
          workbenchKnown: false,
          summary: emptySummary(),
          children: [],
        };
        folders.set(current, folder);
        children.push(folder);
      }
      ancestors.push(folder);
      children = folder.children;
    }
    children.push({ kind: 'file', name: descriptor.name, path: descriptor.path, relevantToGraphFlow: descriptor.relevantToGraphFlow, descriptor });
    for (const folder of ancestors) {
      includeDescriptor(folder.summary, descriptor);
      if (descriptor.relevantToGraphFlow) folder.relevantToGraphFlow = true;
      if (descriptor.workbenchKnown) folder.workbenchKnown = true;
    }
  }

  const sort = (nodes: InventoryTreeNode[]) => {
    nodes.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1);
    for (const node of nodes) if (node.kind === 'folder') sort(node.children);
  };
  sort(roots);
  return roots;
}
