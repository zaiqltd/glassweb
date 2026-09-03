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

const sourceLabel: Record<GlassWebTrace['evidence'][number]['source'], string> = {
  dom: 'The page',
  performance: 'Browser timing',
  instrumentation: 'Recorded action',
  cdp: 'Browser tools',
  rule: 'GlassWeb rule',
  model: 'Model result',
};

const relationLabel: Record<GlassWebTrace['relations'][number]['kind'], string> = {
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
    const previousOverflow = document.body.style.overflow;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div
      className="glassweb-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      role="presentation"
    >
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn('glassweb-modal', wide && 'glassweb-modal-wide')}
        open
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
    </div>
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
      description="Start watching, do the one thing you want explained, then open the result. Everything happens on your computer."
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
      title="Let GlassWeb watch one quick test"
    >
      <>
        <ol className="capture-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Add the recorder</strong>
              <p>One-time Chrome setup on your computer.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Do one thing</strong>
              <p>Click the button, submit the form, or reproduce the problem.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>See the answer</strong>
              <p>
                Open the saved recording here. GlassWeb turns it into a simple
                story.
              </p>
            </div>
          </li>
        </ol>

        <div className="flex items-start gap-2 border border-primary/25 bg-primary/6 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            GlassWeb never saves passwords, form text, cookies, message bodies,
            or private URL values.
          </p>
        </div>
      </>
    </ModalShell>
  );
}

export function EvidenceDialog({
  entity,
  trace,
  open,
  onOpenChange,
}: {
  entity: TraceEntity | undefined;
  trace: GlassWebTrace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entity) return null;

  const Icon = certaintyIcon[entity.certainty];
  const connected = trace.relations.filter(
    (relation) => relation.from === entity.id || relation.to === entity.id,
  );
  const directEvidence = entity.evidenceIds
    .map((id) => trace.evidence.find((candidate) => candidate.id === id))
    .filter((candidate) => candidate !== undefined);

  return (
    <ModalShell
      description={entity.description}
      eyebrow={
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          <Icon className="size-3" /> {certaintyLabel[entity.certainty]}
        </div>
      }
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={entity.humanLabel}
      wide
    >
      <>
        <div className="evidence-raw">
          <span>Technical name - optional</span>
          <code>{entity.technicalLabel}</code>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Why GlassWeb believes this
          </p>
          <div className="space-y-2">
            {directEvidence.map((item) => (
              <div className="evidence-source" key={item.id}>
                <span>{sourceLabel[item.source]}</span>
                <p>{item.explanation}</p>
                <small>
                  {item.eventIds.length > 0
                    ? `${item.eventIds.length} recorded event${item.eventIds.length === 1 ? '' : 's'}`
                    : 'Direct capture record'}
                </small>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            What this connects to
          </p>
          <div className="space-y-2">
            {connected.length > 0 ? (
              connected.map((relation) => {
                const otherId =
                  relation.from === entity.id ? relation.to : relation.from;
                const other = trace.entities.find(
                  (candidate) => candidate.id === otherId,
                );
                return (
                  <div className="evidence-relation" key={relation.id}>
                    <span>{relationLabel[relation.kind]}</span>
                    <div>
                      <strong>{other?.humanLabel ?? otherId}</strong>
                      <p>{relation.explanation}</p>
                    </div>
                    <small>{certaintyLabel[relation.certainty]}</small>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                GlassWeb did not find a connected step here.
              </p>
            )}
          </div>
        </div>
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
      description="GlassWeb downloads only the useful explanation data. Check what is left out before saving the result."
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
            <Download data-icon="inline-start" /> Download result
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Download a privacy-safe result"
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
