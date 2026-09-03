'use client';

import {
  CheckCircle2,
  CircleDashed,
  Download,
  FileJson2,
  HelpCircle,
  Radio,
  ShieldCheck,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
      description="Install the desktop recorder once, do the one thing you want explained, then open the saved recording here."
      footer={
        <>
          <Button variant="outline" onClick={onImport}>
            <FileJson2 data-icon="inline-start" /> I have a recording
          </Button>
          <a
            className={cn(buttonVariants({ variant: 'default' }))}
            download
            href="/glassweb-recorder.zip"
          >
            <Download className="size-4" /> Get the Chrome recorder
          </a>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Record one action on your website"
    >
      <>
        <ol className="capture-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Install the desktop recorder</strong>
              <p>Download the ZIP and load its folder into Chrome once.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Start watching, then do one thing</strong>
              <p>Click a button, submit a form, or reproduce the problem.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Stop and save</strong>
              <p>
                Return here and choose Open a recording. GlassWeb turns it into
                a simple answer.
              </p>
            </div>
          </li>
        </ol>

        <div className="flex items-start gap-2 border border-primary/25 bg-primary/6 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            GlassWeb never saves passwords, what you type into forms, cookies,
            message bodies, or private URL values.
          </p>
        </div>

        <details className="install-details">
          <summary>Show the exact 60-second installation steps</summary>
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
