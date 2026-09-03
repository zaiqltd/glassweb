'use client';

import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  FileCheck2,
  GitCompareArrows,
  Import,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';

import { PageSurface } from '@/components/glassweb/page-surface';
import { Button } from '@/components/ui/button';
import type {
  ChangeState,
  GlassWebCheck,
  GlassWebSuccessSignal,
  TraceComparison,
} from '@/lib/glassweb/compare';
import type { GlassWebTrace } from '@/lib/glassweb/types';

interface CompareStoryProps {
  check: GlassWebCheck;
  hasBeforeReference: boolean;
  afterTrace: GlassWebTrace | null;
  comparison: TraceComparison | null;
  error: string | null;
  isDemo: boolean;
  demoScenario: 'broken' | 'repaired';
  selectedAfterFocusId?: string;
  onBeforeFocusChange: (focusId: string) => void;
  onAfterFocusChange: (focusId: string) => void;
  onForcePair: () => void;
  onAllowDifferentOrigins: () => void;
  onOpenBefore: () => void;
  onOpenAfter: () => void;
  onDownloadCheck: () => void;
  onCopyPacket: () => void;
  onOpenProof: () => void;
  onOpenXray: () => void;
  onRecord: () => void;
  onStartOwnComparison: () => void;
  onResetDemo: () => void;
  onToggleDemo: () => void;
}

const stateLabel: Record<ChangeState, string> = {
  same: 'Same in both',
  added: 'New after',
  removed: 'Not recorded after',
  changed: 'Changed here',
  uncertain: 'Not enough proof',
};

const stageLabel = {
  visible: 'Customer action',
  structure: 'Page control',
  behaviour: 'Page reaction',
  network: 'Browser request',
  service: 'Destination',
};

function outcomeLabel(comparison: TraceComparison) {
  return {
    matches: 'Still matches',
    changed: 'Changed',
    broken: 'Needs attention',
    unknown: 'Cannot compare yet',
  }[comparison.outcome];
}

function safePageLabel(trace: GlassWebTrace) {
  try {
    const url = new URL(trace.page.url);
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return trace.page.title;
  }
}

function RecordingCard({
  number,
  eyebrow,
  trace,
  focusId,
  onFocusChange,
  onOpen,
  empty = false,
  onDownload,
  emptyTitle,
  emptyCopy,
  emptyAction,
  disabled = false,
  referenceSignal,
}: {
  number: string;
  eyebrow: string;
  trace?: GlassWebTrace;
  focusId?: string;
  onFocusChange?: (focusId: string) => void;
  onOpen: () => void;
  empty?: boolean;
  onDownload?: () => void;
  emptyTitle?: string;
  emptyCopy?: string;
  emptyAction?: string;
  disabled?: boolean;
  referenceSignal?: GlassWebSuccessSignal;
}) {
  return (
    <article className={`comparison-recording-card ${empty ? 'is-empty' : ''}`}>
      <div className="comparison-recording-number">{number}</div>
      <div className="comparison-recording-content">
        <p>{eyebrow}</p>
        {trace ? (
          <>
            <div className="comparison-recording-title">
              <strong>{trace.title}</strong>
              <span>
                <Check aria-hidden="true" /> Ready
              </span>
            </div>
            <small>{safePageLabel(trace)}</small>
            {referenceSignal ? (
              <p className="comparison-reference-signal">
                <Check aria-hidden="true" />
                <span>
                  Before result: <strong>{referenceSignal.label}</strong>
                  {referenceSignal.expectedStatus
                    ? ` returned ${referenceSignal.expectedStatus}`
                    : ' was recorded'}
                </span>
              </p>
            ) : null}
            {focusId && onFocusChange ? (
              <label className="comparison-action-select">
                <span>Action to check</span>
                <select
                  onChange={(event) => onFocusChange(event.target.value)}
                  value={focusId}
                >
                  {trace.focuses.map((focus) => (
                    <option key={focus.id} value={focus.id}>
                      {focus.question}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="comparison-recording-actions">
              <Button onClick={onOpen} size="lg" variant="outline">
                <Import data-icon="inline-start" /> Replace recording
              </Button>
              {onDownload ? (
                <Button onClick={onDownload} size="lg" variant="ghost">
                  <FileCheck2 data-icon="inline-start" /> Save this reference
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2>{emptyTitle ?? 'Repeat the same action after your edit.'}</h2>
            <p className="comparison-recording-empty-copy">
              {emptyCopy ??
                'Then open that recording here. It stays on this device.'}
            </p>
            <Button disabled={disabled} onClick={onOpen} size="lg">
              <Import data-icon="inline-start" />{' '}
              {emptyAction ?? 'Open after recording'}
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function SetupView(props: CompareStoryProps) {
  const before = props.hasBeforeReference
    ? props.check.baselineTrace
    : undefined;
  return (
    <div className="comparison-setup">
      <section className="comparison-setup-intro">
        <p className="comparison-kicker">
          <GitCompareArrows aria-hidden="true" /> Before / after website check
        </p>
        <h1>See what changed after your edit.</h1>
        <p>
          Record the same button or form before and after. GlassWeb finds the
          first browser-visible difference and prepares the proof for your
          coding agent.
        </p>
      </section>

      {props.error ? (
        <div className="comparison-inline-error" role="alert">
          <TriangleAlert aria-hidden="true" />
          <span>{props.error}</span>
        </div>
      ) : null}

      <section
        aria-label="Recordings to compare"
        className="comparison-setup-stack"
      >
        <RecordingCard
          empty={!before}
          emptyAction="Open before recording"
          emptyCopy="Choose one recording of the action before your edit."
          emptyTitle="Start with the version from before your edit."
          eyebrow="Before your edit"
          focusId={before ? props.check.baselineFocusId : undefined}
          number="01"
          onDownload={before ? props.onDownloadCheck : undefined}
          onFocusChange={before ? props.onBeforeFocusChange : undefined}
          onOpen={props.onOpenBefore}
          referenceSignal={props.check.successSignal}
          trace={before}
        />
        <div className="comparison-setup-arrow" aria-hidden="true">
          <ArrowRight />
        </div>
        <RecordingCard
          empty
          disabled={!before}
          eyebrow="After your edit"
          number="02"
          onOpen={props.onOpenAfter}
          emptyCopy={
            before
              ? undefined
              : 'Add the Before recording first, then repeat the same action.'
          }
        />
      </section>

      <div className="comparison-setup-footer">
        <button onClick={props.onRecord} type="button">
          Need to record it? <strong>Record my website</strong>{' '}
          <ArrowRight aria-hidden="true" />
        </button>
        {!props.isDemo ? (
          <button onClick={props.onResetDemo} type="button">
            See the checkout example
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PairingView(props: CompareStoryProps) {
  const after = props.afterTrace!;
  const comparison = props.comparison!;
  const isOriginBlock = comparison.compatibility === 'blocked';
  const needsActionConfirmation =
    ['medium', 'manual'].includes(comparison.pairing) &&
    Boolean(comparison.afterFocus);
  return (
    <div className="comparison-pairing">
      <p className="comparison-kicker">
        <CircleAlert aria-hidden="true" /> One quick check
      </p>
      <h1>
        {isOriginBlock
          ? 'Are these two versions of the same website?'
          : needsActionConfirmation
            ? 'Is this the action you repeated?'
            : 'Which action did you repeat?'}
      </h1>
      <p>
        {isOriginBlock
          ? 'The website addresses differ. That can be normal for preview and live versions, but GlassWeb needs you to confirm it.'
          : needsActionConfirmation
            ? 'GlassWeb found a likely match, but the evidence is not strong enough to decide for you.'
            : 'GlassWeb will not guess when two actions look too similar. Choose the matching action in each recording.'}
      </p>

      {props.error ? (
        <div className="comparison-inline-error" role="alert">
          <TriangleAlert aria-hidden="true" /> {props.error}
        </div>
      ) : null}

      <div className="comparison-pairing-grid">
        <RecordingCard
          eyebrow="Before your edit"
          focusId={props.check.baselineFocusId}
          number="01"
          onFocusChange={props.onBeforeFocusChange}
          onOpen={props.onOpenBefore}
          referenceSignal={props.check.successSignal}
          trace={props.check.baselineTrace}
        />
        <RecordingCard
          eyebrow="After your edit"
          focusId={
            props.selectedAfterFocusId ??
            comparison.afterFocus?.id ??
            after.focuses[0]?.id
          }
          number="02"
          onFocusChange={props.onAfterFocusChange}
          onOpen={props.onOpenAfter}
          trace={after}
        />
      </div>

      <div className="comparison-pairing-actions">
        <Button
          onClick={
            isOriginBlock ? props.onAllowDifferentOrigins : props.onForcePair
          }
          size="lg"
        >
          <GitCompareArrows data-icon="inline-start" />
          {isOriginBlock
            ? 'Yes, compare these versions'
            : needsActionConfirmation
              ? 'Yes, compare this action'
              : 'Compare this action'}
        </Button>
        <Button onClick={props.onStartOwnComparison} size="lg" variant="ghost">
          Start over
        </Button>
      </div>
    </div>
  );
}

function PageFrame({
  side,
  trace,
  focusId,
  active,
}: {
  side: 'before' | 'after';
  trace: GlassWebTrace;
  focusId: string;
  active: boolean;
}) {
  const focus =
    trace.focuses.find((item) => item.id === focusId) ?? trace.focuses[0];
  return (
    <article
      aria-label={`${side === 'before' ? 'Before' : 'After'} recording of ${focus.label}`}
      className={`comparison-page-card is-${side} ${active ? 'is-mobile-active' : ''}`}
    >
      <header>
        <span>{side === 'before' ? 'Before' : 'After'}</span>
        <strong>{trace.title}</strong>
        <small>
          {side === 'before' ? 'Reference recording' : 'New recording'}
        </small>
      </header>
      <div aria-hidden="true" className="comparison-page-viewport" inert>
        <PageSurface
          aiMode={false}
          focus={focus}
          interactive={false}
          onSelectEntity={() => undefined}
          trace={trace}
        />
      </div>
    </article>
  );
}

function JourneyRows({
  comparison,
  replayStep,
}: {
  comparison: TraceComparison;
  replayStep: number | null;
}) {
  return (
    <>
      <ol className="sr-only" aria-label="Compared browser checkpoints">
        {comparison.steps.map((step, index) => (
          <li key={`accessible-${step.key}`}>
            {index + 1}. {stageLabel[step.layer]}. Before:{' '}
            {step.before?.humanLabel ?? 'not recorded'}. After:{' '}
            {step.after?.humanLabel ?? 'not recorded'}. {stateLabel[step.state]}
            . {step.humanSummary}
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="comparison-journey">
        <div className="comparison-journey-label is-before">
          <span>Before</span>
          <small>Reference run</small>
        </div>
        {comparison.steps.map((step, index) => (
          <div
            className={`comparison-step is-before is-${step.state} ${replayStep === null || index <= replayStep ? 'is-revealed' : ''}`}
            key={`before-${step.key}`}
            style={{ '--step-index': index } as CSSProperties}
          >
            <span className="comparison-step-dot">
              {step.before ? <Check aria-hidden="true" /> : <span>—</span>}
            </span>
            <small>{stageLabel[step.layer]}</small>
            <strong>{step.before?.humanLabel ?? 'Not recorded'}</strong>
            {step.beforeStatus ? <b>{step.beforeStatus}</b> : null}
          </div>
        ))}

        <div className="comparison-journey-label is-after">
          <span>After</span>
          <small>After the edit</small>
        </div>
        {comparison.steps.map((step, index) => (
          <div
            className={`comparison-step is-after is-${step.state} ${replayStep === null || index <= replayStep ? 'is-revealed' : ''}`}
            key={`after-${step.key}`}
            style={{ '--step-index': index } as CSSProperties}
          >
            <span className="comparison-step-dot">
              {step.state === 'same' ? (
                <Check aria-hidden="true" />
              ) : step.state === 'uncertain' ? (
                <span>?</span>
              ) : step.state === 'added' ? (
                <span>+</span>
              ) : step.state === 'removed' ? (
                <span>—</span>
              ) : (
                <X aria-hidden="true" />
              )}
            </span>
            <small>{stageLabel[step.layer]}</small>
            <strong>{step.after?.humanLabel ?? 'Not recorded'}</strong>
            {step.afterStatus ? <b>{step.afterStatus}</b> : null}
          </div>
        ))}

        <div aria-hidden="true" />
        {comparison.steps.map((step, index) => (
          <div
            className={`comparison-change-label is-${step.state}`}
            key={`state-${step.key}`}
          >
            {index === comparison.firstDifferenceIndex ? (
              <span>First difference</span>
            ) : null}
            <strong>{stateLabel[step.state]}</strong>
          </div>
        ))}
      </div>

      <ol aria-hidden="true" className="comparison-mobile-journey">
        {comparison.steps.map((step, index) => (
          <li className={`is-${step.state}`} key={`mobile-${step.key}`}>
            <span>{index + 1}</span>
            <div>
              <small>{stateLabel[step.state]}</small>
              <strong>
                {step.after?.humanLabel ??
                  step.before?.humanLabel ??
                  stageLabel[step.layer]}
              </strong>
              <p>{step.humanSummary}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function ResultView(props: CompareStoryProps) {
  const comparison = props.comparison!;
  const after = props.afterTrace!;
  const [mobileSide, setMobileSide] = useState<'before' | 'after'>('after');
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const [replayPlaying, setReplayPlaying] = useState(false);

  useEffect(() => {
    if (!replayPlaying) return;
    const timer = window.setTimeout(() => {
      setReplayStep((current) => {
        const next = current === null ? 0 : current + 1;
        if (next >= comparison.steps.length - 1) setReplayPlaying(false);
        return Math.min(next, comparison.steps.length - 1);
      });
    }, 560);
    return () => window.clearTimeout(timer);
  }, [comparison.steps.length, replayPlaying, replayStep]);

  const replay = () => {
    if (replayPlaying) {
      setReplayPlaying(false);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReplayStep(null);
      setReplayPlaying(false);
      return;
    }
    if (replayStep === null || replayStep >= comparison.steps.length - 1) {
      setReplayStep(-1);
    }
    setReplayPlaying(true);
  };

  const resultStatus = useMemo(
    () => `${outcomeLabel(comparison)}. ${comparison.headline}`,
    [comparison],
  );
  const canSuggestFix = comparison.outcome === 'broken';

  return (
    <div className={`comparison-result is-${comparison.outcome}`}>
      <p aria-live="polite" className="sr-only">
        {resultStatus}
      </p>

      <section className="comparison-verdict" id="comparison-verdict">
        <div className="comparison-verdict-copy">
          <p className="comparison-kicker">
            <GitCompareArrows aria-hidden="true" /> Before / after website check
          </p>
          <div className="comparison-outcome-line">
            <span>
              {comparison.outcome === 'matches' ? (
                <Check aria-hidden="true" />
              ) : comparison.outcome === 'unknown' ? (
                <CircleAlert aria-hidden="true" />
              ) : (
                <X aria-hidden="true" />
              )}{' '}
              {outcomeLabel(comparison)}
            </span>
            <small>{comparison.actionLabel}</small>
          </div>
          <h1>{comparison.headline}</h1>
          <p>{comparison.summary}</p>
          {comparison.warnings.length ? (
            <div className="comparison-proof-warning">
              <TriangleAlert aria-hidden="true" />
              <span>
                <strong>
                  {comparison.outcome === 'matches'
                    ? 'Matches, but the proof is weaker.'
                    : 'Evidence note.'}
                </strong>{' '}
                {comparison.warnings[0]}
                {comparison.warnings.length > 1
                  ? ` +${comparison.warnings.length - 1} more in technical proof.`
                  : ''}
              </span>
            </div>
          ) : null}
          <div className="comparison-verdict-actions">
            <Button onClick={props.onCopyPacket} size="lg">
              <Copy data-icon="inline-start" />
              {canSuggestFix ? 'Copy fix packet' : 'Copy comparison'}
            </Button>
            <button onClick={props.onStartOwnComparison} type="button">
              Compare my recordings <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <aside className="comparison-first-break">
          <p>
            {comparison.firstDifference
              ? 'First recorded difference'
              : 'Result'}
          </p>
          <strong>
            {comparison.firstDifference
              ? stageLabel[comparison.firstDifference.layer]
              : 'Selected path'}
          </strong>
          <span>
            {comparison.firstDifference?.humanSummary ??
              'The selected browser-visible path still matches.'}
          </span>
          {comparison.firstDifference ? (
            <div>
              <small>Expected</small>
              <b>
                {comparison.firstDifference.beforeStatus
                  ? `HTTP ${comparison.firstDifference.beforeStatus}`
                  : comparison.firstDifference.expected}
              </b>
              <ArrowRight aria-hidden="true" />
              <small>After</small>
              <b>
                {comparison.firstDifference.afterStatus
                  ? `HTTP ${comparison.firstDifference.afterStatus}`
                  : comparison.firstDifference.actual}
              </b>
            </div>
          ) : null}
        </aside>
      </section>

      {props.error ? (
        <div className="comparison-inline-error" role="alert">
          <TriangleAlert aria-hidden="true" /> {props.error}
        </div>
      ) : null}

      <section
        className="comparison-cinema"
        aria-label="Before and after evidence"
      >
        <header className="comparison-cinema-header">
          <div>
            <span>The same action</span>
            <strong>Two browser recordings, aligned</strong>
          </div>
          <div className="comparison-cinema-tools">
            {props.isDemo ? (
              <button onClick={props.onToggleDemo} type="button">
                <RefreshCw aria-hidden="true" />
                {props.demoScenario === 'broken'
                  ? 'Show the repaired run'
                  : 'Show the broken run'}
              </button>
            ) : null}
            <span>
              <ShieldCheck aria-hidden="true" /> Compared locally
            </span>
          </div>
        </header>

        <div
          className="comparison-mobile-frame-tabs"
          aria-label="Recording preview"
        >
          <button
            aria-pressed={mobileSide === 'before'}
            onClick={() => setMobileSide('before')}
            type="button"
          >
            Before
          </button>
          <button
            aria-pressed={mobileSide === 'after'}
            onClick={() => setMobileSide('after')}
            type="button"
          >
            After
          </button>
        </div>

        <div className="comparison-page-pair">
          <PageFrame
            active={mobileSide === 'before'}
            focusId={comparison.beforeFocus.id}
            side="before"
            trace={props.check.baselineTrace}
          />
          <div className="comparison-page-seam" aria-hidden="true">
            <span>vs</span>
            <ArrowRight />
          </div>
          <PageFrame
            active={mobileSide === 'after'}
            focusId={comparison.afterFocus?.id ?? after.focuses[0].id}
            side="after"
            trace={after}
          />
        </div>

        <JourneyRows comparison={comparison} replayStep={replayStep} />

        <div className="comparison-cinema-actions">
          <Button onClick={props.onCopyPacket} size="lg">
            <Copy data-icon="inline-start" />
            {canSuggestFix
              ? 'Copy fix packet for my AI'
              : 'Copy comparison for my AI'}
          </Button>
          <Button onClick={replay} size="lg" variant="outline">
            {replayPlaying ? (
              <Pause data-icon="inline-start" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            {replayPlaying ? 'Pause explanation' : 'Replay the explanation'}
          </Button>
          {replayStep !== null ? (
            <Button
              aria-label="Restart difference replay"
              onClick={() => {
                if (
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ) {
                  setReplayStep(null);
                  setReplayPlaying(false);
                  return;
                }
                setReplayStep(-1);
                setReplayPlaying(true);
              }}
              size="icon-lg"
              variant="ghost"
            >
              <RotateCcw />
            </Button>
          ) : null}
          <button
            className="comparison-proof-link"
            onClick={props.onOpenProof}
            type="button"
          >
            Show technical proof <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="comparison-next">
        <div>
          <p className="comparison-kicker">
            <Sparkles aria-hidden="true" /> The complete loop
          </p>
          <h2>Find the split. Fix it. Record once more.</h2>
          <p>
            A third recording should return to <strong>Still matches</strong>.
            That is visible proof for you, your coding agent, and your client.
          </p>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Keep the before recording</strong>
              <p>It becomes the reference for this action.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Hand over only the difference</strong>
              <p>The fix packet stays bounded by what the browser saw.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Record again to verify</strong>
              <p>Compare the repaired version against the same reference.</p>
            </div>
          </li>
        </ol>
        <div className="comparison-next-actions">
          <Button onClick={props.onOpenAfter} size="lg">
            <RefreshCw data-icon="inline-start" /> Open another recording
          </Button>
          <Button onClick={props.onOpenXray} size="lg" variant="outline">
            <ScanSearch data-icon="inline-start" /> Open full X-ray
          </Button>
        </div>
      </section>

      <section className="comparison-product-line">
        <div>
          <span>Open source now</span>
          <strong>Manual, local before/after checks</strong>
          <p>No account. No upload. No black-box verdict.</p>
        </div>
        <ArrowRight aria-hidden="true" />
        <div>
          <span>Paid layer next</span>
          <strong>Checks after every deploy</strong>
          <p>Hosted runs, history, alerts, and client-ready reports.</p>
        </div>
        <Button
          onClick={props.onStartOwnComparison}
          size="lg"
          variant="outline"
        >
          Use my recordings
        </Button>
      </section>
    </div>
  );
}

export function CompareStory(props: CompareStoryProps) {
  if (!props.afterTrace) return <SetupView {...props} />;
  if (
    !props.comparison ||
    props.comparison.compatibility === 'blocked' ||
    props.comparison.steps.length === 0
  ) {
    return <PairingView {...props} />;
  }
  return <ResultView {...props} />;
}
