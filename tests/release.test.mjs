import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadGlassWebCore } from '../scripts/load-core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = await loadGlassWebCore();
const { createAgentBrief, demoTrace, findFocusFromQuestion, validateTrace } =
  core;
const copy = () => structuredClone(demoTrace);

test('the canonical trace is internally consistent', () => {
  const validation = validateTrace(demoTrace);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.ok, true);
  assert.ok(demoTrace.entities.length >= 25);
  assert.ok(demoTrace.relations.length >= 20);
  assert.ok(demoTrace.events.length >= 10);
  assert.ok(demoTrace.focuses.length >= 5);
  assert.ok(demoTrace.focuses.some((focus) => focus.id === 'billing'));
});

test('the default experience explains one answer before showing the X-ray', async () => {
  const app = await readFile(
    resolve(root, 'components/glassweb/glassweb-app.tsx'),
    'utf8',
  );
  const simple = await readFile(
    resolve(root, 'components/glassweb/simple-story.tsx'),
    'utf8',
  );

  assert.match(app, /useState<'simple' \| 'xray'>\([\s\S]*?'simple'/);
  assert.match(app, /<SimpleStory/);
  assert.match(app, /setRuntimePlaying\(true\)/);
  for (const promise of [
    'The short answer',
    'What happened',
    'Why you care',
    'How do you know?',
    'Open full X-ray',
  ]) {
    assert.match(simple, new RegExp(promise.replace('?', '\\?')));
  }
  assert.doesNotMatch(simple, /technicalLabel/);
  assert.match(simple, /isDemo \? friendlyStories\[focus\.id\]/);
});

test('every demo entity and relation links to real evidence', () => {
  const evidenceIds = new Set(demoTrace.evidence.map((item) => item.id));
  for (const record of [...demoTrace.entities, ...demoTrace.relations]) {
    assert.ok(record.evidenceIds.length > 0, `${record.id} has no evidence`);
    for (const id of record.evidenceIds)
      assert.ok(evidenceIds.has(id), `${record.id} points to ${id}`);
  }
  assert.ok(
    demoTrace.relations.some((relation) => relation.certainty === 'correlated'),
  );
});

test('the price story crosses the exact five-layer grammar', () => {
  const focus = demoTrace.focuses.find((item) => item.id === 'price');
  assert.ok(focus);
  const layers = new Set(
    focus.entityIds.map(
      (id) => demoTrace.entities.find((entity) => entity.id === id)?.layer,
    ),
  );
  assert.deepEqual(
    [...layers].sort((left, right) => left.localeCompare(right)),
    ['behaviour', 'network', 'service', 'structure', 'visible'],
  );
});

test('natural-language focus stays inside the recorded graph', () => {
  const focus = findFocusFromQuestion(
    demoTrace,
    'Who receives analytics data outside the site?',
  );
  assert.equal(focus.id, 'analytics');
  assert.ok(demoTrace.focuses.includes(focus));
  assert.ok(
    focus.entityIds.every((id) =>
      demoTrace.entities.some((entity) => entity.id === id),
    ),
  );
});

test('unsupported questions never fall back to a confident answer', () => {
  assert.equal(
    findFocusFromQuestion(demoTrace, 'Why is my logo purple?'),
    undefined,
  );
  assert.equal(
    findFocusFromQuestion(demoTrace, 'Did a database delete my account?'),
    undefined,
  );
});

test('the coding-agent handoff is bounded by recorded certainty', () => {
  const focus = demoTrace.focuses.find((item) => item.id === 'checkout');
  assert.ok(focus);
  const brief = createAgentBrief(demoTrace, focus);
  assert.match(brief, /GlassWeb evidence packet/);
  assert.match(brief, /Start Pro button -> Checkout control \[observed\]/);
  assert.match(brief, /Do not claim server behavior or causality/);
  assert.doesNotMatch(brief, /Authorization|Cookie values/);
});

test('imports reject unsafe images and broken evidence references', () => {
  const unsafeImage = copy();
  unsafeImage.page.screenshotDataUrl = 'data:image/svg+xml;base64,PHN2Zy8+';
  assert.equal(validateTrace(unsafeImage).ok, false);

  const brokenEdge = copy();
  brokenEdge.relations[0].to = 'missing-entity';
  assert.equal(validateTrace(brokenEdge).ok, false);

  const brokenEvidence = copy();
  brokenEvidence.evidence = brokenEvidence.evidence.slice(1);
  assert.equal(validateTrace(brokenEvidence).ok, false);
});

test('a 500-entity, 2,000-edge trace validates within an interactive budget', () => {
  const trace = copy();
  trace.entities = Array.from({ length: 500 }, (_, index) => ({
    id: `entity-${index}`,
    kind: 'dom-node',
    layer: ['visible', 'structure', 'behaviour', 'network', 'service'][
      index % 5
    ],
    humanLabel: `Entity ${index}`,
    technicalLabel: `node:${index}`,
    description: 'Synthetic release-scale validation fixture.',
    certainty: 'observed',
    firstSeen: index,
    lastSeen: index + 1,
    evidenceIds: [`entity-evidence-${index}`],
  }));
  trace.relations = Array.from({ length: 2_000 }, (_, index) => ({
    id: `relation-${index}`,
    from: `entity-${index % 500}`,
    to: `entity-${(index + 1) % 500}`,
    kind: 'contains',
    certainty: 'observed',
    evidenceIds: [`relation-evidence-${index}`],
    explanation: 'Synthetic observed relationship.',
  }));
  trace.events = [];
  trace.evidence = [
    ...trace.entities.map((entity, index) => ({
      id: `entity-evidence-${index}`,
      source: 'dom',
      explanation: `Observed ${entity.humanLabel}.`,
      eventIds: [],
    })),
    ...trace.relations.map((relation, index) => ({
      id: `relation-evidence-${index}`,
      source: 'dom',
      explanation: relation.explanation,
      eventIds: [],
    })),
  ];
  trace.focuses = [
    {
      id: 'scale-focus',
      label: 'Scale fixture',
      question: 'Can this graph be validated?',
      summary: 'The scale fixture stays within the supported object limits.',
      detail: 'This focus anchors the synthetic graph.',
      entityIds: ['entity-0'],
      relationIds: [],
      surfaceEntityId: 'entity-0',
    },
  ];

  const started = performance.now();
  const validation = validateTrace(trace);
  const elapsed = performance.now() - started;
  assert.equal(validation.ok, true, validation.errors.join(' '));
  assert.ok(elapsed < 500, `validation took ${elapsed.toFixed(1)}ms`);
});

test('the recorder requests only one-tab, user-triggered permissions', async () => {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'extension/manifest.json'), 'utf8'),
  );
  assert.deepEqual(
    [...manifest.permissions].sort((left, right) => left.localeCompare(right)),
    ['activeTab', 'downloads', 'scripting', 'storage'],
  );
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.optional_host_permissions, undefined);
  assert.equal(manifest.manifest_version, 3);
});

test('the recorder source never reads high-risk browser values', async () => {
  const source = await readFile(resolve(root, 'extension/content.js'), 'utf8');
  const pageProbe = await readFile(
    resolve(root, 'extension/background.js'),
    'utf8',
  );
  const combined = `${source}\n${pageProbe}`;
  for (const forbidden of [
    /document\.cookie/,
    /localStorage\./,
    /sessionStorage\./,
    /\.value\b/,
    /response\.(?:text|json|blob|arrayBuffer|formData)\s*\(/,
    /getRequestHeader\s*\(/,
  ]) {
    assert.doesNotMatch(combined, forbidden);
  }
});

test('all extension JavaScript parses in Node', () => {
  for (const file of ['background.js', 'content.js', 'popup.js']) {
    execFileSync(
      process.execPath,
      ['--check', resolve(root, 'extension', file)],
      { stdio: 'pipe' },
    );
  }
});

test('navigation preserves a recoverable partial recording', async () => {
  const background = await readFile(
    resolve(root, 'extension/background.js'),
    'utf8',
  );
  const content = await readFile(resolve(root, 'extension/content.js'), 'utf8');
  const popup = await readFile(resolve(root, 'extension/popup.js'), 'utf8');

  assert.match(background, /GLASSWEB_PARTIAL/);
  assert.match(background, /partialTrace/);
  assert.doesNotMatch(
    background,
    /changeInfo\.status === 'loading'\) void clearStatus/,
  );
  assert.match(content, /addEventListener\('pagehide', handlePageExit/);
  assert.match(popup, /Page changed — recording recovered/);
});
