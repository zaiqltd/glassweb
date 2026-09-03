# GlassWeb trace format v1

A GlassWeb trace is a portable UTF-8 JSON document, conventionally named `*.glassweb.json`. Version 1 contains everything required to reopen the recorded explanation without contacting the captured website.

The TypeScript source of truth is [`lib/glassweb/types.ts`](../lib/glassweb/types.ts). Import validation lives in [`lib/glassweb/trace-utils.ts`](../lib/glassweb/trace-utils.ts).

## Top-level record

```ts
interface GlassWebTrace {
  schemaVersion: 1;
  id: string;
  title: string;
  createdAt: string;
  durationMs: number;
  page: TracePage;
  entities: TraceEntity[];
  relations: TraceRelation[];
  events: TraceEvent[];
  evidence: TraceEvidence[];
  focuses: TraceFocus[];
  redaction: RedactionReport;
}
```

## Page

`page` holds a redacted HTTP(S) URL, origin, title, and capture viewport. `screenshotDataUrl` is optional and may contain only bounded base64 PNG, JPEG, or WebP data. SVG and remote image URLs are rejected.

## Entities

An entity is one understandable object in exactly one layer.

```ts
interface TraceEntity {
  id: string;
  kind:
    | 'visual-element'
    | 'dom-node'
    | 'interaction'
    | 'script'
    | 'request'
    | 'response'
    | 'storage-key'
    | 'route'
    | 'service';
  layer: 'visible' | 'structure' | 'behaviour' | 'network' | 'service';
  humanLabel: string;
  technicalLabel: string;
  description: string;
  certainty: 'observed' | 'correlated' | 'inferred' | 'unknown';
  firstSeen: number;
  lastSeen: number;
  evidenceIds: string[];
  bounds?: { x: number; y: number; width: number; height: number };
  attributes?: Record<string, string | number | boolean | null>;
}
```

`humanLabel` explains the object. `technicalLabel` preserves the redacted raw identity. Both are required.

## Relations

Relations form the evidence graph. Supported kinds are:

```text
contains · renders · listens-to · triggers · initiates
returns · mutates · navigates-to · provided-by
```

Each relation names `from` and `to` entity IDs, has its own certainty, includes a plain-language explanation, and references at least one evidence record in production traces.

Direction describes how the viewer reads the story; it is not a generic ontology. For example, an interaction `initiates` a request and a request is `provided-by` a service.

## Events and evidence

Events are the time axis. They record browser-observed navigation, click, input, submit, request, response, mutation, and render moments. `timestamp` is milliseconds from trace start.

Evidence explains why an entity or relation exists:

```ts
interface TraceEvidence {
  id: string;
  source: 'dom' | 'performance' | 'instrumentation' | 'cdp' | 'rule' | 'model';
  explanation: string;
  eventIds: string[];
}
```

Evidence IDs referenced by entities or relations must exist. Event and graph references must resolve inside the same trace. The importer rejects dangling references.

## Focus stories

A focus is a recorded explanation path rather than a new fact:

```ts
interface TraceFocus {
  id: string;
  label: string;
  question: string;
  summary: string;
  detail: string;
  entityIds: string[];
  relationIds: string[];
  surfaceEntityId: string;
  suggestedLens?: 'trace' | 'ai' | 'runtime';
  finding?: string;
}
```

Queries and future model integrations may choose a focus or a subset of existing IDs. They must not introduce entities or relations that are absent from the trace.

## Minimal example

```json
{
  "schemaVersion": 1,
  "id": "trace-example",
  "title": "Example button",
  "createdAt": "2026-09-03T00:00:00.000Z",
  "durationMs": 420,
  "page": {
    "origin": "https://example.test",
    "url": "https://example.test/pricing",
    "title": "Pricing",
    "viewport": { "width": 1440, "height": 900 }
  },
  "entities": [],
  "relations": [],
  "events": [],
  "evidence": [],
  "focuses": [],
  "redaction": {
    "policyVersion": "glassweb-safe-metadata-v1",
    "appliedAt": "2026-09-03T00:00:00.420Z",
    "removed": ["Form and input values"],
    "retained": ["Request timing"]
  }
}
```

This snippet shows the envelope only and intentionally does not pass validation: a useful trace requires at least one entity and one focus story.

## Compatibility

- Readers must reject unsupported major schema versions.
- New optional fields may be added within version 1 when old readers can safely ignore them.
- Renaming kinds, changing relation meaning, or weakening certainty semantics requires a new schema version.
- Producers should keep IDs stable inside one trace; IDs have no global meaning.

## Privacy requirements for producers

Version compatibility does not imply a trace is safe to share. Producers should redact before persistence, impose byte and object caps, and include an accurate redaction report. The first-party recorder excludes values, bodies, headers, cookies, storage contents, query values, and fragments by default.
