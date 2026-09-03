'use client';

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  Mail,
  MousePointerClick,
  Play,
  ReceiptText,
  ScanSearch,
  Send,
  Sparkles,
} from 'lucide-react';

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
    question: 'Where does Start Pro take my customer?',
    answer:
      'The site creates a fresh checkout with Stripe, then sends the customer there to pay.',
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
        label: 'You get',
        title: 'A payment page',
        detail: 'The customer continues to Stripe.',
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
      'The site sends the address to Klaviyo, but GlassWeb does not save the address itself.',
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
        detail: 'Klaviyo receives the signup.',
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
      detail: entity!.description,
    }));

  return {
    shortLabel: focus.label,
    question: focus.question,
    answer: focus.summary,
    why: focus.detail,
    steps,
  };
}

const focusIcons = [Eye, MousePointerClick, Send, Bot, Mail];

export function SimpleStory({
  trace,
  focus,
  onChooseFocus,
  onSelectEntity,
  onOpenEvidence,
  onOpenProof,
  onReplay,
}: SimpleStoryProps) {
  const story = friendlyStories[focus.id] ?? genericStory(trace, focus);
  const counts = certaintyCounts(trace, focus);
  const proofLine =
    counts.correlated > 0
      ? `${counts.observed} connections were seen directly. ${counts.correlated} is shown as likely, not certain.`
      : `${counts.observed} connections were seen directly in the browser.`;

  return (
    <div className="simple-story">
      <section className="simple-hero">
        <div>
          <p className="simple-kicker">
            <Sparkles aria-hidden="true" /> No code required
          </p>
          <h1>Pick something on a website. Get the story behind it.</h1>
          <p>
            GlassWeb watches a website work, then explains what happened, where
            the data went, and what AI might miss - in plain English.
          </p>
        </div>
        <div className="simple-promise">
          <CheckCircle2 aria-hidden="true" />
          <span>
            <strong>One question at a time.</strong>
            Technical details stay hidden until you ask for them.
          </span>
        </div>
      </section>

      <div className="simple-workspace">
        <aside className="simple-questions" aria-label="Questions to explore">
          <div>
            <p className="simple-section-label">Start with a question</p>
            <h2>What do you want to understand?</h2>
          </div>

          <div className="simple-question-list">
            {trace.focuses.map((candidate, index) => {
              const Icon = focusIcons[index] ?? ScanSearch;
              const content =
                friendlyStories[candidate.id] ?? genericStory(trace, candidate);
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
          </div>
        </aside>

        <section className="simple-answer" aria-live="polite">
          <div className="simple-answer-top">
            <div className="simple-answer-copy">
              <p className="simple-section-label">The short answer</p>
              <p className="simple-current-question">{story.question}</p>
              <h2>{story.answer}</h2>
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
                <span>Example page</span>
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
            <div className="simple-step-list">
              {story.steps.map((step, index) => (
                <div className="simple-step" key={`${step.label}-${step.title}`}>
                  <span className="simple-step-number">{index + 1}</span>
                  <small>{step.label}</small>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                  {index < story.steps.length - 1 ? (
                    <ArrowRight aria-hidden="true" className="simple-step-arrow" />
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
              <Button onClick={onReplay} size="lg" variant="outline">
                <Play data-icon="inline-start" /> Watch it happen
              </Button>
              <Button onClick={onOpenEvidence} size="lg">
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
