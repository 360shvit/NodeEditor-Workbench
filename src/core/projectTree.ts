import type { ProjectFile } from './types.js';

export interface ProjectTreeFolder {
  kind: 'folder';
  name: string;
  path: string;
  children: ProjectTreeNode[];
}

export interface ProjectTreeFile {
  kind: 'file';
  name: string;
  path: string;
  file: ProjectFile;
}

export type ProjectTreeNode = ProjectTreeFolder | ProjectTreeFile;

export function buildProjectTree(files: ProjectFile[], workspaceFilter = 'all'): ProjectTreeNode[] {
  const roots: ProjectTreeNode[] = [];
  const folders = new Map<string, ProjectTreeFolder>();
  const filtered = workspaceFilter === 'all' ? files : files.filter((file) => file.workspace.id === workspaceFilter);

  for (const file of filtered) {
    const parts = file.path.replace(/\\/g, '/').split('/').filter(Boolean);
    let children = roots;
    let current = '';
    parts.slice(0, -1).forEach((part) => {
      current = current ? `${current}/${part}` : part;
      let folder = folders.get(current);
      if (!folder) {
        folder = { kind: 'folder', name: part, path: current, children: [] };
        folders.set(current, folder);
        children.push(folder);
      }
      children = folder.children;
    });
    children.push({ kind: 'file', name: file.name, path: file.path, file });
  }

  const sort = (nodes: ProjectTreeNode[]) => {
    nodes.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1);
    for (const node of nodes) if (node.kind === 'folder') sort(node.children);
  };
  sort(roots);
  return roots;
}
