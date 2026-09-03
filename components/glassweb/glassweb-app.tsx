'use client';

import {
  Activity,
  Bot,
  Braces,
  ChevronDown,
  CircleDot,
  Download,
  Focus,
  Import,
  Maximize2,
  Pause,
  Play,
  ScanLine,
  ScanSearch,
  Share2,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  type ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ExplodedView,
  type ViewerLens,
} from '@/components/glassweb/exploded-view';
import { RuntimeWeave } from '@/components/glassweb/runtime-weave';
import {
  CaptureDialog,
  EvidenceDialog,
  RedactionDialog,
} from '@/components/glassweb/trace-dialogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { demoTrace } from '@/lib/glassweb/demo-trace';
import {
  certaintyCounts,
  findFocusFromQuestion,
  getEntityMap,
  getFocus,
  getFocusForEntity,
  safeFileName,
  serializeTrace,
  validateTrace,
} from '@/lib/glassweb/trace-utils';
import type { GlassWebTrace } from '@/lib/glassweb/types';

const lenses: Array<{ id: ViewerLens; label: string; icon: typeof Focus }> = [
  { id: 'system', label: 'System', icon: Braces },
  { id: 'trace', label: 'Trace', icon: Focus },
  { id: 'ai', label: 'AI view', icon: Bot },
  { id: 'runtime', label: 'Runtime', icon: Activity },
];

const demoTourSteps: Array<{ focusId: string; lens: ViewerLens }> = [
  { focusId: 'price', lens: 'trace' },
  { focusId: 'checkout', lens: 'trace' },
  { focusId: 'analytics', lens: 'trace' },
  { focusId: 'ai', lens: 'ai' },
  { focusId: 'checkout', lens: 'runtime' },
];

const questionSuggestions = [
  'Where does this price come from?',
  'What happens when I click Start Pro?',
  'Which outside companies receive data?',
  'What can an AI crawler actually see?',
];

function IconButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      aria-label={label}
      size="icon-sm"
      title={label}
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
}

export function GlassWebApp() {
  const [trace, setTrace] = useState<GlassWebTrace>(demoTrace);
  const [focusId, setFocusId] = useState('price');
  const [selectedEntityId, setSelectedEntityId] = useState('visible-price');
  const [lens, setLens] = useState<ViewerLens>('trace');
  const [zoom, setZoom] = useState(100);
  const [question, setQuestion] = useState('');
  const [playhead, setPlayhead] = useState(0);
  const [runtimePlaying, setRuntimePlaying] = useState(false);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [redactionOpen, setRedactionOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [queryFocused, setQueryFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const focus = useMemo(() => getFocus(trace, focusId), [trace, focusId]);
  const entityMap = useMemo(() => getEntityMap(trace), [trace]);
  const selectedEntity = entityMap.get(selectedEntityId);
  const counts = useMemo(() => certaintyCounts(trace, focus), [trace, focus]);
  const activeQuestionSuggestions = useMemo(
    () =>
      trace.id === 'demo-orbit-pricing'
        ? questionSuggestions
        : trace.focuses.slice(0, 4).map((item) => item.question),
    [trace],
  );
  const tourSteps = useMemo(
    () =>
      trace.id === 'demo-orbit-pricing'
        ? demoTourSteps
        : trace.focuses.slice(0, 5).map((item, index) => ({
            focusId: item.id,
            lens:
              index === Math.min(4, trace.focuses.length - 1)
                ? ('runtime' as const)
                : (item.suggestedLens ?? ('trace' as const)),
          })),
    [trace],
  );

  const announce = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const chooseFocus = useCallback(
    (nextFocusId: string, requestedLens?: ViewerLens) => {
      const nextFocus = getFocus(trace, nextFocusId);
      setFocusId(nextFocus.id);
      setSelectedEntityId(nextFocus.surfaceEntityId);
      setLens(requestedLens ?? nextFocus.suggestedLens ?? 'trace');
    },
    [trace],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const parameters = new URLSearchParams(window.location.search);
      const requestedFocus = parameters.get('focus');
      const requestedLens = parameters.get('lens') as ViewerLens | null;
      const validLens =
        requestedLens &&
        lenses.some((candidate) => candidate.id === requestedLens);
      if (
        requestedFocus &&
        trace.focuses.some((candidate) => candidate.id === requestedFocus)
      ) {
        chooseFocus(requestedFocus, validLens ? requestedLens : undefined);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chooseFocus, trace.focuses]);

  useEffect(() => {
    if (!tourPlaying) return;
    const timer = window.setTimeout(() => {
      const nextIndex = tourIndex + 1;
      if (nextIndex >= tourSteps.length) {
        setTourPlaying(false);
        setTourIndex(0);
        return;
      }
      const step = tourSteps[nextIndex];
      setTourIndex(nextIndex);
      chooseFocus(step.focusId, step.lens);
      setPlayhead(step.lens === 'runtime' ? 4200 : 0);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [chooseFocus, tourIndex, tourPlaying, tourSteps]);

  useEffect(() => {
    if (!runtimePlaying) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      setPlayhead((current) => {
        const next = current + elapsed;
        if (next >= trace.durationMs) {
          setRuntimePlaying(false);
          return trace.durationMs;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [runtimePlaying, trace.durationMs]);

  const handleEntitySelect = (entityId: string) => {
    setSelectedEntityId(entityId);
    const matchingFocus = getFocusForEntity(trace, entityId);
    if (matchingFocus) {
      setFocusId(matchingFocus.id);
      if (lens === 'system') setLens(matchingFocus.suggestedLens ?? 'trace');
    }
  };

  const runQuestion = (value = question) => {
    if (!value.trim()) return;
    const match = findFocusFromQuestion(trace, value);
    chooseFocus(match.id, match.suggestedLens ?? 'trace');
    setQuestion('');
    setQueryFocused(false);
    announce(`Focused the evidence for “${match.label}”.`);
  };

  const handleQuestionSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    runQuestion();
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      announce('That trace is larger than the safe 8 MB import limit.');
      return;
    }

    try {
      const validation = validateTrace(
        JSON.parse(await file.text()) as unknown,
      );
      if (!validation.ok || !validation.trace) {
        announce(
          validation.errors[0] ?? 'That file is not a valid GlassWeb trace.',
        );
        return;
      }
      const imported = validation.trace;
      const firstFocus = imported.focuses[0];
      setTrace(imported);
      setFocusId(firstFocus.id);
      setSelectedEntityId(firstFocus.surfaceEntityId);
      setLens(firstFocus.suggestedLens ?? 'trace');
      setPlayhead(0);
      announce(`Opened “${imported.title}” offline.`);
    } catch {
      announce('GlassWeb could not read that JSON file.');
    }
  };

  const exportTrace = () => {
    const blob = new Blob([serializeTrace(trace)], {
      type: 'application/json',
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `${safeFileName(trace.title)}.glassweb.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setRedactionOpen(false);
    announce('Redacted trace exported.');
  };

  const shareView = async () => {
    if (trace.id !== 'demo-orbit-pricing') {
      setRedactionOpen(true);
      announce('Live captures are shared as explicit, redacted trace files.');
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('focus', focus.id);
    url.searchParams.set('lens', lens);
    try {
      await navigator.clipboard.writeText(url.toString());
      announce('Replay link copied.');
    } catch {
      announce('Copy was blocked by this browser.');
    }
  };

  const startTour = () => {
    if (tourPlaying) {
      setTourPlaying(false);
      return;
    }
    setTourIndex(0);
    setTourPlaying(true);
    chooseFocus(tourSteps[0].focusId, tourSteps[0].lens);
  };

  const toggleRuntime = () => {
    if (playhead >= trace.durationMs) setPlayhead(0);
    setRuntimePlaying((current) => !current);
  };

  return (
    <main className="glassweb-app flex min-h-screen flex-col bg-background text-foreground">
      <input
        accept=".json,.glassweb,.glassweb.json,application/json"
        className="sr-only"
        onChange={handleImport}
        ref={fileInputRef}
        type="file"
      />

      <header className="glassweb-header">
        <div className="glassweb-brand">
          <span className="glassweb-mark">
            <ScanSearch className="size-4" />
          </span>
          <span className="font-mono text-sm font-medium tracking-[0.22em]">
            GLASSWEB
          </span>
          <span className="hidden font-mono text-[9px] tracking-[0.12em] text-muted-foreground xl:inline">
            ALPHA 001
          </span>
        </div>
        <div className="glassweb-location" title={trace.page.url}>
          <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <code>{trace.page.url}</code>
        </div>
        <div className="glassweb-actions">
          <Button
            onClick={() => setCaptureOpen(true)}
            size="sm"
            variant="outline"
          >
            <CircleDot data-icon="inline-start" /> Capture
          </Button>
          <IconButton
            label="Import trace"
            onClick={() => fileInputRef.current?.click()}
          >
            <Import />
          </IconButton>
          <IconButton
            label="Export redacted trace"
            onClick={() => setRedactionOpen(true)}
          >
            <Download />
          </IconButton>
          <IconButton
            label={
              trace.id === 'demo-orbit-pricing'
                ? 'Copy demo replay link'
                : 'Export trace to share'
            }
            onClick={shareView}
          >
            <Share2 />
          </IconButton>
        </div>
      </header>

      <section className="glassweb-toolbar">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Selected explanation
          </p>
          <label className="mt-1 flex min-w-0 items-center gap-2">
            <span className="sr-only">Choose explanation</span>
            <select
              className="min-w-0 max-w-[360px] cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium outline-none"
              onChange={(event) => chooseFocus(event.target.value)}
              value={focus.id}
            >
              {trace.focuses.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none -ml-6 size-3 text-muted-foreground" />
            <span className="hidden font-mono text-[10px] text-primary md:inline">
              {counts.observed} observed
              {counts.correlated > 0
                ? ` · ${counts.correlated} correlated`
                : ''}
            </span>
          </label>
        </div>

        <div aria-label="Viewer lens" className="lens-switcher">
          {lenses.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-pressed={lens === item.id}
                className="lens-button"
                key={item.id}
                onClick={() => {
                  setLens(item.id);
                  if (
                    item.id === 'ai' &&
                    trace.focuses.some((candidate) => candidate.id === 'ai')
                  ) {
                    chooseFocus('ai', 'ai');
                  }
                }}
                type="button"
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          {lens === 'runtime' ? (
            <Button
              onClick={toggleRuntime}
              size="sm"
              variant={runtimePlaying ? 'default' : 'outline'}
            >
              {runtimePlaying ? (
                <Pause data-icon="inline-start" />
              ) : (
                <Play data-icon="inline-start" />
              )}
              {runtimePlaying ? 'Pause' : 'Replay'}
            </Button>
          ) : (
            <>
              <IconButton
                label="Zoom out"
                disabled={zoom <= 80}
                onClick={() => setZoom((value) => Math.max(80, value - 10))}
              >
                <ZoomOut />
              </IconButton>
              <span className="w-9 text-center font-mono text-[9px] text-muted-foreground">
                {zoom}%
              </span>
              <IconButton
                label="Zoom in"
                disabled={zoom >= 120}
                onClick={() => setZoom((value) => Math.min(120, value + 10))}
              >
                <ZoomIn />
              </IconButton>
              <IconButton label="Reset view" onClick={() => setZoom(100)}>
                <Maximize2 />
              </IconButton>
            </>
          )}
          <Button
            onClick={startTour}
            size="sm"
            variant={tourPlaying ? 'default' : 'outline'}
          >
            {tourPlaying ? (
              <Pause data-icon="inline-start" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            {tourPlaying ? 'Stop tour' : 'Play tour'}
          </Button>
        </div>
      </section>

      <section className="relative min-h-[560px] flex-1 overflow-hidden">
        {lens === 'runtime' ? (
          <RuntimeWeave
            focus={focus}
            onSeek={setPlayhead}
            playhead={playhead}
            trace={trace}
          />
        ) : (
          <ExplodedView
            focus={focus}
            lens={lens}
            onSelectEntity={handleEntitySelect}
            selectedEntityId={selectedEntityId}
            trace={trace}
            zoom={zoom}
          />
        )}
      </section>

      <footer className="glassweb-footer">
        <div className="finding-summary">
          <div className="flex min-w-0 items-start gap-2.5">
            <ScanLine className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {lens === 'ai' && focus.finding ? focus.finding : focus.summary}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {focus.detail}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setEvidenceOpen(true)}
            size="xs"
            variant="ghost"
          >
            Inspect evidence
          </Button>
        </div>

        <form className="ask-system" onSubmit={handleQuestionSubmit}>
          {queryFocused ? (
            <div className="question-suggestions">
              {activeQuestionSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => runQuestion(suggestion)}
                  onMouseDown={(event) => event.preventDefault()}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          <Sparkles className="size-4 shrink-0 text-primary" />
          <Input
            aria-label="Ask GlassWeb"
            autoComplete="off"
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onBlur={() => window.setTimeout(() => setQueryFocused(false), 120)}
            onChange={(event) => setQuestion(event.target.value)}
            onFocus={() => setQueryFocused(true)}
            placeholder="Ask the system how this page works…"
            value={question}
          />
          <Button aria-label="Focus answer" size="icon-sm" type="submit">
            <Play className="size-3.5" />
          </Button>
        </form>
      </footer>

      {toast ? (
        <div aria-live="polite" className="glassweb-toast">
          {toast}
        </div>
      ) : null}

      <CaptureDialog
        onImport={() => {
          setCaptureOpen(false);
          fileInputRef.current?.click();
        }}
        onOpenChange={setCaptureOpen}
        open={captureOpen}
      />
      <EvidenceDialog
        entity={selectedEntity}
        onOpenChange={setEvidenceOpen}
        open={evidenceOpen}
        trace={trace}
      />
      <RedactionDialog
        onExport={exportTrace}
        onOpenChange={setRedactionOpen}
        open={redactionOpen}
        trace={trace}
      />
    </main>
  );
}
