'use client';

import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ReceiptText,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getEntityMap } from '@/lib/glassweb/trace-utils';
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

const brokenCheckoutStory: FriendlyStory = {
  shortLabel: 'Start Pro',
  question: 'What happened after someone clicked Start Pro?',
  answer:
    'The Start Pro button worked. The problem appeared when checkout returned an error.',
  why: 'This shows where the problem appeared. It does not pretend to know which line of code caused it.',
  steps: [
    {
      label: 'You did',
      title: 'Clicked Start Pro',
      detail: 'The button received the click.',
    },
    {
      label: 'The website did',
      title: 'Tried to start checkout',
      detail: 'The next step began normally.',
    },
    {
      label: 'What came back',
      title: 'Checkout returned an error',
      detail: 'This is where the action stopped.',
    },
  ],
};

const layerLabels: Record<TraceLayer, string> = {
  visible: 'You see',
  structure: 'The page uses',
  behaviour: 'The site does',
  network: 'The website does',
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
        network: 'The website tried its next step.',
        service: 'This is the destination the browser contacted.',
      }[entity!.layer],
    }));

  const surface = entities.find(
    (entity) => entity?.id === focus.surfaceEntityId,
  );
  const request = entities.find((entity) => entity?.layer === 'network');
  const service = entities.find((entity) => entity?.layer === 'service');
  const requestStatus = request?.attributes?.status;
  const requestFailed =
    request?.attributes?.failed === true ||
    (typeof requestStatus === 'number' && requestStatus >= 400);
  const answer = requestFailed
    ? `GlassWeb saw “${surface?.humanLabel ?? focus.label}”. The problem appeared when the website tried the next step and got an error.`
    : request && service
      ? `After “${surface?.humanLabel ?? focus.label}”, the page contacted ${service.humanLabel}. GlassWeb saw the request happen nearby; it cannot prove the click caused it.`
      : request
        ? `After “${surface?.humanLabel ?? focus.label}”, the browser sent ${request.humanLabel}. No final service was identified.`
        : `GlassWeb recorded “${surface?.humanLabel ?? focus.label}”, but no outgoing request could be matched to it.`;

  return {
    shortLabel: focus.label,
    question: focus.question,
    answer,
    why: requestFailed
      ? 'This narrows down where to look without pretending one website action can identify the exact line of broken code.'
      : request
        ? 'You can hand this bounded observation to a coding agent to explain what to inspect, without pretending one recording proves a break.'
        : 'The missing connection is useful too: it tells you what this recording can and cannot explain.',
    steps,
  };
}

export function SimpleStory(props: SimpleStoryProps) {
  const {
    trace,
    focus,
    onChooseFocus,
    onOpenEvidence,
    onOpenProof,
    onCopyBrief,
  } = props;
  const isDemo = trace.id.startsWith('demo-orbit-pricing');
  const story =
    (trace.id.endsWith('-broken') && focus.id === 'checkout'
      ? brokenCheckoutStory
      : undefined) ??
    (isDemo ? friendlyStories[focus.id] : undefined) ??
    genericStory(trace, focus);

  return (
    <div className="plain-story-page">
      <section className="plain-story-heading">
        <p>
          <Sparkles aria-hidden="true" /> GlassWeb followed your action
        </p>
        <h1>{story.question}</h1>
      </section>

      <section className="plain-story-card" key={focus.id}>
        <div className="plain-story-answer">
          <small>Plain answer</small>
          <h2 aria-live="polite">{story.answer}</h2>
          <p>{story.why}</p>
        </div>

        <ol className="plain-story-path" aria-label="What happened next">
          {story.steps.map((step, index) => (
            <li key={`${step.label}-${step.title}`}>
              <span>{index + 1}</span>
              <div>
                <small>{step.label}</small>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
              {index < story.steps.length - 1 ? (
                <ArrowRight aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>

        <div className="plain-story-actions">
          <Button onClick={onCopyBrief} size="lg">
            <Copy data-icon="inline-start" /> Copy this for my coding AI
          </Button>
          <button onClick={onOpenEvidence} type="button">
            <ReceiptText aria-hidden="true" /> See how GlassWeb knows
          </button>
        </div>
      </section>

      {trace.focuses.length > 1 ? (
        <details className="plain-story-more">
          <summary>Explain a different thing I did</summary>
          <div>
            {trace.focuses
              .filter((candidate) => candidate.id !== focus.id)
              .map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => onChooseFocus(candidate.id)}
                  type="button"
                >
                  {candidate.question} <ArrowRight aria-hidden="true" />
                </button>
              ))}
          </div>
        </details>
      ) : null}

      <button
        className="plain-story-advanced"
        onClick={onOpenProof}
        type="button"
      >
        Open the advanced view
      </button>
    </div>
  );
}
