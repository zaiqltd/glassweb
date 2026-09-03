'use client';

import { MousePointer2, Network, Radio, Route, Server } from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  GlassWebTrace,
  TraceEvent,
  TraceFocus,
  TraceLayer,
} from '@/lib/glassweb/types';

interface RuntimeWeaveProps {
  trace: GlassWebTrace;
  focus: TraceFocus;
  playhead: number;
  onSeek: (timestamp: number) => void;
}

const lanes: Array<{
  layer: TraceLayer;
  label: string;
  subtitle: string;
  icon: typeof MousePointer2;
}> = [
  {
    layer: 'visible',
    label: 'What you did',
    subtitle: 'Clicks and things you could see',
    icon: MousePointer2,
  },
  {
    layer: 'structure',
    label: 'What appeared',
    subtitle: 'Parts of the page',
    icon: Route,
  },
  {
    layer: 'behaviour',
    label: 'What the page did',
    subtitle: 'Reactions and changes',
    icon: Radio,
  },
  {
    layer: 'network',
    label: 'What it sent',
    subtitle: 'Messages leaving the page',
    icon: Network,
  },
  {
    layer: 'service',
    label: 'Where it went',
    subtitle: 'Your site and outside companies',
    icon: Server,
  },
];

const eventWidth = (event: TraceEvent) =>
  event.kind === 'request' || event.kind === 'response' ? 18 : 12;

export function RuntimeWeave({
  trace,
  focus,
  playhead,
  onSeek,
}: RuntimeWeaveProps) {
  const playheadPercent = Math.min(100, (playhead / trace.durationMs) * 100);

  return (
    <div className="relative h-full min-h-[590px] overflow-auto px-4 py-6 lg:px-7">
      <div
        className="instrument-grid pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative mx-auto min-w-[800px] max-w-[1400px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Replay what happened
            </p>
            <h2 className="mt-1 text-base font-medium">{trace.title}</h2>
          </div>
          <p className="max-w-md text-right text-xs text-muted-foreground">
            Read left to right. Bright moments are part of this answer.
          </p>
        </div>

        <div className="runtime-grid relative border-y border-border bg-card/45">
          <div
            aria-hidden="true"
            className="runtime-playhead"
            style={{
              left: `calc(180px + (100% - 180px) * ${playheadPercent / 100})`,
            }}
          >
            <span>{(playhead / 1000).toFixed(2)}s</span>
          </div>

          {lanes.map((lane) => {
            const Icon = lane.icon;
            const events = trace.events.filter(
              (event) => event.layer === lane.layer,
            );
            return (
              <div className="runtime-lane" key={lane.layer}>
                <div className="runtime-label">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <div>
                    <strong>{lane.label}</strong>
                    <span>{lane.subtitle}</span>
                  </div>
                </div>
                <div className="runtime-track">
                  {events.map((event) => {
                    const active = event.entityIds.some((id) =>
                      focus.entityIds.includes(id),
                    );
                    return (
                      <button
                        aria-label={`${event.label} at ${(event.timestamp / 1000).toFixed(2)} seconds`}
                        className={cn('runtime-event', active && 'is-active')}
                        key={event.id}
                        onClick={() => onSeek(event.timestamp)}
                        style={{
                          left: `${(event.timestamp / trace.durationMs) * 100}%`,
                          width: eventWidth(event),
                        }}
                        type="button"
                      >
                        <span className="runtime-event-label">
                          {event.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-[180px_1fr] items-center">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Move through the recording
          </span>
          <input
            aria-label="Session time"
            className="runtime-range"
            max={trace.durationMs}
            min={0}
            onChange={(event) => onSeek(Number(event.target.value))}
            step={10}
            type="range"
            value={playhead}
          />
        </div>
      </div>
    </div>
  );
}
