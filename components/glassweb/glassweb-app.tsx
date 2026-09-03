'use client';

import {
  Activity,
  ArrowRight,
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
import { CompareStory } from '@/components/glassweb/compare-story';
import { RuntimeWeave } from '@/components/glassweb/runtime-weave';
import { SimpleStory } from '@/components/glassweb/simple-story';
import {
  CaptureDialog,
  ComparisonEvidenceDialog,
  EvidenceDialog,
  RedactionDialog,
} from '@/components/glassweb/trace-dialogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  demoBrokenTrace,
  demoCheckoutCheck,
  demoRepairedTrace,
} from '@/lib/glassweb/demo-comparison';
import {
  baselineFileName,
  compareTraces,
  createComparisonAgentPacket,
  createGlassWebCheck,
  serializeGlassWebCheck,
  validateGlassWebCheck,
  type GlassWebCheck,
} from '@/lib/glassweb/compare';
import {
  certaintyCounts,
  createAgentBrief,
  findFocusFromQuestion,
  getBestStartingFocus,
  getEntityMap,
  getFocus,
  getFocusForEntity,
  safeFileName,
  serializeTrace,
  validateTrace,
} from '@/lib/glassweb/trace-utils';
import type { GlassWebTrace } from '@/lib/glassweb/types';

const lenses: Array<{ id: ViewerLens; label: string; icon: typeof Focus }> = [
  { id: 'system', label: 'Everything', icon: Braces },
  { id: 'trace', label: 'Answer path', icon: Focus },
  { id: 'ai', label: 'What AI sees', icon: Bot },
  { id: 'runtime', label: 'Replay', icon: Activity },
];

const questionSuggestions = [
  'What happens after someone clicks Start Pro?',
  'Why am I seeing R1,499?',
  'What changes when I choose Annual?',
  'Which outside company is contacted?',
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

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    // Legacy fallback for browsers that deny the async Clipboard API.
    // oxlint-disable-next-line typescript/no-deprecated
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  }
}

export function GlassWebApp() {
  const [trace, setTrace] = useState<GlassWebTrace>(demoBrokenTrace);
  const [focusId, setFocusId] = useState('checkout');
  const [selectedEntityId, setSelectedEntityId] = useState('visible-cta');
  const [experienceMode, setExperienceMode] = useState<
    'compare' | 'simple' | 'xray'
  >('compare');
  const [xrayReturnMode, setXrayReturnMode] = useState<'simple' | 'compare'>(
    'simple',
  );
  const [check, setCheck] = useState<GlassWebCheck>(demoCheckoutCheck);
  const [hasBeforeReference, setHasBeforeReference] = useState(true);
  const [afterTrace, setAfterTrace] = useState<GlassWebTrace | null>(
    demoBrokenTrace,
  );
  const [selectedAfterFocusId, setSelectedAfterFocusId] = useState<
    string | undefined
  >();
  const [forcePair, setForcePair] = useState(false);
  const [allowDifferentOrigins, setAllowDifferentOrigins] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [isDemoComparison, setIsDemoComparison] = useState(true);
  const [demoScenario, setDemoScenario] = useState<'broken' | 'repaired'>(
    'broken',
  );
  const [lens, setLens] = useState<ViewerLens>('trace');
  const [zoom, setZoom] = useState(100);
  const [question, setQuestion] = useState('');
  const [playhead, setPlayhead] = useState(0);
  const [runtimePlaying, setRuntimePlaying] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [comparisonEvidenceOpen, setComparisonEvidenceOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [redactionOpen, setRedactionOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [queryFocused, setQueryFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const focus = useMemo(() => getFocus(trace, focusId), [trace, focusId]);
  const comparison = useMemo(
    () =>
      hasBeforeReference && afterTrace
        ? compareTraces(
            check.baselineTrace,
            afterTrace,
            check.baselineFocusId,
            {
              afterFocusId: selectedAfterFocusId,
              forcePair,
              allowDifferentOrigins,
              successSignal: check.successSignal,
            },
          )
        : null,
    [
      afterTrace,
      allowDifferentOrigins,
      check,
      forcePair,
      hasBeforeReference,
      selectedAfterFocusId,
    ],
  );
  const entityMap = useMemo(() => getEntityMap(trace), [trace]);
  const selectedEntity = entityMap.get(selectedEntityId);
  const counts = useMemo(() => certaintyCounts(trace, focus), [trace, focus]);
  const supportsAiLens = useMemo(
    () =>
      trace.focuses.some(
        (candidate) => candidate.suggestedLens === 'ai' && candidate.finding,
      ),
    [trace],
  );
  const availableLenses = useMemo(
    () => lenses.filter((item) => item.id !== 'ai' || supportsAiLens),
    [supportsAiLens],
  );
  const activeQuestionSuggestions = useMemo(
    () =>
      trace.id === 'demo-orbit-pricing'
        ? questionSuggestions
        : trace.focuses.slice(0, 4).map((item) => item.question),
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
      const requestedView = parameters.get('view');
      const validLens =
        requestedLens &&
        availableLenses.some((candidate) => candidate.id === requestedLens);
      if (requestedView === 'xray' || validLens) setExperienceMode('xray');
      if (
        requestedFocus &&
        trace.focuses.some((candidate) => candidate.id === requestedFocus)
      ) {
        chooseFocus(requestedFocus, validLens ? requestedLens : undefined);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [availableLenses, chooseFocus, trace.focuses]);

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
    if (!match) {
      announce('This recording doesn’t contain an answer to that yet.');
      return;
    }
    chooseFocus(match.id, match.suggestedLens ?? 'trace');
    setQuestion('');
    setQueryFocused(false);
    announce(`Showing the answer for “${match.question}”`);
  };

  const handleQuestionSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    runQuestion();
  };

  const readGlassWebFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error(
        'That recording is larger than the safe 8 MB import limit.',
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text()) as unknown;
    } catch {
      throw new Error(
        'This isn’t a GlassWeb recording. Choose a .glassweb.json file.',
      );
    }
    const checkValidation = validateGlassWebCheck(parsed);
    if (checkValidation.ok && checkValidation.check) {
      return { check: checkValidation.check };
    }
    const traceValidation = validateTrace(parsed);
    if (traceValidation.ok && traceValidation.trace) {
      return { trace: traceValidation.trace };
    }
    throw new Error(
      traceValidation.errors[0] ??
        'This isn’t a GlassWeb recording. Choose a .glassweb.json file.',
    );
  };

  const showTrace = (imported: GlassWebTrace, nextMode: 'simple' | 'xray') => {
    const firstFocus = getBestStartingFocus(imported);
    setTrace(imported);
    setFocusId(firstFocus.id);
    setSelectedEntityId(firstFocus.surfaceEntityId);
    setLens(firstFocus.suggestedLens ?? 'trace');
    setExperienceMode(nextMode);
    setPlayhead(0);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = await readGlassWebFile(file);
      const imported = result.trace ?? result.check?.baselineTrace;
      if (!imported) throw new Error('That file has no GlassWeb recording.');
      showTrace(imported, 'simple');
      announce(`Opened “${imported.title}” offline.`);
    } catch (failure) {
      announce(failure instanceof Error ? failure.message : String(failure));
    }
  };

  const handleBeforeImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = await readGlassWebFile(file);
      const nextCheck =
        result.check ??
        (result.trace
          ? createGlassWebCheck(
              result.trace,
              getBestStartingFocus(result.trace),
            )
          : undefined);
      if (!nextCheck) throw new Error('That file has no before recording.');
      setCheck(nextCheck);
      setHasBeforeReference(true);
      setAfterTrace(null);
      setTrace(nextCheck.baselineTrace);
      const nextFocus = getFocus(
        nextCheck.baselineTrace,
        nextCheck.baselineFocusId,
      );
      setFocusId(nextFocus.id);
      setSelectedEntityId(nextFocus.surfaceEntityId);
      setSelectedAfterFocusId(undefined);
      setForcePair(false);
      setAllowDifferentOrigins(false);
      setComparisonError(null);
      setIsDemoComparison(false);
      setExperienceMode('compare');
      announce('Before recording ready. Now open the version after your edit.');
    } catch (failure) {
      setComparisonError(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };

  const handleAfterImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (!hasBeforeReference) {
        throw new Error('Open the before recording first.');
      }
      const result = await readGlassWebFile(file);
      if (!result.trace) {
        throw new Error(
          'Choose the recording from after your edit, not a saved before reference.',
        );
      }
      const imported = result.trace;
      const before = check.baselineTrace;
      if (
        imported.id === before.id &&
        imported.createdAt === before.createdAt
      ) {
        throw new Error(
          'These appear to be the same recording. Choose the version from after your edit.',
        );
      }
      setAfterTrace(imported);
      setTrace(imported);
      const firstFocus = getBestStartingFocus(imported);
      setFocusId(firstFocus.id);
      setSelectedEntityId(firstFocus.surfaceEntityId);
      setSelectedAfterFocusId(undefined);
      setForcePair(false);
      setAllowDifferentOrigins(false);
      setComparisonError(null);
      setIsDemoComparison(false);
      setExperienceMode('compare');
      announce('After recording loaded. GlassWeb is comparing the action.');
    } catch (failure) {
      setComparisonError(
        failure instanceof Error ? failure.message : String(failure),
      );
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
    announce('Recording saved. Review it before sharing.');
  };

  const exportCheck = () => {
    const blob = new Blob([serializeGlassWebCheck(check)], {
      type: 'application/json',
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = baselineFileName(check);
    anchor.click();
    URL.revokeObjectURL(href);
    announce('Before reference saved. Keep it for the next comparison.');
  };

  const copyComparisonPacket = async () => {
    if (!afterTrace || !comparison) return;
    try {
      await copyText(
        createComparisonAgentPacket(
          check.baselineTrace,
          afterTrace,
          comparison,
        ),
      );
      announce(
        comparison.outcome === 'broken'
          ? 'Fix packet copied. Paste it into your coding agent.'
          : 'Comparison copied. Paste it into your coding agent.',
      );
    } catch {
      announce('Copy was blocked by this browser.');
    }
  };

  const chooseBeforeFocus = (nextFocusId: string) => {
    const nextFocus = getFocus(check.baselineTrace, nextFocusId);
    setCheck(createGlassWebCheck(check.baselineTrace, nextFocus));
    setSelectedAfterFocusId(undefined);
    setForcePair(false);
    setComparisonError(null);
  };

  const openComparisonXray = () => {
    const nextTrace = afterTrace ?? check.baselineTrace;
    const nextFocus =
      comparison?.afterFocus ??
      getFocus(nextTrace, selectedAfterFocusId ?? focusId);
    setTrace(nextTrace);
    setFocusId(nextFocus.id);
    setSelectedEntityId(nextFocus.surfaceEntityId);
    setLens('trace');
    setXrayReturnMode('compare');
    setExperienceMode('xray');
  };

  const resetDemoComparison = () => {
    setCheck(demoCheckoutCheck);
    setHasBeforeReference(true);
    setAfterTrace(demoBrokenTrace);
    setTrace(demoBrokenTrace);
    setFocusId('checkout');
    setSelectedEntityId('visible-cta');
    setSelectedAfterFocusId(undefined);
    setForcePair(false);
    setAllowDifferentOrigins(false);
    setComparisonError(null);
    setIsDemoComparison(true);
    setDemoScenario('broken');
    setExperienceMode('compare');
  };

  const toggleDemoComparison = () => {
    const nextScenario = demoScenario === 'broken' ? 'repaired' : 'broken';
    const nextTrace =
      nextScenario === 'broken' ? demoBrokenTrace : demoRepairedTrace;
    setDemoScenario(nextScenario);
    setAfterTrace(nextTrace);
    setTrace(nextTrace);
    setFocusId('checkout');
    setSelectedEntityId('visible-cta');
    setSelectedAfterFocusId(undefined);
    setForcePair(false);
    setComparisonError(null);
  };

  const startOwnComparison = () => {
    setAfterTrace(null);
    setHasBeforeReference(false);
    setSelectedAfterFocusId(undefined);
    setForcePair(false);
    setAllowDifferentOrigins(false);
    setComparisonError(null);
    setIsDemoComparison(false);
    setExperienceMode('compare');
  };

  const shareView = async () => {
    if (!trace.id.startsWith('demo-orbit-pricing')) {
      setRedactionOpen(true);
      announce('Save this recording first, then share the reviewed file.');
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('focus', focus.id);
    url.searchParams.set('lens', lens);
    url.searchParams.set('view', 'xray');
    try {
      await copyText(url.toString());
      announce('This view was copied.');
    } catch {
      announce('Copy was blocked by this browser.');
    }
  };

  const toggleRuntime = () => {
    if (playhead >= trace.durationMs) setPlayhead(0);
    setRuntimePlaying((current) => !current);
  };

  const openFullXray = (nextLens: ViewerLens = 'trace') => {
    setLens(nextLens);
    setXrayReturnMode('simple');
    setExperienceMode('xray');
    if (nextLens === 'runtime') setPlayhead(0);
  };

  const startReplay = () => {
    setLens('runtime');
    setXrayReturnMode('simple');
    setExperienceMode('xray');
    setPlayhead(0);
    setRuntimePlaying(true);
  };

  const returnToSimple = () => {
    setRuntimePlaying(false);
    setExperienceMode(xrayReturnMode);
    setLens(focus.suggestedLens === 'ai' ? 'ai' : 'trace');
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.delete('lens');
    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const copyAgentBrief = async () => {
    try {
      await copyText(createAgentBrief(trace, focus));
      announce('Proof copied. Paste it into your coding agent.');
    } catch {
      announce('Copy was blocked by this browser.');
    }
  };

  return (
    <main
      className={`glassweb-app flex min-h-screen flex-col bg-background text-foreground ${experienceMode === 'simple' ? 'is-simple' : ''} ${experienceMode === 'compare' ? 'is-compare' : ''}`}
    >
      <input
        accept=".json,.glassweb,.glassweb.json,application/json"
        hidden
        onChange={handleImport}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />
      <input
        accept=".json,.glassweb,.glassweb.json,.glassweb-check.json,application/json"
        hidden
        onChange={handleBeforeImport}
        ref={beforeInputRef}
        tabIndex={-1}
        type="file"
      />
      <input
        accept=".json,.glassweb,.glassweb.json,application/json"
        hidden
        onChange={handleAfterImport}
        ref={afterInputRef}
        tabIndex={-1}
        type="file"
      />

      {experienceMode === 'compare' ? (
        <>
          <header className="comparison-header">
            <div className="glassweb-brand">
              <span className="glassweb-mark">
                <ScanSearch className="size-4" />
              </span>
              <span className="simple-brand-copy">
                <strong>GlassWeb</strong>
                <small>Before vs after, explained.</small>
              </span>
            </div>
            <span className="comparison-header-context">
              {afterTrace ? (
                <>
                  <b>Before</b> {check.baselineTrace.title}
                  <ArrowRight aria-hidden="true" />
                  <b>After</b> {afterTrace.title}
                </>
              ) : (
                'Your recordings stay on this device'
              )}
            </span>
            <div className="comparison-header-actions">
              {afterTrace ? (
                <Button
                  onClick={() => {
                    showTrace(afterTrace, 'simple');
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Explain one recording
                </Button>
              ) : null}
              <Button
                onClick={() => setCaptureOpen(true)}
                size="sm"
                variant="outline"
              >
                <CircleDot data-icon="inline-start" /> Record my website
              </Button>
              <Button
                onClick={afterTrace ? startOwnComparison : resetDemoComparison}
                size="sm"
              >
                {afterTrace ? (
                  <Import data-icon="inline-start" />
                ) : (
                  <Sparkles data-icon="inline-start" />
                )}
                {afterTrace ? 'Use my recordings' : 'See example'}
              </Button>
            </div>
          </header>

          <CompareStory
            afterTrace={afterTrace}
            check={check}
            comparison={comparison}
            demoScenario={demoScenario}
            error={comparisonError}
            hasBeforeReference={hasBeforeReference}
            isDemo={isDemoComparison}
            onAfterFocusChange={(nextFocusId) => {
              setSelectedAfterFocusId(nextFocusId);
              setForcePair(false);
              setComparisonError(null);
            }}
            onAllowDifferentOrigins={() => {
              setAllowDifferentOrigins(true);
              setComparisonError(null);
            }}
            onBeforeFocusChange={chooseBeforeFocus}
            onCopyPacket={copyComparisonPacket}
            onDownloadCheck={exportCheck}
            onForcePair={() => {
              if (
                !selectedAfterFocusId &&
                !comparison?.afterFocus &&
                afterTrace?.focuses[0]
              ) {
                setSelectedAfterFocusId(afterTrace.focuses[0].id);
              }
              setForcePair(true);
              setComparisonError(null);
            }}
            onOpenAfter={() => afterInputRef.current?.click()}
            onOpenBefore={() => beforeInputRef.current?.click()}
            onOpenProof={() => setComparisonEvidenceOpen(true)}
            onOpenXray={openComparisonXray}
            onRecord={() => setCaptureOpen(true)}
            onResetDemo={resetDemoComparison}
            onStartOwnComparison={startOwnComparison}
            onToggleDemo={toggleDemoComparison}
            selectedAfterFocusId={selectedAfterFocusId}
          />
        </>
      ) : experienceMode === 'simple' ? (
        <>
          <header className="simple-header">
            <div className="glassweb-brand">
              <span className="glassweb-mark">
                <ScanSearch className="size-4" />
              </span>
              <span className="simple-brand-copy">
                <strong>GlassWeb</strong>
                <small>One click. One answer. Real proof.</small>
              </span>
            </div>
            <span className="simple-example-label">
              {trace.id.startsWith('demo-orbit-pricing')
                ? 'Live example'
                : 'Your recording'}
              : {trace.title}
            </span>
            <div className="simple-header-actions">
              <Button
                onClick={() => {
                  const nextFocus = getFocus(trace, focusId);
                  setCheck(createGlassWebCheck(trace, nextFocus));
                  setHasBeforeReference(true);
                  setAfterTrace(null);
                  setIsDemoComparison(false);
                  setExperienceMode('compare');
                }}
                size="sm"
                variant="outline"
              >
                <ArrowRight data-icon="inline-start" /> Compare after an edit
              </Button>
              <Button
                className="simple-open-action"
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                variant="ghost"
              >
                <Import data-icon="inline-start" /> Open a recording
              </Button>
              <Button
                className="simple-capture-action"
                onClick={() => setCaptureOpen(true)}
                size="sm"
              >
                <CircleDot data-icon="inline-start" /> Record my website
              </Button>
            </div>
          </header>

          <SimpleStory
            focus={focus}
            onCopyBrief={copyAgentBrief}
            onChooseFocus={(nextFocusId) => chooseFocus(nextFocusId, 'trace')}
            onOpenEvidence={() => setEvidenceOpen(true)}
            onOpenProof={() => openFullXray('trace')}
            onReplay={startReplay}
            onSelectEntity={handleEntitySelect}
            trace={trace}
          />
        </>
      ) : (
        <>
          <header className="glassweb-header">
            <div className="glassweb-brand">
              <span className="glassweb-mark">
                <ScanSearch className="size-4" />
              </span>
              <span className="font-mono text-sm font-medium tracking-[0.22em]">
                GLASSWEB
              </span>
              <span className="hidden font-mono text-[9px] tracking-[0.12em] text-muted-foreground xl:inline">
                OPEN SOURCE · V0.4
              </span>
            </div>
            <div className="glassweb-location" title={trace.page.url}>
              <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
              <code>{trace.page.url}</code>
            </div>
            <div className="glassweb-actions">
              <Button
                className="back-simple-action"
                onClick={returnToSimple}
                size="sm"
                variant="ghost"
              >
                {xrayReturnMode === 'compare'
                  ? 'Back to comparison'
                  : 'Back to simple view'}
              </Button>
              <Button
                className="xray-secondary"
                onClick={() => setCaptureOpen(true)}
                size="sm"
                variant="outline"
              >
                <CircleDot data-icon="inline-start" /> Record my website
              </Button>
              <IconButton
                className="xray-open-action"
                label="Open a recording"
                onClick={() => fileInputRef.current?.click()}
              >
                <Import />
              </IconButton>
              <IconButton
                className="xray-secondary"
                label="Save recording"
                onClick={() => setRedactionOpen(true)}
              >
                <Download />
              </IconButton>
              <IconButton
                label={
                  trace.id.startsWith('demo-orbit-pricing')
                    ? 'Copy this view'
                    : 'Save recording to share'
                }
                className="xray-secondary"
                onClick={shareView}
              >
                <Share2 />
              </IconButton>
            </div>
          </header>

          <section className="glassweb-toolbar">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                What do you want to understand?
              </p>
              <label className="mt-1 flex min-w-0 items-center gap-2">
                <span className="sr-only">Choose a question</span>
                <select
                  className="min-w-0 max-w-[360px] cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium outline-none"
                  onChange={(event) => chooseFocus(event.target.value)}
                  value={focus.id}
                >
                  {trace.focuses.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.question}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none -ml-6 size-3 text-muted-foreground" />
                <span className="hidden font-mono text-[10px] text-primary md:inline">
                  {counts.observed} seen
                  {counts.correlated > 0
                    ? ` · ${counts.correlated} likely`
                    : ''}
                </span>
              </label>
            </div>

            <div aria-label="Viewer lens" className="lens-switcher">
              {availableLenses.map((item) => {
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
                    onClick={() =>
                      setZoom((value) => Math.min(120, value + 10))
                    }
                  >
                    <ZoomIn />
                  </IconButton>
                  <IconButton label="Reset view" onClick={() => setZoom(100)}>
                    <Maximize2 />
                  </IconButton>
                </>
              )}
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
                    {lens === 'ai' && focus.finding
                      ? focus.finding
                      : focus.summary}
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
                How do you know?
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
                onBlur={() =>
                  window.setTimeout(() => setQueryFocused(false), 120)
                }
                onChange={(event) => setQuestion(event.target.value)}
                onFocus={() => setQueryFocused(true)}
                placeholder="Ask about this page…"
                value={question}
              />
              <Button aria-label="Focus answer" size="icon-sm" type="submit">
                <Play className="size-3.5" />
              </Button>
            </form>
          </footer>
        </>
      )}

      {toast ? (
        <div aria-live="polite" className="glassweb-toast">
          {toast}
        </div>
      ) : null}

      <CaptureDialog
        onImport={() => {
          setCaptureOpen(false);
          if (experienceMode === 'compare') {
            if (hasBeforeReference) afterInputRef.current?.click();
            else beforeInputRef.current?.click();
          } else fileInputRef.current?.click();
        }}
        onOpenChange={setCaptureOpen}
        open={captureOpen}
      />
      <EvidenceDialog
        entity={selectedEntity}
        focus={focus}
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
      <ComparisonEvidenceDialog
        comparison={comparison}
        onOpenChange={setComparisonEvidenceOpen}
        onOpenXray={openComparisonXray}
        open={comparisonEvidenceOpen}
      />
    </main>
  );
}
