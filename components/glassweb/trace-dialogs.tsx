'use client';

import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Download,
  FileJson2,
  HelpCircle,
  GitCompareArrows,
  Radio,
  ShieldCheck,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TraceComparison } from '@/lib/glassweb/compare';
import type {
  EvidenceCertainty,
  GlassWebTrace,
  TraceEntity,
  TraceFocus,
} from '@/lib/glassweb/types';

const certaintyIcon = {
  observed: CheckCircle2,
  correlated: Radio,
  inferred: CircleDashed,
  unknown: HelpCircle,
} satisfies Record<EvidenceCertainty, typeof CheckCircle2>;

const certaintyLabel: Record<EvidenceCertainty, string> = {
  observed: 'We saw it',
  correlated: 'Best match',
  inferred: 'Likely',
  unknown: "We can't tell",
};

const sourceLabel: Record<GlassWebTrace['evidence'][number]['source'], string> =
  {
    dom: 'The page',
    performance: 'Browser timing',
    instrumentation: 'Recorded action',
    cdp: 'Browser tools',
    rule: 'GlassWeb rule',
    model: 'Model result',
  };

const relationLabel: Record<
  GlassWebTrace['relations'][number]['kind'],
  string
> = {
  contains: 'contains',
  renders: 'shows',
  'listens-to': 'reacts to',
  triggers: 'starts',
  initiates: 'sends',
  returns: 'comes back to',
  mutates: 'changes',
  'navigates-to': 'opens',
  'provided-by': 'handled by',
};

function ModalShell({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const appScroller = document.querySelector<HTMLElement>('.glassweb-app');
    const previousOverflow = appScroller?.style.overflow;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    if (appScroller) appScroller.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      if (dialog?.open) dialog.close();
      if (appScroller) appScroller.style.overflow = previousOverflow ?? '';
      previous?.focus();
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={cn('glassweb-modal', wide && 'glassweb-modal-wide')}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      ref={dialogRef}
    >
      <Button
        aria-label="Close dialog"
        className="glassweb-modal-close"
        onClick={() => onOpenChange(false)}
        ref={closeRef}
        size="icon-sm"
        variant="ghost"
      >
        <X />
      </Button>
      <header className="glassweb-modal-header">
        {eyebrow}
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
      </header>
      <div className="glassweb-modal-body">{children}</div>
      <footer className="glassweb-modal-footer">{footer}</footer>
    </dialog>
  );
}

export function CaptureDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: () => void;
}) {
  return (
    <ModalShell
      description="GlassWeb currently uses a small experimental Chrome extension. It watches one action, saves a file, and uploads nothing."
      footer={
        <>
          <Button variant="outline" onClick={onImport}>
            <FileJson2 data-icon="inline-start" /> Open my GlassWeb file
          </Button>
          <a
            className={cn(buttonVariants({ variant: 'default' }))}
            download
            href="/glassweb-recorder.zip"
          >
            <Download className="size-4" /> Download the Chrome extension
          </a>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Use GlassWeb on your website"
    >
      <>
        <ol className="capture-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Add it to desktop Chrome</strong>
              <p>Download the ZIP and load the folder once.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Do the one thing you want explained</strong>
              <p>Press Record, click the button or form, then stop.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Open the saved file here</strong>
              <p>GlassWeb turns it into a plain answer on this device.</p>
            </div>
          </li>
        </ol>

        <div className="flex items-start gap-2 border border-primary/25 bg-primary/6 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            No sign-in and no upload. Passwords, form text, cookies, and message
            contents are not saved. Review the file before sharing it.
          </p>
        </div>

        <details className="install-details">
          <summary>Show the Chrome installation steps</summary>
          <ol>
            <li>Download the recorder ZIP, then unzip it.</li>
            <li>
              Open <code>chrome://extensions</code> in desktop Chrome.
            </li>
            <li>Turn on Developer mode in the top-right corner.</li>
            <li>Choose Load unpacked.</li>
            <li>
              Select the unzipped <code>glassweb-recorder</code> folder.
            </li>
            <li>Pin GlassWeb Recorder so it is easy to reopen.</li>
          </ol>
        </details>
      </>
    </ModalShell>
  );
}

export function EvidenceDialog({
  entity,
  focus,
  trace,
  open,
  onOpenChange,
}: {
  entity: TraceEntity | undefined;
  focus: TraceFocus;
  trace: GlassWebTrace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entity) return null;

  const path = focus.relationIds
    .map((id) => trace.relations.find((relation) => relation.id === id))
    .filter((relation) => relation !== undefined);
  const directEvidence = [
    ...new Set(
      [...focus.entityIds, ...focus.relationIds].flatMap((id) => {
        const record =
          trace.entities.find((candidate) => candidate.id === id) ??
          trace.relations.find((candidate) => candidate.id === id);
        return record?.evidenceIds ?? [];
      }),
    ),
  ]
    .map((id) => trace.evidence.find((candidate) => candidate.id === id))
    .filter((candidate) => candidate !== undefined);

  return (
    <ModalShell
      description={focus.summary}
      eyebrow={
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          <CheckCircle2 className="size-3" /> Recorded answer path
        </div>
      }
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={focus.question}
      wide
    >
      <>
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            How GlassWeb knows
          </p>
          <div className="evidence-path">
            {path.map((relation, index) => {
              const from = trace.entities.find(
                (candidate) => candidate.id === relation.from,
              );
              const to = trace.entities.find(
                (candidate) => candidate.id === relation.to,
              );
              const RelationIcon = certaintyIcon[relation.certainty];
              return (
                <div
                  className="evidence-path-step"
                  data-certainty={relation.certainty}
                  key={relation.id}
                >
                  <span className="evidence-path-number">{index + 1}</span>
                  <div>
                    <strong>{from?.humanLabel ?? 'Recorded item'}</strong>
                    <p>
                      {relationLabel[relation.kind]}{' '}
                      <b>{to?.humanLabel ?? 'the next step'}</b>
                    </p>
                  </div>
                  <small>
                    <RelationIcon aria-hidden="true" />
                    {certaintyLabel[relation.certainty]}
                  </small>
                </div>
              );
            })}
          </div>
        </div>

        <details className="technical-details">
          <summary>Technical details</summary>
          <div className="evidence-raw">
            <span>Selected page item</span>
            <code>{entity.technicalLabel}</code>
          </div>
          <div className="space-y-2">
            {directEvidence.map((item) => (
              <div className="evidence-source" key={item.id}>
                <span>{sourceLabel[item.source]}</span>
                <p>{item.explanation}</p>
                <small>
                  {item.eventIds.length > 0
                    ? `${item.eventIds.length} recorded event${item.eventIds.length === 1 ? '' : 's'}`
                    : 'Capture record'}
                </small>
              </div>
            ))}
          </div>
        </details>
      </>
    </ModalShell>
  );
}

export function RedactionDialog({
  trace,
  open,
  onOpenChange,
  onExport,
}: {
  trace: GlassWebTrace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => void;
}) {
  return (
    <ModalShell
      description="The complete recording metadata will be downloaded to your computer. Review what it contains before you share it."
      eyebrow={
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          <ShieldCheck className="size-3" /> Privacy check
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onExport}>
            <Download data-icon="inline-start" /> Save recording
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Review before saving"
    >
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium">Left out</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {trace.redaction.removed.map((item) => (
                <li key={item}>— {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium">Included</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {trace.redaction.retained.map((item) => (
                <li key={item}>+ {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </>
    </ModalShell>
  );
}

export function ComparisonEvidenceDialog({
  comparison,
  open,
  onOpenChange,
  onOpenXray,
}: {
  comparison: TraceComparison | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenXray: () => void;
}) {
  if (!comparison) return null;

  const stateLabel = {
    same: 'Same in both',
    added: 'New after',
    removed: 'Not recorded after',
    changed: 'Changed here',
    uncertain: 'Not enough proof',
  } as const;
  const allTechnicalDetails = comparison.details.some(
    (step) => step.state !== 'same',
  )
    ? comparison.details.filter((step) => step.state !== 'same')
    : comparison.steps;
  const technicalDetails = allTechnicalDetails.slice(0, 100);
  const firstPlace = comparison.firstDifference
    ? {
        visible: 'what you clicked',
        structure: 'the button on the page',
        behaviour: 'what the page did next',
        network: 'the step that starts the next page',
        service: 'the outside tool the page opened',
      }[comparison.firstDifference.layer]
    : undefined;
  const plainSummary =
    comparison.outcome === 'matches'
      ? 'GlassWeb followed the same action both times and did not find a meaningful change.'
      : comparison.outcome === 'unknown'
        ? 'The second file was not clear enough, so GlassWeb stopped instead of guessing.'
        : firstPlace
          ? `The action stayed the same until ${firstPlace}. That is the first place GlassWeb saw a change.`
          : 'GlassWeb found a difference between the two files.';

  return (
    <ModalShell
      description="GlassWeb compares the same action twice and stops at the first meaningful change. It will not guess beyond what the files show."
      eyebrow={
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          <GitCompareArrows className="size-3" /> Before / after
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onOpenXray();
            }}
          >
            Open advanced view <ArrowRight data-icon="inline-end" />
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="How GlassWeb reached this answer"
      wide
    >
      <>
        <div className="comparison-evidence-summary">
          <span data-outcome={comparison.outcome}>
            {comparison.outcome === 'matches'
              ? 'Still matches'
              : comparison.outcome === 'unknown'
                ? 'Cannot compare yet'
                : 'Difference found'}
          </span>
          <p>{plainSummary}</p>
        </div>

        <details className="technical-details">
          <summary>Show exact browser details</summary>
          <div className="comparison-evidence-disclosure">
            <ol className="comparison-evidence-list">
              {comparison.steps.map((step, index) => (
                <li className={`is-${step.state}`} key={step.key}>
                  <span className="comparison-evidence-number">
                    {index + 1}
                  </span>
                  <div>
                    <small>{stateLabel[step.state]}</small>
                    <strong>
                      {step.before?.humanLabel ??
                        step.after?.humanLabel ??
                        step.layer}
                    </strong>
                    <p>{step.humanSummary}</p>
                    {step.evidenceWarning || step.timingWarning ? (
                      <p className="comparison-evidence-warning">
                        {step.evidenceWarning ?? step.timingWarning}
                      </p>
                    ) : null}
                  </div>
                  <dl>
                    <div>
                      <dt>Before</dt>
                      <dd>{step.expected}</dd>
                    </div>
                    <div>
                      <dt>After</dt>
                      <dd>{step.actual}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>

            <div className="comparison-technical-list">
              {technicalDetails.map((step) => (
                <div key={`technical-${step.key}`}>
                  <span>{step.layer}</span>
                  <code>{step.before?.technicalLabel ?? 'Not recorded'}</code>
                  <ArrowRight aria-hidden="true" />
                  <code>{step.after?.technicalLabel ?? 'Not recorded'}</code>
                  <small>
                    Evidence: {step.certainty} · Match: {step.matchConfidence}
                  </small>
                </div>
              ))}
              {allTechnicalDetails.length > technicalDetails.length ? (
                <p className="comparison-evidence-warning">
                  {allTechnicalDetails.length - technicalDetails.length} more
                  recorded steps are omitted here to keep the browser
                  responsive. The result still checks all of them.
                </p>
              ) : null}
            </div>
          </div>
        </details>
      </>
    </ModalShell>
  );
}
