import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'scripts', 'og-card.html');
const output = resolve(root, 'public', 'og.png');
const candidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome',
  'chromium',
].filter(Boolean);

let chrome;
for (const candidate of candidates) {
  try {
    if (candidate.includes('/')) await access(candidate);
    chrome = candidate;
    break;
  } catch {
    // Try the next common browser location.
  }
}

if (!chrome) {
  throw new Error('Chrome or Chromium is required to generate public/og.png.');
}

await run(chrome, [
  '--headless=new',
  '--hide-scrollbars',
  '--disable-gpu',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  `--screenshot=${output}`,
  pathToFileURL(source).href,
]);

console.log('Generated public/og.png from scripts/og-card.html');
