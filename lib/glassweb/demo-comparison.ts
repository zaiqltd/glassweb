import { createGlassWebCheck } from './compare';
import { demoTrace } from './demo-trace';
import type { GlassWebTrace } from './types';

function cloneTrace(trace: GlassWebTrace): GlassWebTrace {
  return JSON.parse(JSON.stringify(trace)) as GlassWebTrace;
}

function checkoutFocus(trace: GlassWebTrace) {
  return (
    trace.focuses.find((focus) => focus.id === 'checkout') ?? trace.focuses[0]
  );
}

export const demoBrokenTrace: GlassWebTrace = (() => {
  const trace = cloneTrace(demoTrace);
  trace.id = 'demo-orbit-pricing-broken';
  trace.title = 'Orbit checkout · after deploy';
  trace.createdAt = '2026-09-03T09:42:00.000Z';
  const request = trace.entities.find(
    (entity) => entity.id === 'network-checkout',
  );
  if (request) {
    request.description =
      'The checkout request returned an error before a session was created.';
    request.attributes = {
      ...request.attributes,
      status: 500,
      durationMs: 231,
    };
  }
  const focus = checkoutFocus(trace);
  focus.summary =
    'Start Pro still sends the checkout request, but it now returns 500.';
  focus.detail =
    'The click and browser action still match the before recording. The first recorded difference is the checkout request: it returned 201 before and 500 after. No successful Stripe session appears in this path.';
  focus.entityIds = focus.entityIds.filter((id) => id !== 'service-stripe');
  focus.relationIds = focus.relationIds.filter((id) => id !== 'cta-service');
  const responseEvent = trace.events.find(
    (event) => event.id === 'event-checkout-response',
  );
  if (responseEvent) {
    responseEvent.label = 'Checkout request failed';
    responseEvent.layer = 'network';
    responseEvent.entityIds = ['network-checkout'];
    responseEvent.detail = '500 response';
  }
  return trace;
})();

export const demoRepairedTrace: GlassWebTrace = (() => {
  const trace = cloneTrace(demoTrace);
  trace.id = 'demo-orbit-pricing-repaired';
  trace.title = 'Orbit checkout · after repair';
  trace.createdAt = '2026-09-03T10:08:00.000Z';
  const focus = checkoutFocus(trace);
  focus.summary = 'The checkout path matches the before recording again.';
  focus.detail =
    'The click, checkout request, 201 response, and Stripe destination all match the before recording. This proves the browser-visible path matches; it does not prove every server-side detail is identical.';
  return trace;
})();

export const demoCheckoutCheck = createGlassWebCheck(
  demoTrace,
  checkoutFocus(demoTrace),
);
