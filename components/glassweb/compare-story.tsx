'use client';

import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  Download,
  Import,
  LockKeyhole,
  MousePointer2,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { GlassWebCheck, TraceComparison } from '@/lib/glassweb/compare';
import type { GlassWebTrace, TraceLayer } from '@/lib/glassweb/types';

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

const plainStage: Record<TraceLayer, string> = {
  visible: 'what you clicked',
  structure: 'the button on the page',
  behaviour: 'what the page did next',
  network: 'the step that starts the next page',
  service: 'the outside tool the page opened',
};

function resultCopy(comparison: TraceComparison, isDemo: boolean) {
  if (comparison.outcome === 'matches') {
    return {
      title: isDemo
        ? 'Checkout works the same before and after.'
        : 'This still works after your edit.',
      detail:
        'GlassWeb followed the same action both times and did not find a meaningful change.',
      after: 'Worked the same',
    };
  }
  if (comparison.outcome === 'unknown') {
    return {
      title: 'GlassWeb needs a clearer second try.',
      detail:
        'The second file ended too early or did not contain the same action, so GlassWeb will not guess.',
      after: 'Not clear enough',
    };
  }
  if (comparison.outcome === 'changed') {
    return {
      title: 'This works differently after your edit.',
      detail: comparison.firstDifference
        ? `The first change appears in ${plainStage[comparison.firstDifference.layer]}.`
        : 'GlassWeb found a difference, but not enough to call it broken.',
      after: 'Finished differently',
    };
  }
  return {
    title: isDemo
      ? 'The button still clicks. Checkout now fails.'
      : 'This worked before your edit. Now it stops.',
    detail: isDemo
      ? 'The first change appears when the website tries to start checkout.'
      : comparison.firstDifference
        ? `The first change appears in ${plainStage[comparison.firstDifference.layer]}.`
        : 'GlassWeb found the first place where the two tries stopped matching.',
    after: isDemo ? 'Checkout returned an error' : 'Stopped after the edit',
  };
}

function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="comparison-inline-error" role="alert">
      <TriangleAlert aria-hidden="true" /> {message}
    </div>
  );
}

function SetupView(props: CompareStoryProps) {
  const before = props.hasBeforeReference
    ? props.check.baselineTrace
    : undefined;
  const beforeFocus = before?.focuses.find(
    (focus) => focus.id === props.check.baselineFocusId,
  );

  return (
    <div className="compare-flow-page">
      <section className="compare-flow-intro">
        <p>
          <Sparkles aria-hidden="true" /> Check an AI edit
        </p>
        <h1>
          {before
            ? 'Now show GlassWeb the same click after your edit.'
            : 'First, save one click while your site works.'}
        </h1>
        <span>
          {before
            ? 'Choose the file you made after the change.'
            : 'GlassWeb compares one important action before and after a change.'}
        </span>
      </section>

      <InlineError message={props.error} />

      <section className="compare-setup-card" aria-label="Files to compare">
        <article className={`compare-file-slot ${before ? 'is-ready' : ''}`}>
          <div className="compare-slot-label">
            <span>1</span>
            <div>
              <small>Before your edit</small>
              <strong>
                {before ? 'Working version ready' : 'The working version'}
              </strong>
            </div>
            {before ? <Check aria-label="Ready" /> : null}
          </div>
          {before ? (
            <>
              <p>{beforeFocus?.question ?? before.title}</p>
              <div className="compare-slot-links">
                <button onClick={props.onOpenBefore} type="button">
                  Choose a different file
                </button>
                <button onClick={props.onDownloadCheck} type="button">
                  <Download aria-hidden="true" /> Save for later
                </button>
              </div>
            </>
          ) : (
            <Button onClick={props.onOpenBefore} size="lg">
              <Import data-icon="inline-start" /> Open the before file
            </Button>
          )}
        </article>

        <div className="compare-slot-divider" aria-hidden="true">
          <ArrowRight />
        </div>

        <article className="compare-file-slot">
          <div className="compare-slot-label">
            <span>2</span>
            <div>
              <small>After your edit</small>
              <strong>{before ? 'The changed version' : 'Comes next'}</strong>
            </div>
          </div>
          <p>
            {before
              ? 'Do the same thing again, then open that file here.'
              : 'Add the working version first.'}
          </p>
          <Button disabled={!before} onClick={props.onOpenAfter} size="lg">
            <Import data-icon="inline-start" /> Open the after file
          </Button>
        </article>
      </section>

      <div className="compare-setup-help">
        <LockKeyhole aria-hidden="true" />
        <p>
          Your files stay on this device.{' '}
          <button onClick={props.onRecord} type="button">
            How do I make a file?
          </button>
        </p>
      </div>
    </div>
  );
}

function PairingView(props: CompareStoryProps) {
  const comparison = props.comparison;
  const after = props.afterTrace!;
  const isOriginBlock = comparison?.compatibility === 'blocked';
  const afterFocusId =
    props.selectedAfterFocusId ??
    comparison?.afterFocus?.id ??
    after.focuses[0]?.id;

  return (
    <div className="compare-flow-page">
      <section className="compare-flow-intro">
        <p>
          <CircleAlert aria-hidden="true" /> One quick check
        </p>
        <h1>
          {isOriginBlock
            ? 'Are these two versions of the same website?'
            : 'Did you do the same thing both times?'}
        </h1>
        <span>GlassWeb asks instead of making up a match.</span>
      </section>

      <InlineError message={props.error} />

      <section className="compare-confirm-card">
        <label>
          <span>Before your edit</span>
          <select
            onChange={(event) => props.onBeforeFocusChange(event.target.value)}
            value={props.check.baselineFocusId}
          >
            {props.check.baselineTrace.focuses.map((focus) => (
              <option key={focus.id} value={focus.id}>
                {focus.question}
              </option>
            ))}
          </select>
        </label>
        <ArrowRight aria-hidden="true" />
        <label>
          <span>After your edit</span>
          <select
            onChange={(event) => props.onAfterFocusChange(event.target.value)}
            value={afterFocusId}
          >
            {after.focuses.map((focus) => (
              <option key={focus.id} value={focus.id}>
                {focus.question}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="compare-confirm-action">
        <Button
          onClick={
            isOriginBlock ? props.onAllowDifferentOrigins : props.onForcePair
          }
          size="lg"
        >
          Yes, compare these <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function ResultView(props: CompareStoryProps) {
  const comparison = props.comparison!;
  const copy = resultCopy(comparison, props.isDemo);
  const isBroken = comparison.outcome === 'broken';
  const isUnknown = comparison.outcome === 'unknown';

  const primaryAction = () => {
    if (isUnknown) props.onOpenAfter();
    else props.onCopyPacket();
  };

  return (
    <div className={`compare-result-page is-${comparison.outcome}`}>
      <section className="compare-result-intro">
        <p>{props.isDemo ? 'Example — not your website' : 'Your result'}</p>
        <h1>{copy.title}</h1>
        <span>{copy.detail}</span>
      </section>

      <InlineError message={props.error} />

      <section
        className="compare-answer-card"
        aria-label="Before and after result"
      >
        <header>
          <span>
            <MousePointer2 aria-hidden="true" /> The same click, twice
          </span>
          <small>
            <LockKeyhole aria-hidden="true" /> Checked on this device
          </small>
        </header>

        <div className="compare-answer-sides">
          <article className="compare-answer-side is-before">
            <div className="compare-answer-browser">
              <div>
                <i />
                <i />
                <i />
                <span>your-site.com</span>
              </div>
              <button type="button" tabIndex={-1}>
                {comparison.actionLabel}
              </button>
            </div>
            <div className="compare-answer-status">
              <Check aria-hidden="true" />
              <span>
                <small>Before your edit</small>
                <strong>
                  {props.isDemo ? 'Checkout opened' : 'Worked as saved'}
                </strong>
              </span>
            </div>
          </article>

          <div className="compare-answer-divider" aria-hidden="true">
            <span>then</span>
            <ArrowRight />
          </div>

          <article className="compare-answer-side is-after">
            <div className="compare-answer-browser">
              <div>
                <i />
                <i />
                <i />
                <span>your-site.com</span>
              </div>
              <button type="button" tabIndex={-1}>
                {comparison.actionLabel}
              </button>
            </div>
            <div className="compare-answer-status">
              {comparison.outcome === 'matches' ? (
                <Check aria-hidden="true" />
              ) : comparison.outcome === 'unknown' ? (
                <CircleAlert aria-hidden="true" />
              ) : (
                <X aria-hidden="true" />
              )}
              <span>
                <small>After your edit</small>
                <strong>{copy.after}</strong>
              </span>
            </div>
          </article>
        </div>

        <div className="compare-answer-bottom">
          <div>
            <Sparkles aria-hidden="true" />
            <span>
              <small>
                {isBroken ? 'Where it first changed' : 'What GlassWeb found'}
              </small>
              <strong>
                {comparison.firstDifference
                  ? plainStage[comparison.firstDifference.layer]
                  : 'No meaningful difference'}
              </strong>
            </span>
          </div>
          <button onClick={props.onOpenProof} type="button">
            See how GlassWeb knows <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="compare-result-actions">
        <Button onClick={primaryAction} size="lg">
          {isUnknown ? (
            <RefreshCw data-icon="inline-start" />
          ) : (
            <Copy data-icon="inline-start" />
          )}
          {isUnknown
            ? 'Choose the after file again'
            : isBroken
              ? 'Copy this for my coding AI'
              : 'Copy what GlassWeb found'}
        </Button>
        {props.isDemo ? (
          <button onClick={props.onStartOwnComparison} type="button">
            Check my own website <ArrowRight aria-hidden="true" />
          </button>
        ) : (
          <button onClick={props.onStartOwnComparison} type="button">
            Start another check
          </button>
        )}
        {props.isDemo ? (
          <button onClick={props.onToggleDemo} type="button">
            {props.demoScenario === 'broken'
              ? 'Show it after the fix'
              : 'Show the broken version'}
          </button>
        ) : null}
      </div>
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
