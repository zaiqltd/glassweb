import {
  TRACE_LAYERS,
  TRACE_SCHEMA_VERSION,
  type GlassWebTrace,
  type TraceEntity,
  type TraceFocus,
  type TraceLayer,
  type TraceValidationResult,
} from './types';

const OBJECT_LIMIT = 12_000;
const EVENT_LIMIT = 30_000;
const STRING_LIMIT = 4_000;
const SCREENSHOT_LIMIT = 6_500_000;

const certaintyValues = new Set([
  'observed',
  'correlated',
  'inferred',
  'unknown',
]);
const entityKindValues = new Set([
  'visual-element',
  'dom-node',
  'interaction',
  'script',
  'request',
  'response',
  'storage-key',
  'route',
  'service',
]);
const relationKindValues = new Set([
  'contains',
  'renders',
  'listens-to',
  'triggers',
  'initiates',
  'returns',
  'mutates',
  'navigates-to',
  'provided-by',
]);
const eventKindValues = new Set([
  'navigation',
  'click',
  'input',
  'submit',
  'request',
  'response',
  'mutation',
  'render',
]);
const evidenceSourceValues = new Set([
  'dom',
  'performance',
  'instrumentation',
  'cdp',
  'rule',
  'model',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isShortString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= STRING_LIMIT;

const isLayer = (value: unknown): value is TraceLayer =>
  TRACE_LAYERS.some((layer) => layer.id === value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isStringArray = (
  value: unknown,
  limit = OBJECT_LIMIT,
): value is string[] =>
  Array.isArray(value) &&
  value.length <= limit &&
  value.every((item) => isShortString(item));

const isWebUrl = (value: unknown) => {
  if (!isShortString(value)) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const isValidBounds = (value: unknown) => {
  if (!isRecord(value)) return false;
  return (
    ['x', 'y', 'width', 'height'].every((key) => isFiniteNumber(value[key])) &&
    Number(value.width) >= 0 &&
    Number(value.height) >= 0
  );
};

const addDuplicateError = (
  ids: Set<string>,
  id: string,
  kind: string,
  errors: string[],
) => {
  if (ids.has(id)) errors.push(`Duplicate ${kind} id: ${id}`);
  ids.add(id);
};

export function validateTrace(input: unknown): TraceValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ['The imported file is not a JSON object.'] };
  }

  if (input.schemaVersion !== TRACE_SCHEMA_VERSION) {
    errors.push(
      `Unsupported schema version. GlassWeb currently opens version ${TRACE_SCHEMA_VERSION}.`,
    );
  }

  if (!isShortString(input.id)) errors.push('Trace id is missing or invalid.');
  if (!isShortString(input.title))
    errors.push('Trace title is missing or invalid.');
  if (!isShortString(input.createdAt))
    errors.push('Trace creation time is missing or invalid.');
  if (!isFiniteNumber(input.durationMs) || input.durationMs <= 0) {
    errors.push('Trace duration must be a positive number.');
  }

  if (!isRecord(input.page)) {
    errors.push('Trace page metadata is missing.');
  } else {
    if (!isWebUrl(input.page.origin) || !isWebUrl(input.page.url)) {
      errors.push('Trace page URLs must use HTTP or HTTPS.');
    }
    if (!isShortString(input.page.title))
      errors.push('Trace page title is missing.');
    const viewport = input.page.viewport;
    if (
      !isRecord(viewport) ||
      !isFiniteNumber(viewport.width) ||
      !isFiniteNumber(viewport.height) ||
      viewport.width <= 0 ||
      viewport.height <= 0 ||
      viewport.width > 20_000 ||
      viewport.height > 20_000
    ) {
      errors.push('Trace viewport is missing or outside safe bounds.');
    }
    if (
      input.page.screenshotDataUrl !== undefined &&
      (typeof input.page.screenshotDataUrl !== 'string' ||
        input.page.screenshotDataUrl.length > SCREENSHOT_LIMIT ||
        !/^data:image\/(?:png|jpe?g|webp);base64,/i.test(
          input.page.screenshotDataUrl,
        ))
    ) {
      errors.push('Trace screenshot is not a supported, bounded image.');
    }
  }

  const entities = Array.isArray(input.entities) ? input.entities : [];
  const relations = Array.isArray(input.relations) ? input.relations : [];
  const events = Array.isArray(input.events) ? input.events : [];
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const focuses = Array.isArray(input.focuses) ? input.focuses : [];

  if (entities.length === 0) errors.push('Trace has no entities.');
  if (entities.length > OBJECT_LIMIT)
    errors.push('Trace contains too many entities.');
  if (relations.length > OBJECT_LIMIT * 3)
    errors.push('Trace contains too many relations.');
  if (events.length > EVENT_LIMIT)
    errors.push('Trace contains too many events.');
  if (evidence.length > EVENT_LIMIT)
    errors.push('Trace contains too many evidence records.');
  if (focuses.length > OBJECT_LIMIT)
    errors.push('Trace contains too many focus stories.');

  const entityIds = new Set<string>();
  for (const candidate of entities) {
    if (!isRecord(candidate) || !isShortString(candidate.id)) {
      errors.push('One or more entities have no valid id.');
      continue;
    }
    addDuplicateError(entityIds, candidate.id, 'entity', errors);
    if (!isLayer(candidate.layer)) {
      errors.push(`Entity ${candidate.id} has an invalid layer.`);
    }
    if (!entityKindValues.has(String(candidate.kind))) {
      errors.push(`Entity ${candidate.id} has an invalid kind.`);
    }
    if (!certaintyValues.has(String(candidate.certainty))) {
      errors.push(`Entity ${candidate.id} has invalid certainty.`);
    }
    if (!isShortString(candidate.humanLabel)) {
      errors.push(`Entity ${candidate.id} has no readable label.`);
    }
    if (
      !isShortString(candidate.technicalLabel) ||
      !isShortString(candidate.description) ||
      !isFiniteNumber(candidate.firstSeen) ||
      !isFiniteNumber(candidate.lastSeen) ||
      !isStringArray(candidate.evidenceIds) ||
      candidate.evidenceIds.length === 0
    ) {
      errors.push(`Entity ${candidate.id} has malformed evidence metadata.`);
    }
    if (candidate.bounds !== undefined && !isValidBounds(candidate.bounds)) {
      errors.push(`Entity ${candidate.id} has invalid visible bounds.`);
    }
    if (
      candidate.attributes !== undefined &&
      (!isRecord(candidate.attributes) ||
        Object.keys(candidate.attributes).length > 100 ||
        Object.values(candidate.attributes).some(
          (value) =>
            (!['string', 'number', 'boolean'].includes(typeof value) &&
              value !== null) ||
            (typeof value === 'string' && value.length > STRING_LIMIT) ||
            (typeof value === 'number' && !Number.isFinite(value)),
        ))
    ) {
      errors.push(`Entity ${candidate.id} has invalid attributes.`);
    }
  }

  const relationIds = new Set<string>();
  for (const candidate of relations) {
    if (!isRecord(candidate) || !isShortString(candidate.id)) {
      errors.push('One or more relations are invalid.');
      continue;
    }
    addDuplicateError(relationIds, candidate.id, 'relation', errors);
    if (!isShortString(candidate.from) || !entityIds.has(candidate.from)) {
      errors.push('A relation points from an unknown entity.');
    }
    if (!isShortString(candidate.to) || !entityIds.has(candidate.to)) {
      errors.push('A relation points to an unknown entity.');
    }
    if (
      !relationKindValues.has(String(candidate.kind)) ||
      !certaintyValues.has(String(candidate.certainty)) ||
      !isStringArray(candidate.evidenceIds) ||
      candidate.evidenceIds.length === 0 ||
      !isShortString(candidate.explanation)
    ) {
      errors.push(`Relation ${candidate.id} has malformed evidence metadata.`);
    }
  }

  const eventIds = new Set<string>();
  for (const candidate of events) {
    if (!isRecord(candidate) || !isShortString(candidate.id)) {
      errors.push('One or more events are invalid.');
      continue;
    }
    addDuplicateError(eventIds, candidate.id, 'event', errors);
    if (
      !isFiniteNumber(candidate.timestamp) ||
      candidate.timestamp < 0 ||
      !eventKindValues.has(String(candidate.kind)) ||
      !isShortString(candidate.label) ||
      !isLayer(candidate.layer) ||
      !certaintyValues.has(String(candidate.certainty)) ||
      !isStringArray(candidate.entityIds) ||
      candidate.entityIds.some((id) => !entityIds.has(id))
    ) {
      errors.push(
        `Event ${candidate.id} is malformed or points to unknown entities.`,
      );
    }
  }

  const evidenceIds = new Set<string>();
  for (const candidate of evidence) {
    if (!isRecord(candidate) || !isShortString(candidate.id)) {
      errors.push('One or more evidence records are invalid.');
      continue;
    }
    addDuplicateError(evidenceIds, candidate.id, 'evidence', errors);
    if (
      !evidenceSourceValues.has(String(candidate.source)) ||
      !isShortString(candidate.explanation) ||
      !isStringArray(candidate.eventIds) ||
      candidate.eventIds.some((id) => !eventIds.has(id))
    ) {
      errors.push(
        `Evidence ${candidate.id} is malformed or points to unknown events.`,
      );
    }
  }

  for (const candidate of [...entities, ...relations]) {
    if (!isRecord(candidate) || !Array.isArray(candidate.evidenceIds)) continue;
    if (candidate.evidenceIds.some((id) => !evidenceIds.has(String(id)))) {
      errors.push(`Record ${String(candidate.id)} points to missing evidence.`);
    }
  }

  if (focuses.length === 0) {
    errors.push('Trace has no focus stories.');
  }
  const focusIds = new Set<string>();
  for (const candidate of focuses) {
    if (!isRecord(candidate) || !isShortString(candidate.id)) {
      errors.push('One or more focus stories are invalid.');
      continue;
    }
    addDuplicateError(focusIds, candidate.id, 'focus', errors);
    if (
      !isShortString(candidate.label) ||
      !isShortString(candidate.question) ||
      !isShortString(candidate.summary) ||
      !isShortString(candidate.detail) ||
      !isShortString(candidate.surfaceEntityId) ||
      !entityIds.has(candidate.surfaceEntityId) ||
      !isStringArray(candidate.entityIds) ||
      candidate.entityIds.some((id) => !entityIds.has(id)) ||
      !isStringArray(candidate.relationIds) ||
      candidate.relationIds.some((id) => !relationIds.has(id))
    ) {
      errors.push(
        `Focus ${candidate.id} is malformed or references unknown evidence.`,
      );
    }
    if (
      candidate.suggestedLens !== undefined &&
      (typeof candidate.suggestedLens !== 'string' ||
        !['trace', 'ai', 'runtime'].includes(candidate.suggestedLens))
    ) {
      errors.push(`Focus ${candidate.id} has an invalid suggested lens.`);
    }
  }

  if (!isRecord(input.redaction)) {
    errors.push('Trace redaction report is missing.');
  } else if (
    !isShortString(input.redaction.policyVersion) ||
    !isShortString(input.redaction.appliedAt) ||
    !isStringArray(input.redaction.removed, 100) ||
    !isStringArray(input.redaction.retained, 100)
  ) {
    errors.push('Trace redaction report is malformed.');
  }

  return errors.length > 0
    ? { ok: false, errors: [...new Set(errors)].slice(0, 8) }
    : { ok: true, trace: input as unknown as GlassWebTrace, errors: [] };
}

export function getEntityMap(trace: GlassWebTrace) {
  return new Map(trace.entities.map((entity) => [entity.id, entity]));
}

export function getRelationMap(trace: GlassWebTrace) {
  return new Map(trace.relations.map((relation) => [relation.id, relation]));
}

export function getEntitiesByLayer(trace: GlassWebTrace, layer: TraceLayer) {
  return trace.entities.filter((entity) => entity.layer === layer);
}

export function getFocus(trace: GlassWebTrace, id: string | undefined) {
  return trace.focuses.find((focus) => focus.id === id) ?? trace.focuses[0];
}

export function getFocusForEntity(
  trace: GlassWebTrace,
  entityId: string,
): TraceFocus | undefined {
  return trace.focuses.find(
    (focus) =>
      focus.surfaceEntityId === entityId || focus.entityIds.includes(entityId),
  );
}

export function getSelectedEntities(
  trace: GlassWebTrace,
  focus: TraceFocus,
): TraceEntity[] {
  const map = getEntityMap(trace);
  return focus.entityIds
    .map((id) => map.get(id))
    .filter((entity): entity is TraceEntity => Boolean(entity));
}

export function findFocusFromQuestion(
  trace: GlassWebTrace,
  question: string,
): TraceFocus | undefined {
  const normalized = question.toLowerCase();
  const stopWords = new Set([
    'about',
    'does',
    'from',
    'happen',
    'how',
    'into',
    'page',
    'recording',
    'that',
    'this',
    'what',
    'when',
    'where',
    'which',
    'who',
    'why',
    'website',
  ]);
  const normalizedTokens = new Set(normalized.split(/\W+/).filter(Boolean));
  const matchesTerm = (term: string) =>
    term.includes(' ') ? normalized.includes(term) : normalizedTokens.has(term);
  const intentRules: Array<[string[], string]> = [
    [['price', 'cost', 'amount', 'region', 'currency'], 'price'],
    [['checkout', 'pay', 'buy', 'start pro', 'subscribe'], 'checkout'],
    [['track', 'analytics', 'outside', 'third party', 'data'], 'analytics'],
    [['ai', 'crawler', 'chatgpt', 'googlebot', 'javascript'], 'ai'],
    [['email', 'newsletter', 'updates', 'klaviyo'], 'newsletter'],
  ];

  for (const [terms, focusId] of intentRules) {
    const candidate = trace.focuses.find((focus) => focus.id === focusId);
    if (candidate && terms.some(matchesTerm)) {
      return candidate;
    }
  }

  const questionTerms = new Set(
    normalized
      .split(/\W+/)
      .filter((term) => term.length >= 3 && !stopWords.has(term)),
  );
  const scored = trace.focuses
    .map((focus) => {
      const haystack =
        `${focus.label} ${focus.question} ${focus.summary}`.toLowerCase();
      const focusTerms = new Set(haystack.split(/\W+/).filter(Boolean));
      const score = [...questionTerms].filter((term) =>
        focusTerms.has(term),
      ).length;
      return { focus, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score ? scored[0].focus : undefined;
}

export function getBestStartingFocus(trace: GlassWebTrace): TraceFocus {
  const entityMap = getEntityMap(trace);
  return (
    [...trace.focuses].sort((left, right) => {
      const score = (focus: TraceFocus) => {
        const layers = focus.entityIds
          .map((id) => entityMap.get(id)?.layer)
          .filter(Boolean);
        return (
          Number(layers.includes('service')) * 5 +
          Number(layers.includes('network')) * 4 +
          Number(layers.includes('behaviour')) * 2 +
          Number(focus.relationIds.length > 0) -
          Number(
            focus.question.toLowerCase().includes('what makes this page'),
          ) *
            6
        );
      };
      return score(right) - score(left);
    })[0] ?? trace.focuses[0]
  );
}

export function createAgentBrief(trace: GlassWebTrace, focus: TraceFocus) {
  const entityMap = getEntityMap(trace);
  const relationMap = getRelationMap(trace);
  const steps = focus.relationIds
    .map((id) => relationMap.get(id))
    .filter((relation) => Boolean(relation))
    .map((relation, index) => {
      const from = entityMap.get(relation!.from)?.humanLabel ?? relation!.from;
      const to = entityMap.get(relation!.to)?.humanLabel ?? relation!.to;
      return `${index + 1}. ${from} -> ${to} [${relation!.certainty}]`;
    });

  return [
    '# GlassWeb evidence packet',
    `Page: ${trace.page.url}`,
    `Question: ${focus.question}`,
    `Finding: ${focus.summary}`,
    '',
    'Recorded path:',
    ...(steps.length > 0 ? steps : ['No connected path was recorded.']),
    '',
    `Context: ${focus.detail}`,
    '',
    'Please identify the most likely cause and the smallest safe fix. Do not claim server behavior or causality that is not supported by the recorded certainty labels.',
  ].join('\n');
}

export function certaintyCounts(trace: GlassWebTrace, focus: TraceFocus) {
  const relationMap = getRelationMap(trace);
  return focus.relationIds.reduce(
    (counts, id) => {
      const certainty = relationMap.get(id)?.certainty ?? 'unknown';
      counts[certainty] += 1;
      return counts;
    },
    { observed: 0, correlated: 0, inferred: 0, unknown: 0 },
  );
}

export function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/https?:\/\//g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'glassweb-trace'
  );
}

export function serializeTrace(trace: GlassWebTrace) {
  return `${JSON.stringify(trace, null, 2)}\n`;
}
