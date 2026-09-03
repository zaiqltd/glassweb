import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadGlassWebCore } from './load-core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = resolve(root, 'public');
const {
  demoBrokenTrace,
  demoCheckoutCheck,
  demoRepairedTrace,
  demoTrace,
  serializeGlassWebCheck,
  serializeTrace,
  validateGlassWebCheck,
  validateTrace,
} = await loadGlassWebCore();

const traces = [
  ['orbit-pricing-demo.glassweb.json', demoTrace],
  ['orbit-checkout-broken.glassweb.json', demoBrokenTrace],
  ['orbit-checkout-repaired.glassweb.json', demoRepairedTrace],
];

await mkdir(publicDirectory, { recursive: true });

for (const [filename, trace] of traces) {
  const validation = validateTrace(trace);
  if (!validation.ok) {
    throw new Error(
      `Refusing to export invalid demo trace ${filename}: ${validation.errors.join(' ')}`,
    );
  }
  await writeFile(
    resolve(publicDirectory, filename),
    serializeTrace(trace),
    'utf8',
  );
}

const checkValidation = validateGlassWebCheck(demoCheckoutCheck);
if (!checkValidation.ok) {
  throw new Error(
    `Refusing to export an invalid demo check: ${checkValidation.errors.join(' ')}`,
  );
}
await writeFile(
  resolve(publicDirectory, 'orbit-checkout-working.glassweb-check.json'),
  serializeGlassWebCheck(demoCheckoutCheck),
  'utf8',
);

console.log(
  `Exported ${traces.length} demo recordings and 1 portable check to public/`,
);
