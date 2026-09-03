'use client';

import {
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  Code2,
  LockKeyhole,
  MousePointer2,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

type DemoState = 'ready' | 'watching' | 'answer';

export function WelcomeView({ onStart }: { onStart: () => void }) {
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [revealedSteps, setRevealedSteps] = useState(0);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (demoState !== 'watching') return;
    const timers = [
      window.setTimeout(() => setRevealedSteps(1), 180),
      window.setTimeout(() => setRevealedSteps(2), 620),
      window.setTimeout(() => setRevealedSteps(3), 1_060),
      window.setTimeout(() => setDemoState('answer'), 1_460),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [demoState]);

  useEffect(() => {
    if (demoState === 'answer')
      answerRef.current?.focus({ preventScroll: true });
  }, [demoState]);

  const runDemo = () => {
    setRevealedSteps(0);
    setDemoState('watching');
  };

  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="welcome-brand" aria-label="GlassWeb">
          <span className="welcome-mark" aria-hidden="true">
            <span />
          </span>
          <strong>GlassWeb</strong>
        </div>
        <span className="welcome-private">
          <LockKeyhole aria-hidden="true" /> No sign-in. Runs on your device.
        </span>
      </header>

      <main className="welcome-main">
        <section className="welcome-copy">
          <p className="welcome-eyebrow">
            <Sparkles aria-hidden="true" /> For websites built with AI
          </p>
          <h1>See what your website did after you clicked.</h1>
          <p className="welcome-lede">
            GlassWeb turns a confusing website action into a simple answer you
            can paste straight into Cursor, Claude, or Codex.
          </p>
          <div className="welcome-how">
            <span>Try it now</span>
            <p>
              Click <strong>Start Pro</strong> in the demo. GlassWeb will
              explain what went wrong.
            </p>
          </div>
        </section>

        <section
          aria-label="Interactive GlassWeb example"
          className={`welcome-demo is-${demoState}`}
        >
          <header className="welcome-demo-bar">
            <div aria-hidden="true" className="welcome-window-dots">
              <i />
              <i />
              <i />
            </div>
            <span>your-site.com/pricing</span>
            <small>Safe demo</small>
          </header>

          <div className="welcome-demo-stage">
            <div
              className="welcome-demo-site"
              aria-hidden={demoState !== 'ready'}
            >
              <div className="welcome-demo-nav">
                <strong>YourSite</strong>
                <span>Product</span>
                <span>Pricing</span>
                <span>Account</span>
              </div>
              <div className="welcome-demo-plan">
                <p>PRO</p>
                <h2>Build without limits.</h2>
                <span>Everything you need to ship.</span>
                <button
                  disabled={demoState !== 'ready'}
                  onClick={runDemo}
                  type="button"
                >
                  Start Pro <ArrowRight aria-hidden="true" />
                </button>
                {demoState === 'ready' ? (
                  <div className="welcome-click-hint">
                    <MousePointer2 aria-hidden="true" /> Click this
                  </div>
                ) : null}
              </div>
            </div>

            {demoState !== 'ready' ? (
              <div className="welcome-explanation" aria-live="polite">
                <div className="welcome-explanation-heading">
                  <span className="welcome-scan-icon" aria-hidden="true">
                    <span />
                  </span>
                  <div>
                    <small>GlassWeb is following the click</small>
                    <strong>
                      {demoState === 'answer'
                        ? 'Here’s the plain answer.'
                        : 'Watching what happens next…'}
                    </strong>
                  </div>
                </div>

                <ol className="welcome-path">
                  <li className={revealedSteps >= 1 ? 'is-shown' : ''}>
                    <span>
                      <MousePointer2 aria-hidden="true" />
                    </span>
                    <div>
                      <small>You did</small>
                      <strong>Clicked Start Pro</strong>
                    </div>
                    {revealedSteps >= 1 ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Circle aria-hidden="true" />
                    )}
                  </li>
                  <li className={revealedSteps >= 2 ? 'is-shown' : ''}>
                    <span>
                      <ChevronRight aria-hidden="true" />
                    </span>
                    <div>
                      <small>The website did</small>
                      <strong>Tried to start checkout</strong>
                    </div>
                    {revealedSteps >= 2 ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Circle aria-hidden="true" />
                    )}
                  </li>
                  <li
                    className={revealedSteps >= 3 ? 'is-shown is-failed' : ''}
                  >
                    <span>
                      <Code2 aria-hidden="true" />
                    </span>
                    <div>
                      <small>What came back</small>
                      <strong>Checkout returned an error</strong>
                    </div>
                    {revealedSteps >= 3 ? (
                      <X aria-hidden="true" />
                    ) : (
                      <Circle aria-hidden="true" />
                    )}
                  </li>
                </ol>

                {demoState === 'answer' ? (
                  <div className="welcome-answer" ref={answerRef} tabIndex={-1}>
                    <small>Plain answer</small>
                    <h2>
                      Your button works. The problem appears when checkout
                      starts.
                    </h2>
                    <p>
                      GlassWeb shows where the problem appeared. It does not
                      pretend to know which line of code caused it.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <div className="welcome-action-row">
          {demoState === 'answer' ? (
            <Button onClick={onStart} size="lg">
              Try it on my website <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <p>
              One click in. One plain answer out.
              <span>No account or upload.</span>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
