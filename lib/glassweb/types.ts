export const TRACE_SCHEMA_VERSION = 1 as const;

export type TraceLayer =
  | 'visible'
  | 'structure'
  | 'behaviour'
  | 'network'
  | 'service';

export type EvidenceCertainty =
  | 'observed'
  | 'correlated'
  | 'inferred'
  | 'unknown';

export type EntityKind =
  | 'visual-element'
  | 'dom-node'
  | 'interaction'
  | 'script'
  | 'request'
  | 'response'
  | 'storage-key'
  | 'route'
  | 'service';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TracePage {
  origin: string;
  url: string;
  title: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio?: number;
  };
  screenshotDataUrl?: string;
}

export interface TraceEntity {
  id: string;
  kind: EntityKind;
  layer: TraceLayer;
  humanLabel: string;
  technicalLabel: string;
  description: string;
  certainty: EvidenceCertainty;
  firstSeen: number;
  lastSeen: number;
  evidenceIds: string[];
  bounds?: Bounds;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface TraceRelation {
  id: string;
  from: string;
  to: string;
  kind:
    | 'contains'
    | 'renders'
    | 'listens-to'
    | 'triggers'
    | 'initiates'
    | 'returns'
    | 'mutates'
    | 'navigates-to'
    | 'provided-by';
  certainty: EvidenceCertainty;
  evidenceIds: string[];
  explanation: string;
}

export interface TraceEvent {
  id: string;
  timestamp: number;
  kind:
    | 'navigation'
    | 'click'
    | 'input'
    | 'submit'
    | 'request'
    | 'response'
    | 'mutation'
    | 'render';
  label: string;
  layer: TraceLayer;
  entityIds: string[];
  certainty: EvidenceCertainty;
  detail?: string;
}

export interface TraceEvidence {
  id: string;
  source: 'dom' | 'performance' | 'instrumentation' | 'cdp' | 'rule' | 'model';
  explanation: string;
  eventIds: string[];
}

export interface TraceFocus {
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

export interface RedactionReport {
  policyVersion: string;
  appliedAt: string;
  removed: string[];
  retained: string[];
}

export interface GlassWebTrace {
  schemaVersion: typeof TRACE_SCHEMA_VERSION;
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

export interface TraceValidationResult {
  ok: boolean;
  trace?: GlassWebTrace;
  errors: string[];
}

export const TRACE_LAYERS: Array<{
  id: TraceLayer;
  number: string;
  label: string;
}> = [
  { id: 'visible', number: '00', label: 'Visible' },
  { id: 'structure', number: '01', label: 'Structure' },
  { id: 'behaviour', number: '02', label: 'Behaviour' },
  { id: 'network', number: '03', label: 'Network' },
  { id: 'service', number: '04', label: 'Service' },
];
