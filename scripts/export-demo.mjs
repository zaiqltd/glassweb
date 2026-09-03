import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadGlassWebCore } from './load-core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public', 'orbit-pricing-demo.glassweb.json');
const { demoTrace, serializeTrace, validateTrace } = await loadGlassWebCore();
const validation = validateTrace(demoTrace);

if (!validation.ok) {
  throw new Error(
    `Refusing to export an invalid demo trace: ${validation.errors.join(' ')}`,
  );
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, serializeTrace(demoTrace), 'utf8');
console.log(
  `Exported ${demoTrace.entities.length} entities and ${demoTrace.relations.length} relations to public/orbit-pricing-demo.glassweb.json`,
);
