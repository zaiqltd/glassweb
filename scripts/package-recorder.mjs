import { execFileSync } from 'node:child_process';
import { access, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionRoot = resolve(root, 'extension');
const output = resolve(root, 'public', 'glassweb-recorder.zip');
const files = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

await Promise.all(files.map((file) => access(resolve(extensionRoot, file))));

execFileSync('/usr/bin/zip', ['-q', '-X', '-FS', output, ...files], {
  cwd: extensionRoot,
  stdio: 'inherit',
});

const archive = await stat(output);
if (archive.size < 5_000)
  throw new Error('Recorder archive was unexpectedly small.');
console.log(
  `Packaged GlassWeb Recorder (${Math.round(archive.size / 1024)} KB) at public/glassweb-recorder.zip`,
);
