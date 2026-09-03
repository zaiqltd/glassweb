import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set([
  '.git',
  '.next',
  '.vinext',
  '.wrangler',
  'coverage',
  'dist',
  'node_modules',
  'outputs',
  'work',
]);
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.toml',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);
const detectors = [
  ['OpenAI-style secret', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g],
  ['OpenRouter secret', /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/g],
  [
    'GitHub token',
    /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g,
  ],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  [
    'Private key material',
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  ],
];

async function collect(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path, files);
    else if (
      textExtensions.has(extname(entry.name)) &&
      (await stat(path)).size < 2_000_000
    )
      files.push(path);
  }
  return files;
}

const findings = [];
for (const path of await collect(root)) {
  const source = await readFile(path, 'utf8');
  for (const [label, detector] of detectors) {
    detector.lastIndex = 0;
    for (const match of source.matchAll(detector)) {
      const line = source.slice(0, match.index).split('\n').length;
      findings.push(`${relative(root, path)}:${line} — ${label}`);
    }
  }
}

if (findings.length) {
  console.error(`Secret scan failed:\n${findings.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Secret scan passed: no credential-shaped values found.');
}
