'use client';

import { ArrowUpRight, Check, Radio, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { GlassWebTrace, TraceFocus } from '@/lib/glassweb/types';

interface PageSurfaceProps {
  trace: GlassWebTrace;
  focus: TraceFocus;
  aiMode: boolean;
  onSelectEntity: (entityId: string) => void;
}

const focusButton = (active: boolean, hiddenFromAi = false, aiMode = false) =>
  cn(
    'relative outline-none transition-[box-shadow,opacity,filter] duration-300',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    active &&
      'z-10 shadow-[0_0_0_1px_var(--primary),0_0_36px_var(--signal-glow)]',
    aiMode && hiddenFromAi && 'opacity-20 grayscale',
  );

function OrbitPricingSurface({
  focus,
  aiMode,
  onSelectEntity,
}: Omit<PageSurfaceProps, 'trace'>) {
  const selected = focus.surfaceEntityId;

  return (
    <div className="flex h-full min-h-[452px] flex-col overflow-hidden border border-border bg-[#f0f1ec] text-[#111615]">
      <nav className="flex h-12 shrink-0 items-center justify-between border-b border-black/10 px-4">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center bg-[#111615] text-[8px] font-semibold text-white">
            O
          </span>
          <span className="text-[11px] font-semibold tracking-[0.18em]">
            ORBIT
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-medium uppercase tracking-wider text-black/50">
          <span>Product</span>
          <span>Docs</span>
          <span>Pricing</span>
        </div>
      </nav>

      <div className="relative flex-1 px-4 pb-4 pt-5">
        {aiMode ? (
          <div className="pointer-events-none absolute inset-0 z-20 bg-[repeating-linear-gradient(180deg,transparent_0,transparent_5px,rgba(17,22,21,.035)_6px)]" />
        ) : null}

        <button
          aria-label="Inspect the complete pricing page"
          aria-pressed={selected === 'visible-page'}
          className={cn(
            'absolute inset-0 h-full w-full',
            focusButton(selected === 'visible-page'),
          )}
          onClick={() => onSelectEntity('visible-page')}
          type="button"
        />

        <div className="pointer-events-none relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40">
                Pricing / South Africa
              </p>
              <h2 className="mt-1 max-w-[290px] text-[23px] font-medium leading-[1.08] tracking-[-0.04em]">
                Infrastructure intelligence without the noise.
              </h2>
            </div>
            <button
              aria-label="Inspect annual billing control"
              aria-pressed={selected === 'visible-toggle'}
              className={cn(
                'pointer-events-auto flex h-7 items-center gap-1.5 border border-black/15 bg-white/65 px-2 text-[9px] font-medium',
                focusButton(selected === 'visible-toggle'),
              )}
              onClick={() => onSelectEntity('visible-toggle')}
              type="button"
            >
              <span className="size-2 bg-[#11a7a3]" /> Annual · save 20%
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="border border-black/10 bg-white/50 p-3">
              <p className="text-[9px] uppercase tracking-wider text-black/45">
                Signal
              </p>
              <p className="mt-3 text-lg font-medium">Free</p>
              <p className="mt-1 text-[9px] text-black/45">
                For local prototypes
              </p>
              <div className="mt-4 space-y-2 text-[9px] text-black/55">
                <p>One project</p>
                <p>24-hour history</p>
              </div>
            </div>

            <div className="relative border border-[#0a8483]/45 bg-[#e4f2ef] p-3 shadow-[0_10px_32px_rgba(10,132,131,.12)]">
              <div className="absolute right-2 top-2 flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-[#08706f]">
                <Radio className="size-2.5" /> Live
              </div>
              <p className="text-[9px] uppercase tracking-wider text-black/45">
                Pro
              </p>
              <button
                aria-label="Inspect the regional Pro price"
                aria-pressed={selected === 'visible-price'}
                className={cn(
                  'pointer-events-auto mt-3 block w-full text-left',
                  focusButton(selected === 'visible-price', true, aiMode),
                )}
                onClick={() => onSelectEntity('visible-price')}
                type="button"
              >
                {aiMode ? (
                  <span className="block border border-dashed border-[#a13b32]/55 px-1 py-1 text-[8px] font-medium text-[#8c342d]">
                    Not present in server HTML
                  </span>
                ) : (
                  <>
                    <span className="text-lg font-medium">R 1,499</span>
                    <span className="ml-1 text-[9px] text-black/45">
                      / month
                    </span>
                  </>
                )}
              </button>
              <p className="mt-1 text-[9px] text-black/45">
                For shipping products
              </p>
              <div className="mt-3 space-y-1.5 text-[9px] text-black/60">
                <p className="flex items-center gap-1.5">
                  <Check className="size-2.5" /> Unlimited traces
                </p>
                <p className="flex items-center gap-1.5">
                  <Check className="size-2.5" /> 30-day replay
                </p>
                <p className="flex items-center gap-1.5">
                  <Check className="size-2.5" /> AI visibility
                </p>
              </div>
              <button
                aria-label="Inspect Start Pro checkout"
                aria-pressed={selected === 'visible-cta'}
                className={cn(
                  'pointer-events-auto mt-4 flex h-8 w-full items-center justify-center gap-1 bg-[#101615] text-[9px] font-medium text-white',
                  focusButton(selected === 'visible-cta', true, aiMode),
                )}
                onClick={() => onSelectEntity('visible-cta')}
                type="button"
              >
                Start Pro <ArrowUpRight className="size-2.5" />
              </button>
            </div>

            <div className="border border-black/10 bg-white/50 p-3">
              <p className="text-[9px] uppercase tracking-wider text-black/45">
                Scale
              </p>
              <p className="mt-3 text-lg font-medium">Custom</p>
              <p className="mt-1 text-[9px] text-black/45">For growing teams</p>
              <div className="mt-4 space-y-2 text-[9px] text-black/55">
                <p>Shared evidence</p>
                <p>90-day history</p>
              </div>
            </div>
          </div>

          <button
            aria-label="Inspect product updates form"
            aria-pressed={selected === 'visible-newsletter'}
            className={cn(
              'pointer-events-auto mt-3 flex w-full items-center justify-between border border-black/10 bg-white/45 px-3 py-2 text-left',
              focusButton(selected === 'visible-newsletter'),
            )}
            onClick={() => onSelectEntity('visible-newsletter')}
            type="button"
          >
            <span>
              <span className="block text-[9px] font-medium">
                Product field notes
              </span>
              <span className="block text-[8px] text-black/40">
                One useful email each month
              </span>
            </span>
            <span className="flex items-center gap-1 text-[8px] font-medium uppercase tracking-wider">
              Subscribe <Sparkles className="size-2.5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CapturedSurface({
  trace,
  focus,
  onSelectEntity,
}: Omit<PageSurfaceProps, 'aiMode'>) {
  const visualEntities = trace.entities.filter(
    (entity) => entity.layer === 'visible' && entity.bounds,
  );
  const visibleOverlays = [...visualEntities]
    .sort((left, right) => {
      const leftScore = Number(focus.entityIds.includes(left.id));
      const rightScore = Number(focus.entityIds.includes(right.id));
      return rightScore - leftScore || left.firstSeen - right.firstSeen;
    })
    .slice(0, 80);

  return (
    <div className="relative h-full min-h-[452px] overflow-hidden border border-border bg-background">
      {trace.page.screenshotDataUrl ? (
        // Imported data URLs are size-capped and validated before this component renders.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`Captured view of ${trace.page.title}`}
          className="h-full w-full object-contain object-top opacity-80"
          src={trace.page.screenshotDataUrl}
        />
      ) : (
        <div className="grid h-full place-items-center p-8 text-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Captured document
            </p>
            <p className="mt-3 text-lg font-medium">{trace.page.title}</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              This trace does not contain a screenshot. Select a recorded
              element to unfold its evidence.
            </p>
          </div>
        </div>
      )}

      {visibleOverlays.map((entity) => {
        const bounds = entity.bounds!;
        return (
          <button
            aria-label={`Inspect ${entity.humanLabel}`}
            className={cn(
              'absolute border border-primary/65 bg-primary/8 transition-colors hover:bg-primary/16',
              focus.entityIds.includes(entity.id) &&
                'shadow-[0_0_0_1px_var(--primary),0_0_24px_var(--signal-glow)]',
            )}
            key={entity.id}
            onClick={() => onSelectEntity(entity.id)}
            style={{
              left: `${(bounds.x / trace.page.viewport.width) * 100}%`,
              top: `${(bounds.y / trace.page.viewport.height) * 100}%`,
              width: `${(bounds.width / trace.page.viewport.width) * 100}%`,
              height: `${(bounds.height / trace.page.viewport.height) * 100}%`,
            }}
            type="button"
          >
            <span className="sr-only">{entity.humanLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PageSurface(props: PageSurfaceProps) {
  return props.trace.id === 'demo-orbit-pricing' ? (
    <OrbitPricingSurface
      aiMode={props.aiMode}
      focus={props.focus}
      onSelectEntity={props.onSelectEntity}
    />
  ) : (
    <CapturedSurface
      focus={props.focus}
      onSelectEntity={props.onSelectEntity}
      trace={props.trace}
    />
  );
}
