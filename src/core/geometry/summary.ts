import type { ProjectFile } from '../types.js';
import { buildEditorMetadataForFile } from '../graph/editorMetadata.js';
import { resolveNodeGeometry } from './resolver.js';
import type { GeometrySummary } from './types.js';

export function summarizeGeometry(files: ProjectFile[], includeLive = true, includeFloating = false): GeometrySummary {
  const summary: GeometrySummary = {
    files: files.length,
    nodes: 0,
    positioned: 0,
    unpositioned: 0,
    known: 0,
    exactHeight: 0,
    derived: 0,
    dynamic: 0,
    fallback: 0,
  };

  for (const file of files) {
    const metadata = buildEditorMetadataForFile(file);
    for (const node of file.nodes) {
      if ((node.location === 'live' && !includeLive) || (node.location === 'floating' && !includeFloating)) continue;
      summary.nodes++;
      const editor = metadata.nodes.get(node.id);
      if (editor?.position) summary.positioned++; else summary.unpositioned++;
      const geometry = resolveNodeGeometry(file, node, editor);
      if (geometry.source === 'hytale-normal-profile') summary.known++; else summary.fallback++;
      if (geometry.heightConfidence === 'exact') summary.exactHeight++;
      else if (geometry.heightConfidence === 'derived') summary.derived++;
      else if (geometry.heightConfidence === 'dynamic') summary.dynamic++;
      else if (geometry.heightConfidence === 'fallback' && geometry.source !== 'unknown-node-fallback') summary.fallback++;
    }
  }
  return summary;
}
