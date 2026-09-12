import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.argv[2];
const output = process.argv[3] ?? 'src/core/geometry/hytaleGeneratorJavaCatalog.generated.ts';
if (!workspaceRoot) {
  console.error('Usage: node scripts/generate-visual-catalog.mjs <workspace-root> [output-file]');
  process.exit(1);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const specs = {};
for (const file of walk(workspaceRoot).filter((item) => item.toLowerCase().endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data || typeof data !== 'object' || typeof data.Id !== 'string') continue;
  const schema = data.Schema && typeof data.Schema === 'object' ? data.Schema : {};
  specs[data.Id] = {
    nodeKind: data.Id,
    title: typeof data.Title === 'string' ? data.Title : data.Id,
    fields: Array.isArray(data.Content) ? data.Content.map((field) => {
      const options = field.Options && typeof field.Options === 'object' ? field.Options : {};
      const mapping = schema[field.Id];
      return {
        id: field.Id,
        jsonKey: typeof mapping === 'string' ? mapping : field.Id,
        renderer: field.Type,
        label: typeof options.Label === 'string' ? options.Label : field.Id,
        requestedWidth: typeof options.Width === 'number' ? options.Width : undefined,
        itemType: typeof options.Type === 'string' ? options.Type : undefined,
      };
    }) : [],
    // ContentNode.xaml renders Input on the left and Output on the right.
    leftPins: Array.isArray(data.Inputs) ? data.Inputs.map((pin) => ({
      id: pin.Id,
      label: typeof pin.Label === 'string' ? pin.Label : '',
      type: typeof pin.Type === 'string' ? pin.Type : '',
      multiple: pin.Multiple === true,
    })) : [],
    rightPins: Array.isArray(data.Outputs) ? data.Outputs.map((pin) => ({
      id: pin.Id,
      label: typeof pin.Label === 'string' ? pin.Label : '',
      type: typeof pin.Type === 'string' ? pin.Type : '',
      multiple: pin.Multiple === true,
    })) : [],
  };
}

const sorted = Object.fromEntries(Object.entries(specs).sort(([a], [b]) => a.localeCompare(b)));
const body = `// AUTO-GENERATED from Hytale's shipped "HytaleGenerator Java" NodeEditor workspace.\n// Do not hand-edit. Re-run scripts/generate-visual-catalog.mjs to refresh it.\nimport type { NodeVisualSpec } from './types.js';\n\nexport const HYTALE_GENERATOR_JAVA_VISUAL_CATALOG: Record<string, NodeVisualSpec> = ${JSON.stringify(sorted, null, 2)};\n\nexport const HYTALE_GENERATOR_JAVA_VISUAL_CATALOG_INFO = {\n  source: 'HytaleGenerator Java',\n  nodeTypeCount: ${Object.keys(sorted).length},\n} as const;\n`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, body, 'utf8');
console.log(`Generated ${Object.keys(sorted).length} node visual specs -> ${output}`);
