'use client';

import { CheckCircle2, CircleDashed, HelpCircle, Radio } from 'lucide-react';

import { PageSurface } from '@/components/glassweb/page-surface';
import { cn } from '@/lib/utils';
import { getEntitiesByLayer } from '@/lib/glassweb/trace-utils';
import {
  TRACE_LAYERS,
  type EvidenceCertainty,
  type GlassWebTrace,
  type TraceEntity,
  type TraceFocus,
  type TraceLayer,
} from '@/lib/glassweb/types';

export type ViewerLens = 'system' | 'trace' | 'ai' | 'runtime';

interface ExplodedViewProps {
  trace: GlassWebTrace;
  focus: TraceFocus;
  lens: ViewerLens;
  selectedEntityId: string;
  zoom: number;
  onSelectEntity: (entityId: string) => void;
}

const certaintyMeta: Record<
  EvidenceCertainty,
  { label: string; icon: typeof CheckCircle2 }
> = {
  observed: { label: 'We saw it', icon: CheckCircle2 },
  correlated: { label: 'Best match', icon: Radio },
  inferred: { label: 'Likely', icon: CircleDashed },
  unknown: { label: "We can't tell", icon: HelpCircle },
};

const friendlyLayerNames: Record<TraceLayer, string> = {
  visible: 'What you saw',
  structure: 'The page part',
  behaviour: 'What the page did',
  network: 'What it sent',
  service: 'Where it went',
};

const paths: Record<string, string> = {
  price:
    'M315 300 C390 300 405 223 475 223 S700 225 778 225 S990 223 1068 223 S1255 236 1350 236',
  checkout:
    'M330 423 C402 423 410 289 482 289 S700 294 785 294 S993 291 1070 291 S1265 301 1350 301',
  analytics:
    'M252 168 C390 168 412 157 482 157 S694 432 782 432 S990 386 1070 386 S1260 382 1350 382',
  ai: 'M315 300 C390 300 405 223 475 223 S700 159 778 159 S990 223 1068 223 S1255 236 1350 236',
  newsletter:
    'M315 503 C396 503 410 421 480 421 S702 498 783 498 S996 451 1072 451 S1260 448 1350 448',
};

function EvidenceIcon({ certainty }: { certainty: EvidenceCertainty }) {
  const Icon = certaintyMeta[certainty].icon;
  return <Icon aria-hidden="true" className="size-3" />;
}

function LayerNode({
  entity,
  active,
  selected,
  systemMode,
  onSelect,
}: {
  entity: TraceEntity;
  active: boolean;
  selected: boolean;
  systemMode: boolean;
  onSelect: () => void;
}) {
  const metric =
    entity.attributes?.durationMs !== undefined
      ? `${entity.attributes.durationMs} ms`
      : entity.attributes?.status !== undefined
        ? `${entity.attributes.status}`
        : undefined;

  return (
    <button
      aria-pressed={selected}
      className={cn(
        'trace-node group w-full text-left',
        active && 'trace-node-active',
        selected && 'trace-node-selected',
        systemMode && 'trace-node-system',
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="flex items-start justify-between gap-3">
        <strong>{entity.humanLabel}</strong>
        {metric ? (
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
            {metric}
          </span>
        ) : null}
      </span>
      <code>{entity.technicalLabel}</code>
      <span className="mt-1.5 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        <EvidenceIcon certainty={entity.certainty} />
        {certaintyMeta[entity.certainty].label}
      </span>
    </button>
  );
}

function LayerPlane({
  layer,
  layerIndex,
  trace,
  focus,
  selectedEntityId,
  lens,
  onSelectEntity,
}: {
  layer: TraceLayer;
  layerIndex: number;
  trace: GlassWebTrace;
  focus: TraceFocus;
  selectedEntityId: string;
  lens: ViewerLens;
  onSelectEntity: (entityId: string) => void;
}) {
  const layerMeta = TRACE_LAYERS.find((item) => item.id === layer)!;
  const allEntities = getEntitiesByLayer(trace, layer);
  const entities = (
    trace.id === 'demo-orbit-pricing'
      ? allEntities
      : [...allEntities].sort((left, right) => {
          const leftScore =
            Number(focus.entityIds.includes(left.id)) * 2 +
            Number(left.id === selectedEntityId);
          const rightScore =
            Number(focus.entityIds.includes(right.id)) * 2 +
            Number(right.id === selectedEntityId);
          return rightScore - leftScore || left.firstSeen - right.firstSeen;
        })
  ).slice(0, 5);

  return (
    <section
      aria-label={friendlyLayerNames[layer]}
      className="trace-plane trace-plane-data"
      style={
        {
          '--layer-index': layerIndex,
        } as React.CSSProperties
      }
    >
      <div className="trace-plane-label justify-end gap-2">
        <span>{friendlyLayerNames[layer]}</span>
        <span className="text-primary">{layerMeta.number}</span>
      </div>
      <div className="trace-node-list">
        {entities.map((entity) => (
          <LayerNode
            active={focus.entityIds.includes(entity.id)}
            entity={entity}
            key={entity.id}
            onSelect={() => onSelectEntity(entity.id)}
            selected={selectedEntityId === entity.id}
            systemMode={lens === 'system'}
          />
        ))}
        {allEntities.length > entities.length ? (
          <p className="trace-node-overflow">
            +{allEntities.length - entities.length} more things GlassWeb found
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function ExplodedView({
  trace,
  focus,
  lens,
  selectedEntityId,
  zoom,
  onSelectEntity,
}: ExplodedViewProps) {
  const path =
    trace.id === 'demo-orbit-pricing'
      ? (paths[focus.id] ?? paths.price)
      : 'M315 285 C390 285 410 155 482 155 S700 179 782 179 S995 202 1070 202 S1260 224 1350 224';
  const active = lens !== 'system';

  return (
    <div className="exploded-scroll h-full overflow-auto">
      <div
        className={cn(
          'exploded-stage relative mx-auto min-h-[620px] min-w-[1120px] max-w-[1600px] overflow-hidden',
          lens === 'system' && 'is-system',
          lens === 'ai' && 'is-ai',
        )}
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          width: `${10000 / zoom}%`,
        }}
      >
        <div className="instrument-grid absolute inset-0" aria-hidden="true" />

        <div className="absolute left-6 top-5 z-30 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>
            {active ? 'Answering' : 'Everything GlassWeb found'}
          </span>
          <span className="h-px w-10 bg-border" />
          <span className={active ? 'text-primary' : ''}>
            {active ? focus.question : `${trace.entities.length} items`}
          </span>
        </div>

        <svg
          aria-label={`Evidence trace for ${focus.label}`}
          className={cn(
            'pointer-events-none absolute inset-0 z-20 h-full w-full transition-opacity duration-300',
            active ? 'opacity-100' : 'opacity-0',
          )}
          preserveAspectRatio="none"
          viewBox="0 0 1500 620"
        >
          <title>{focus.question}</title>
          <desc>{focus.summary}</desc>
          <path className="trace-line trace-line-halo" d={path} />
          <path className="trace-line" d={path} />
          {lens === 'ai' ? (
            <g className="ai-break">
              <circle cx="782" cy="159" r="16" />
              <path d="M774 151 L790 167 M790 151 L774 167" />
            </g>
          ) : null}
          <circle className="trace-pulse" r="5">
            <animateMotion dur="2.7s" path={path} repeatCount="indefinite" />
          </circle>
        </svg>

        <section
          aria-label="What you saw"
          className="trace-plane trace-plane-screen"
        >
          <div className="trace-plane-label">
            <span>What you saw</span>
            <span className="text-primary">00</span>
          </div>
          <PageSurface
            aiMode={lens === 'ai'}
            focus={focus}
            onSelectEntity={onSelectEntity}
            trace={trace}
          />
        </section>

        {(['structure', 'behaviour', 'network', 'service'] as TraceLayer[]).map(
          (layer, index) => (
            <LayerPlane
              focus={focus}
              key={layer}
              layer={layer}
              layerIndex={index}
              lens={lens}
              onSelectEntity={onSelectEntity}
              selectedEntityId={selectedEntityId}
              trace={trace}
            />
          ),
        )}
      </div>
    </div>
  );
}
