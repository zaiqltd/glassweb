'use client';

import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  Mail,
  MousePointerClick,
  Play,
  ReceiptText,
  ScanSearch,
  Send,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

import { PageSurface } from '@/components/glassweb/page-surface';
import { Button } from '@/components/ui/button';
import { certaintyCounts, getEntityMap } from '@/lib/glassweb/trace-utils';
import type {
  GlassWebTrace,
  TraceFocus,
  TraceLayer,
} from '@/lib/glassweb/types';

interface SimpleStoryProps {
  trace: GlassWebTrace;
  focus: TraceFocus;
  onChooseFocus: (focusId: string) => void;
  onSelectEntity: (entityId: string) => void;
  onOpenEvidence: () => void;
  onOpenProof: () => void;
  onReplay: () => void;
  onCopyBrief: () => void;
}

interface StoryStep {
  label: string;
  title: string;
  detail: string;
}

interface FriendlyStory {
  shortLabel: string;
  question: string;
  answer: string;
  why: string;
  steps: StoryStep[];
}

const friendlyStories: Record<string, FriendlyStory> = {
  price: {
    shortLabel: 'This price',
    question: 'Why am I seeing R1,499?',
    answer:
      'Orbit looked up the South African price and placed R1,499 in the Pro card after the page opened.',
    why: 'If the price is wrong or missing, you now know exactly where to look instead of debugging the whole page.',
    steps: [
      {
        label: 'You do',
        title: 'Open the pricing page',
        detail: 'The plans appear first.',
      },
      {
        label: 'The site does',
        title: 'Checks the South African price',
        detail: 'This happens after the page opens.',
      },
      {
        label: 'It talks to',
        title: "Orbit's pricing system",
        detail: 'The system sends the amount back.',
      },
      {
        label: 'You get',
        title: 'R1,499 in the Pro card',
        detail: 'The visible page updates.',
      },
    ],
  },
  checkout: {
    shortLabel: 'Start Pro',
    question: 'What happens after someone clicks Start Pro?',
    answer:
      'Start Pro asks Orbit to create a Stripe checkout session. This recording stops before the later page change.',
    why: 'If customers cannot pay, you can see whether the button, Orbit, or Stripe is where things stopped.',
    steps: [
      {
        label: 'You do',
        title: 'Click Start Pro',
        detail: 'The button receives the click.',
      },
      {
        label: 'The site does',
        title: 'Starts a Pro checkout',
        detail: 'Orbit asks for a secure payment session.',
      },
      {
        label: 'It talks to',
        title: 'Stripe',
        detail: 'Stripe creates the checkout.',
      },
      {
        label: 'Stripe returns',
        title: 'A checkout session',
        detail: 'The later page change is not in this recording.',
      },
    ],
  },
  billing: {
    shortLabel: 'Annual billing',
    question: 'What changes when I choose Annual?',
    answer:
      'The billing control asks Orbit for annual pricing, then replaces the monthly amount on this page.',
    why: 'If the annual discount looks wrong, you can separate the control, the request, and the price update.',
    steps: [
      {
        label: 'You do',
        title: 'Choose Annual',
        detail: 'The billing control receives the click.',
      },
      {
        label: 'The site does',
        title: 'Changes the billing period',
        detail: 'Orbit prepares the annual price.',
      },
      {
        label: 'It talks to',
        title: "Orbit's pricing system",
        detail: 'The annual amount comes back.',
      },
      {
        label: 'You get',
        title: 'An updated price',
        detail: 'The Pro card changes without leaving the page.',
      },
    ],
  },
  analytics: {
    shortLabel: 'Who gets data',
    question: 'Which outside company is contacted?',
    answer:
      'Segment receives a “Plan Viewed” message shortly after the Pro card appears.',
    why: 'You can spot silent tracking and confirm it goes to the company you expected.',
    steps: [
      {
        label: 'You do',
        title: 'Open the pricing page',
        detail: 'The Pro plan appears.',
      },
      {
        label: 'The site does',
        title: 'Notices the plan was shown',
        detail: 'A tracking action runs.',
      },
      {
        label: 'It talks to',
        title: 'Segment',
        detail: 'A “Plan Viewed” message is sent.',
      },
      {
        label: 'You learn',
        title: 'Who received the data',
        detail: 'Private values are not saved in the trace.',
      },
    ],
  },
  ai: {
    shortLabel: 'What AI sees',
    question: 'Will AI tools see my prices?',
    answer:
      'Some will not. The plan names are there immediately, but the prices only appear after the page does extra work.',
    why: 'Your page can look perfect to people while AI tools completely miss the information customers care about.',
    steps: [
      {
        label: 'AI gets',
        title: 'The first version of the page',
        detail: 'It can read the plan names.',
      },
      {
        label: 'The browser does',
        title: 'Extra work after opening',
        detail: 'It asks for regional prices.',
      },
      {
        label: 'A person sees',
        title: 'R1,499',
        detail: 'Their browser waits for the update.',
      },
      {
        label: 'Some AI sees',
        title: 'No price at all',
        detail: 'It leaves before the extra work finishes.',
      },
    ],
  },
  newsletter: {
    shortLabel: 'Email signup',
    question: 'Where does the email address go?',
    answer:
      'Submitting the form is followed by a request to Klaviyo. GlassWeb does not inspect or save the email value.',
    why: 'You can verify where subscriber information goes without copying private information into the trace.',
    steps: [
      {
        label: 'You do',
        title: 'Ask for updates',
        detail: 'The form is submitted.',
      },
      {
        label: 'The site does',
        title: 'Starts the signup',
        detail: 'It prepares one request.',
      },
      {
        label: 'It talks to',
        title: 'Klaviyo',
        detail: 'A signup request reaches the email platform.',
      },
      {
        label: 'GlassWeb keeps',
        title: 'The destination, not the email',
        detail: 'The private value is discarded.',
      },
    ],
  },
};

const layerLabels: Record<TraceLayer, string> = {
  visible: 'You see',
  structure: 'The page uses',
  behaviour: 'The site does',
  network: 'It sends',
  service: 'It reaches',
};

function genericStory(trace: GlassWebTrace, focus: TraceFocus): FriendlyStory {
  const entityMap = getEntityMap(trace);
  const entities = focus.entityIds
    .map((id) => entityMap.get(id))
    .filter((entity) => Boolean(entity));
  const preferredLayers: TraceLayer[] = [
    'visible',
    'behaviour',
    'network',
    'service',
  ];
  const steps = preferredLayers
    .map((layer) => entities.find((entity) => entity?.layer === layer))
    .filter((entity) => Boolean(entity))
    .map((entity) => ({
      label: layerLabels[entity!.layer],
      title: entity!.humanLabel,
      detail: {
        visible: 'This is the part of the page you used.',
        structure: 'This is the page part behind what you saw.',
        behaviour: 'The page reacted to your action.',
        network: 'A browser request happened during this action.',
        service: 'This is the destination the browser contacted.',
      }[entity!.layer],
    }));

  const surface = entities.find(
    (entity) => entity?.id === focus.surfaceEntityId,
  );
  const request = entities.find((entity) => entity?.layer === 'network');
  const service = entities.find((entity) => entity?.layer === 'service');
  const answer =
    request && service
      ? `After “${surface?.humanLabel ?? focus.label}”, the page contacted ${service.humanLabel}. GlassWeb saw the request happen nearby; it cannot prove the click caused it.`
      : request
        ? `After “${surface?.humanLabel ?? focus.label}”, the browser sent ${request.humanLabel}. No final service was identified.`
        : `GlassWeb recorded “${surface?.humanLabel ?? focus.label}”, but no outgoing request could be matched to it.`;

  return {
    shortLabel: focus.label,
    question: focus.question,
    answer,
    why: request
      ? 'You can hand this bounded observation to a coding agent to explain what to inspect, without pretending one recording proves a break.'
      : 'The missing connection is useful too: it tells you what this recording can and cannot explain.',
    steps,
  };
}

const focusIcons = [MousePointerClick, Eye, CalendarClock, Send, Bot, Mail];

export function SimpleStory({
  trace,
  focus,
  onChooseFocus,
  onSelectEntity,
  onOpenEvidence,
  onOpenProof,
  onReplay,
  onCopyBrief,
}: SimpleStoryProps) {
  const [showAll, setShowAll] = useState(false);
  const isDemo = trace.id === 'demo-orbit-pricing';
  const story =
    (isDemo ? friendlyStories[focus.id] : undefined) ??
    genericStory(trace, focus);
  const counts = certaintyCounts(trace, focus);
  const proofParts = [
    counts.observed > 0
      ? `${counts.observed} ${counts.observed === 1 ? 'step was' : 'steps were'} seen directly`
      : '',
    counts.correlated > 0
      ? `${counts.correlated} ${counts.correlated === 1 ? 'is a timing match' : 'are timing matches'}`
      : '',
    counts.inferred > 0
      ? `${counts.inferred} ${counts.inferred === 1 ? 'is likely' : 'are likely'}`
      : '',
    counts.unknown > 0
      ? `${counts.unknown} ${counts.unknown === 1 ? 'is still unclear' : 'are still unclear'}`
      : '',
  ].filter(Boolean);
  const proofLine = `${proofParts.join('. ')}.`;
  const demoOrder = [
    'checkout',
    'price',
    'billing',
    'analytics',
    'ai',
    'newsletter',
  ];
  const orderedFocuses = isDemo
    ? [...trace.focuses].sort(
        (left, right) =>
          demoOrder.indexOf(left.id) - demoOrder.indexOf(right.id),
      )
    : trace.focuses;
  const visibleFocuses = showAll ? orderedFocuses : orderedFocuses.slice(0, 6);

  return (
    <div className="simple-story">
      <section className="simple-hero">
        <div>
          <p className="simple-kicker">
            <Sparkles aria-hidden="true" /> No DevTools required
          </p>
          <h1>Understand one recording, without DevTools.</h1>
          <p>
            GlassWeb turns one recorded action into a plain-English answer and
            proof. Made an edit? Compare it with another recording.
          </p>
        </div>
        <div className="simple-promise">
          <CheckCircle2 aria-hidden="true" />
          <span>
            <strong>Answer first. Proof underneath.</strong>
            Nothing is invented to fill a gap.
          </span>
        </div>
      </section>

      <a className="skip-to-answer" href="#glassweb-answer">
        Skip to the answer
      </a>

      <div className="simple-workspace">
        <aside className="simple-questions" aria-label="Questions to explore">
          <div>
            <p className="simple-section-label">Choose one question</p>
            <h2>What should GlassWeb explain?</h2>
          </div>

          <div className="simple-question-list">
            {visibleFocuses.map((candidate, index) => {
              const Icon = focusIcons[index] ?? ScanSearch;
              const content =
                (isDemo ? friendlyStories[candidate.id] : undefined) ??
                genericStory(trace, candidate);
              return (
                <button
                  aria-pressed={candidate.id === focus.id}
                  className="simple-question"
                  key={candidate.id}
                  onClick={() => onChooseFocus(candidate.id)}
                  type="button"
                >
                  <span className="simple-question-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <small>{content.shortLabel}</small>
                    <strong>{content.question}</strong>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </button>
              );
            })}
            {trace.focuses.length > 6 ? (
              <button
                className="simple-question-more"
                onClick={() => setShowAll((current) => !current)}
                type="button"
              >
                {showAll
                  ? 'Show fewer'
                  : `Show ${trace.focuses.length - 6} more`}
              </button>
            ) : null}
          </div>
        </aside>

        <section className="simple-answer" id="glassweb-answer">
          <div className="simple-answer-top">
            <div className="simple-answer-copy" key={focus.id}>
              <p className="simple-section-label">The short answer</p>
              <p className="simple-current-question">{story.question}</p>
              <h2 aria-live="polite">{story.answer}</h2>
              <div className="simple-why">
                <Sparkles aria-hidden="true" />
                <div>
                  <strong>Why you care</strong>
                  <p>{story.why}</p>
                </div>
              </div>
            </div>

            <div className="simple-page-preview">
              <div className="simple-page-label">
                <span>{isDemo ? 'Interactive example' : 'Your recording'}</span>
                <strong>Click anything highlighted</strong>
              </div>
              <PageSurface
                aiMode={focus.id === 'ai'}
                focus={focus}
                onSelectEntity={onSelectEntity}
                trace={trace}
              />
            </div>
          </div>

          <div className="simple-steps">
            <p className="simple-section-label">What happened</p>
            <div className="simple-step-list" key={`steps-${focus.id}`}>
              {story.steps.map((step, index) => (
                <div
                  className="simple-step"
                  key={`${step.label}-${step.title}`}
                >
                  <span className="simple-step-number">{index + 1}</span>
                  <small>{step.label}</small>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                  {index < story.steps.length - 1 ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="simple-step-arrow"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="simple-proof-bar">
            <div>
              <CheckCircle2 aria-hidden="true" />
              <span>
                <strong>GlassWeb is showing its confidence.</strong>
                {proofLine}
              </span>
            </div>
            <div className="simple-proof-actions">
              <Button onClick={onCopyBrief} size="lg">
                <Copy data-icon="inline-start" /> Copy proof for my AI
              </Button>
              <Button onClick={onReplay} size="lg" variant="outline">
                <Play data-icon="inline-start" /> Watch it happen
              </Button>
              <Button onClick={onOpenEvidence} size="lg" variant="outline">
                <ReceiptText data-icon="inline-start" /> How do you know?
              </Button>
              <button
                className="simple-xray-link"
                onClick={onOpenProof}
                type="button"
              >
                Open full X-ray <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
