(() => {
  const RECORDER_KEY = '__glasswebRecorder';
  const MAX_ENTITIES = 700;
  const MAX_RELATIONS = 2500;
  const MAX_EVENTS = 2000;
  const MAX_EVIDENCE = 2200;
  const MAX_MESSAGE_BYTES = 12_000;
  const RECENT_WINDOW_MS = 1800;

  if (window[RECORDER_KEY]?.installed) return;

  let state = null;
  let mutationObserver = null;
  let performanceObserver = null;
  let mutationTimer = null;
  let pendingMutations = 0;
  const nodeIds = new WeakMap();

  const now = () =>
    Math.max(
      0,
      Math.round(performance.now() - (state?.startedAt || performance.now())),
    );
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const truncate = (value, length = 180) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, length);
  const safeText = (value, length = 110) =>
    truncate(value, length)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/(?:\+?\d[\s().-]*){8,}/g, '[number]')
      .replace(/\b(?:[A-Za-z0-9_-]{28,})\b/g, '[token]');

  function safeUrl(raw) {
    try {
      const url = new URL(String(raw || ''), location.href);
      url.username = '';
      url.password = '';
      url.hash = '';
      url.pathname = url.pathname
        .split('/')
        .map((segment) => {
          try {
            return encodeURIComponent(
              safeText(decodeURIComponent(segment), 90),
            );
          } catch {
            return encodeURIComponent(safeText(segment, 90));
          }
        })
        .join('/');
      const keys = [...new Set(url.searchParams.keys())];
      url.search = '';
      for (const key of keys.slice(0, 12))
        url.searchParams.set(safeText(key, 40), '••');
      return url.toString().slice(0, 420);
    } catch {
      return '[invalid URL]';
    }
  }

  function safeSelector(element) {
    if (!(element instanceof Element)) return 'document';
    const parts = [];
    let current = element;
    for (let depth = 0; current && depth < 4; depth += 1) {
      let part = current.tagName.toLowerCase();
      const stableId =
        current.id && !/\d{4,}|[A-F0-9]{12,}/i.test(current.id)
          ? current.id
          : '';
      if (stableId) {
        part += `#${CSS.escape(stableId).slice(0, 72)}`;
        parts.unshift(part);
        break;
      }
      const classes = [...current.classList]
        .filter(
          (name) =>
            /^[a-z_-][a-z0-9_-]{0,36}$/i.test(name) &&
            !/active|focus|hover|selected/i.test(name),
        )
        .slice(0, 2);
      if (classes.length)
        part += `.${classes.map((name) => CSS.escape(name)).join('.')}`;
      const parent = current.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(
          (child) => child.tagName === current.tagName,
        );
        if (siblings.length > 1)
          part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(' > ').slice(0, 260);
  }

  function elementLabel(element) {
    if (!(element instanceof Element)) return 'Page';
    const role = element.getAttribute('role');
    const aria = element.getAttribute('aria-label');
    const isValueControl = element.matches('input, textarea, select, option');
    const heading = element.closest(
      'button, a, label, [role="button"], h1, h2, h3, h4, h5, h6',
    );
    const text = isValueControl
      ? aria || element.tagName.toLowerCase()
      : aria ||
        heading?.textContent ||
        element.textContent ||
        element.tagName.toLowerCase();
    const clean = safeText(text, 72);
    const type = role || element.tagName.toLowerCase();
    return clean ? `${clean} · ${type}` : `Unnamed ${type}`;
  }

  function elementBounds(element) {
    if (!(element instanceof Element)) return undefined;
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  function pushEvidence(source, explanation, eventIds = []) {
    if (!state || state.evidence.length >= MAX_EVIDENCE) return '';
    const id = `evd-${state.evidence.length + 1}`;
    state.evidence.push({
      id,
      source,
      explanation: safeText(explanation, 240),
      eventIds: unique(eventIds),
    });
    return id;
  }

  function addEntity(entity) {
    if (!state) return '';
    const existing = state.entityByKey.get(entity.key);
    if (existing) {
      existing.lastSeen = now();
      if (entity.evidenceId)
        existing.evidenceIds = unique([
          ...existing.evidenceIds,
          entity.evidenceId,
        ]);
      return existing.id;
    }
    if (!entity.evidenceId || state.entities.length >= MAX_ENTITIES) return '';
    const id = `${entity.layer.slice(0, 3)}-${state.entities.length + 1}`;
    const record = {
      id,
      kind: entity.kind,
      layer: entity.layer,
      humanLabel: safeText(entity.humanLabel, 96),
      technicalLabel: safeText(entity.technicalLabel, 280),
      description: safeText(entity.description, 220),
      certainty: entity.certainty || 'observed',
      firstSeen: now(),
      lastSeen: now(),
      evidenceIds: entity.evidenceId ? [entity.evidenceId] : [],
      ...(entity.bounds ? { bounds: entity.bounds } : {}),
      ...(entity.attributes ? { attributes: entity.attributes } : {}),
    };
    state.entities.push(record);
    state.entityByKey.set(entity.key, record);
    return id;
  }

  function addRelation(from, to, kind, certainty, explanation, evidenceId) {
    if (!state || !from || !to || !evidenceId) return '';
    const key = `${from}|${to}|${kind}`;
    const existing = state.relationByKey.get(key);
    if (existing) {
      if (evidenceId)
        existing.evidenceIds = unique([...existing.evidenceIds, evidenceId]);
      return existing.id;
    }
    if (state.relations.length >= MAX_RELATIONS) return '';
    const relation = {
      id: `rel-${state.relations.length + 1}`,
      from,
      to,
      kind,
      certainty,
      evidenceIds: evidenceId ? [evidenceId] : [],
      explanation: safeText(explanation, 240),
    };
    state.relations.push(relation);
    state.relationByKey.set(key, relation);
    return relation.id;
  }

  function addEvent(
    kind,
    label,
    layer,
    entityIds,
    certainty = 'observed',
    detail = '',
  ) {
    if (!state || state.events.length >= MAX_EVENTS) return '';
    const event = {
      id: `evt-${state.events.length + 1}`,
      timestamp: now(),
      kind,
      label: safeText(label, 110),
      layer,
      entityIds: unique(entityIds),
      certainty,
      ...(detail ? { detail: safeText(detail, 240) } : {}),
    };
    state.events.push(event);
    return event.id;
  }

  function getElementChain(element, interactionKind, eventId) {
    if (!(element instanceof Element) || !state) return null;
    const target =
      element.closest(
        'button, a, input, select, textarea, form, [role="button"], [data-testid]',
      ) || element;
    const selector = safeSelector(target);
    let stableNodeId = nodeIds.get(target);
    if (!stableNodeId) {
      stableNodeId = `node-${state.nodeSequence++}`;
      nodeIds.set(target, stableNodeId);
    }
    const domEvidence = pushEvidence(
      'dom',
      `The recorder observed ${selector} in the live document.`,
      [eventId],
    );
    const visualId = addEntity({
      key: `visual:${stableNodeId}`,
      kind: 'visual-element',
      layer: 'visible',
      humanLabel: elementLabel(target),
      technicalLabel: selector,
      description: 'A visible part of the page that received an interaction.',
      evidenceId: domEvidence,
      bounds: elementBounds(target),
    });
    const structureId = addEntity({
      key: `structure:${stableNodeId}`,
      kind: 'dom-node',
      layer: 'structure',
      humanLabel: `Document node for ${elementLabel(target)}`,
      technicalLabel: `<${target.tagName.toLowerCase()}> ${selector}`,
      description: 'The browser document node behind the visible element.',
      evidenceId: domEvidence,
    });
    const behaviourId = addEntity({
      key: `behaviour:${interactionKind}:${selector}`,
      kind: 'interaction',
      layer: 'behaviour',
      humanLabel: `${interactionKind === 'submit' ? 'Submits' : interactionKind === 'input' ? 'Changes' : 'Activates'} ${elementLabel(target)}`,
      technicalLabel: `${interactionKind} event · ${selector}`,
      description:
        'Browser-observed interaction handling. The specific application function is not claimed.',
      evidenceId: domEvidence,
    });
    const renderRelation = addRelation(
      visualId,
      structureId,
      'renders',
      'observed',
      'The visible bounds and document target were recorded from the same element.',
      domEvidence,
    );
    const listenRelation = addRelation(
      structureId,
      behaviourId,
      'listens-to',
      'observed',
      `A ${interactionKind} event was observed on this document path.`,
      domEvidence,
    );
    return {
      target,
      selector,
      visualId,
      structureId,
      behaviourId,
      relationIds: [renderRelation, listenRelation],
    };
  }

  function handleInteraction(event) {
    if (!state || !event.isTrusted) return;
    const kind = event.type === 'change' ? 'input' : event.type;
    const label =
      kind === 'submit'
        ? 'Form submitted'
        : kind === 'input'
          ? 'Control changed'
          : 'Element clicked';
    const eventId = addEvent(
      kind,
      label,
      'visible',
      [],
      'observed',
      'Field values and form contents were discarded.',
    );
    const chain = getElementChain(event.target, kind, eventId);
    if (!chain?.visualId || !chain.structureId || !chain.behaviourId) return;
    const recorded = state.events.find((item) => item.id === eventId);
    if (recorded)
      recorded.entityIds = unique([
        chain.visualId,
        chain.structureId,
        chain.behaviourId,
      ]);
    state.recentInteraction = {
      timestamp: performance.now(),
      eventId,
      label: elementLabel(chain.target),
      ...chain,
    };
    state.focusSeeds.push({
      timestamp: now(),
      question:
        kind === 'click'
          ? `What happens when I click ${elementLabel(chain.target)}?`
          : `What changes when I use ${elementLabel(chain.target)}?`,
      label: elementLabel(chain.target),
      surfaceEntityId: chain.visualId,
      entityIds: [chain.visualId, chain.structureId, chain.behaviourId],
      relationIds: chain.relationIds,
    });
  }

  function flushMutations() {
    mutationTimer = null;
    if (!state || pendingMutations === 0) return;
    const count = pendingMutations;
    pendingMutations = 0;
    const recent = state.recentInteraction;
    const correlated =
      recent && performance.now() - recent.timestamp <= RECENT_WINDOW_MS;
    const eventId = addEvent(
      'mutation',
      `${count} document change${count === 1 ? '' : 's'}`,
      'structure',
      correlated
        ? [recent.structureId, recent.behaviourId]
        : [state.pageStructureId],
      correlated ? 'correlated' : 'observed',
      correlated
        ? `Changes occurred shortly after ${recent.label}. Timing alone does not prove the handler caused them.`
        : 'The recorder observed the document changing.',
    );
    const evidenceId = pushEvidence(
      'dom',
      correlated
        ? `${count} DOM change(s) arrived within ${RECENT_WINDOW_MS}ms of the selected interaction.`
        : `${count} DOM change(s) were observed without a recent user interaction.`,
      [eventId],
    );
    if (correlated) {
      const relationId = addRelation(
        recent.behaviourId,
        recent.structureId,
        'mutates',
        'correlated',
        'A document change followed the interaction within the correlation window.',
        evidenceId,
      );
      const seed = state.focusSeeds[state.focusSeeds.length - 1];
      if (seed?.surfaceEntityId === recent.visualId)
        seed.relationIds.push(relationId);
    }
  }

  function handleMutations(records) {
    if (!state) return;
    pendingMutations += Math.min(records.length, 80);
    if (!mutationTimer) mutationTimer = setTimeout(flushMutations, 90);
  }

  function serviceForUrl(urlValue, source, eventId) {
    let url;
    try {
      url = new URL(urlValue, location.href);
    } catch {
      return { serviceId: '', host: 'unknown service' };
    }
    const host = url.hostname || location.hostname;
    const sameOrigin = url.origin === location.origin;
    const evidenceId = pushEvidence(
      source,
      `The browser resolved the request to ${host}.`,
      [eventId],
    );
    const serviceId = addEntity({
      key: `service:${url.origin}`,
      kind: 'service',
      layer: 'service',
      humanLabel: sameOrigin
        ? `${host} application service`
        : `${host} external service`,
      technicalLabel: url.origin,
      description: sameOrigin
        ? 'A service on the same origin as the page.'
        : 'A different origin that the page contacted.',
      evidenceId,
      attributes: { sameOrigin },
    });
    return { serviceId, host, evidenceId };
  }

  function recordRequest(payload, source = 'instrumentation') {
    if (!state || payload?.type !== 'request-end') return;
    const url = safeUrl(payload.url);
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return;
    }
    const method = safeText(payload.method || 'GET', 12).toUpperCase();
    const requestEventId = addEvent(
      'request',
      `${method} ${safeText(parsedUrl.pathname || '/', 70)}`,
      'network',
      [],
      'observed',
      `${Number(payload.durationMs || 0).toFixed(0)}ms · ${payload.transport || 'resource'}`,
    );
    const requestEvidence = pushEvidence(
      source,
      `${payload.transport || 'browser'} observed ${method} ${url}.`,
      [requestEventId],
    );
    const requestId = addEntity({
      key: `request:${payload.requestId || `${method}:${url}:${requestEventId}`}`,
      kind: 'request',
      layer: 'network',
      humanLabel: `Loads ${safeText(parsedUrl.pathname.split('/').filter(Boolean).pop() || 'page data', 64)}`,
      technicalLabel: `${method} ${url}`,
      description:
        'A request observed by browser instrumentation. Bodies, headers and query values were not retained.',
      evidenceId: requestEvidence,
      attributes: {
        method,
        status: Number(payload.status || 0),
        durationMs: Math.round(Number(payload.durationMs || 0)),
        transport: safeText(payload.transport || 'resource', 24),
      },
    });
    const responseEventId = addEvent(
      'response',
      payload.failed
        ? 'Request failed'
        : `${Number(payload.status || 0) || 'Loaded'} response`,
      'network',
      [requestId],
      'observed',
      safeText(payload.mime || 'Response type unavailable', 90),
    );
    const service = serviceForUrl(url, source, responseEventId);
    const providedRelation = addRelation(
      requestId,
      service.serviceId,
      'provided-by',
      'observed',
      `The request URL belongs to ${service.host}.`,
      service.evidenceId,
    );
    const recent = state.recentInteraction;
    const correlated =
      recent && performance.now() - recent.timestamp <= RECENT_WINDOW_MS;
    let initiateRelation = '';
    if (correlated) {
      initiateRelation = addRelation(
        recent.behaviourId,
        requestId,
        'initiates',
        'correlated',
        `The request began within ${RECENT_WINDOW_MS}ms of the interaction. The browser did not expose an exact application call stack.`,
        requestEvidence,
      );
    } else {
      initiateRelation = addRelation(
        state.pageBehaviourId,
        requestId,
        'initiates',
        'unknown',
        'The request was observed, but no reliable initiating interaction was visible.',
        requestEvidence,
      );
    }
    const requestEvent = state.events.find(
      (item) => item.id === requestEventId,
    );
    if (requestEvent)
      requestEvent.entityIds = unique([requestId, service.serviceId]);
    if (correlated) {
      const seed = state.focusSeeds[state.focusSeeds.length - 1];
      if (seed?.surfaceEntityId === recent.visualId) {
        seed.entityIds.push(requestId, service.serviceId);
        seed.relationIds.push(initiateRelation, providedRelation);
      }
    }
  }

  function handlePageMessage(event) {
    if (!state || event.source !== window || event.origin !== location.origin)
      return;
    const message = event.data;
    if (
      message?.source !== 'glassweb-page-probe' ||
      message.sessionId !== state.sessionId
    )
      return;
    try {
      if (JSON.stringify(message).length > MAX_MESSAGE_BYTES) return;
    } catch {
      return;
    }
    const payload = message.payload;
    if (!payload || typeof payload !== 'object') return;
    if (payload.type === 'request-start') {
      state.requestStarts.set(String(payload.requestId || ''), {
        at: performance.now(),
      });
      return;
    }
    if (payload.type === 'request-end') recordRequest(payload);
  }

  function handleResources(entries) {
    if (!state) return;
    for (const entry of entries.getEntries().slice(0, 30)) {
      if (
        !['script', 'css', 'img', 'link', 'navigation'].includes(
          entry.initiatorType,
        )
      )
        continue;
      recordRequest(
        {
          type: 'request-end',
          requestId: `resource:${entry.name}:${Math.round(entry.startTime)}`,
          transport: entry.initiatorType,
          method: 'GET',
          url: entry.name,
          status: 0,
          mime: '',
          durationMs: entry.duration,
        },
        'performance',
      );
    }
  }

  function begin(sessionId) {
    stop(false);
    const startedAt = performance.now();
    state = {
      sessionId,
      startedAt,
      startedAtIso: new Date().toISOString(),
      entities: [],
      relations: [],
      events: [],
      evidence: [],
      entityByKey: new Map(),
      relationByKey: new Map(),
      requestStarts: new Map(),
      focusSeeds: [],
      recentInteraction: null,
      nodeSequence: 1,
    };
    const eventId = addEvent(
      'navigation',
      'Page capture started',
      'visible',
      [],
      'observed',
      'GlassWeb records browser-visible evidence only.',
    );
    const evidenceId = pushEvidence(
      'dom',
      'The recorder read the active document, URL and viewport at capture start.',
      [eventId],
    );
    state.pageVisualId = addEntity({
      key: 'page:visible',
      kind: 'visual-element',
      layer: 'visible',
      humanLabel: safeText(document.title || location.hostname, 96),
      technicalLabel: safeUrl(location.href),
      description: 'The page as it appeared when capture began.',
      evidenceId,
      bounds: { x: 0, y: 0, width: innerWidth, height: innerHeight },
    });
    state.pageStructureId = addEntity({
      key: 'page:structure',
      kind: 'dom-node',
      layer: 'structure',
      humanLabel: 'Live document structure',
      technicalLabel: 'document.documentElement',
      description: 'The browser document behind the visible page.',
      evidenceId,
    });
    state.pageBehaviourId = addEntity({
      key: 'page:behaviour',
      kind: 'script',
      layer: 'behaviour',
      humanLabel: 'Page behaviour',
      technicalLabel: 'browser event loop · application scripts unknown',
      description:
        'The behaviour layer visible to the recorder. Exact application functions require source maps or deeper instrumentation.',
      evidenceId,
      certainty: 'unknown',
    });
    const pageRender = addRelation(
      state.pageVisualId,
      state.pageStructureId,
      'renders',
      'observed',
      'The browser rendered this document as the captured page.',
      evidenceId,
    );
    const pageBehaviour = addRelation(
      state.pageStructureId,
      state.pageBehaviourId,
      'listens-to',
      'unknown',
      'The page runs application behaviour, but individual handlers are not visible until an interaction is observed.',
      evidenceId,
    );
    const navigation = state.events.find((item) => item.id === eventId);
    if (navigation)
      navigation.entityIds = [
        state.pageVisualId,
        state.pageStructureId,
        state.pageBehaviourId,
      ];
    state.focusSeeds.push({
      timestamp: 0,
      question: 'What makes this page work?',
      label: document.title || location.hostname,
      surfaceEntityId: state.pageVisualId,
      entityIds: [
        state.pageVisualId,
        state.pageStructureId,
        state.pageBehaviourId,
      ],
      relationIds: [pageRender, pageBehaviour],
    });

    document.addEventListener('click', handleInteraction, true);
    document.addEventListener('change', handleInteraction, true);
    document.addEventListener('submit', handleInteraction, true);
    window.addEventListener('message', handlePageMessage);
    window.addEventListener('pagehide', handlePageExit, { once: true });
    mutationObserver = new MutationObserver(handleMutations);
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    try {
      performanceObserver = new PerformanceObserver(handleResources);
      performanceObserver.observe({ type: 'resource', buffered: true });
    } catch {
      performanceObserver = null;
    }
  }

  function makeFocuses() {
    if (!state) return [];
    return state.focusSeeds.slice(-20).map((seed, index) => {
      const entityIds = unique(seed.entityIds).filter((id) =>
        state.entities.some((entity) => entity.id === id),
      );
      const relationIds = unique(seed.relationIds).filter((id) =>
        state.relations.some((relation) => relation.id === id),
      );
      const hasNetwork = entityIds.some(
        (id) =>
          state.entities.find((entity) => entity.id === id)?.layer ===
          'network',
      );
      return {
        id: `focus-${index + 1}`,
        label: safeText(seed.label, 72),
        question: safeText(seed.question, 130),
        summary: hasNetwork
          ? 'A browser request happened shortly after this action. GlassWeb treats the timing as a clue, not proof.'
          : 'GlassWeb recorded this action, but no outgoing request could be matched to it.',
        detail: hasNetwork
          ? 'The destination and request are directly recorded. The link back to the click is based on timing unless deeper browser evidence is available.'
          : 'This recording shows what happened on the page. It does not claim a hidden connection that the browser did not expose.',
        entityIds,
        relationIds,
        surfaceEntityId: seed.surfaceEntityId,
        suggestedLens: hasNetwork ? 'trace' : 'runtime',
        finding: hasNetwork
          ? 'A browser request followed this interaction.'
          : 'No network effect was observed in the correlation window.',
      };
    });
  }

  function stop(compile = true) {
    if (!state) return null;
    document.removeEventListener('click', handleInteraction, true);
    document.removeEventListener('change', handleInteraction, true);
    document.removeEventListener('submit', handleInteraction, true);
    window.removeEventListener('message', handlePageMessage);
    window.removeEventListener('pagehide', handlePageExit);
    mutationObserver?.disconnect();
    performanceObserver?.disconnect();
    mutationObserver = null;
    performanceObserver = null;
    if (mutationTimer) {
      clearTimeout(mutationTimer);
      flushMutations();
    }
    window.postMessage(
      {
        source: 'glassweb-recorder-control',
        sessionId: state.sessionId,
        type: 'stop',
      },
      location.origin,
    );
    if (!compile) {
      state = null;
      return null;
    }
    const finished = state;
    const durationMs = Math.max(1, now());
    const trace = {
      schemaVersion: 1,
      id: `trace-${crypto.randomUUID()}`,
      title: `${safeText(document.title || location.hostname, 90)} · GlassWeb capture`,
      createdAt: finished.startedAtIso,
      durationMs,
      page: {
        origin: location.origin,
        url: safeUrl(location.href),
        title: safeText(document.title || location.hostname, 120),
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      },
      entities: finished.entities,
      relations: finished.relations,
      events: finished.events,
      evidence: finished.evidence,
      focuses: makeFocuses(),
      redaction: {
        policyVersion: 'glassweb-safe-metadata-v1',
        appliedAt: new Date().toISOString(),
        removed: [
          'Form and input values',
          'Request and response bodies',
          'Cookie and authorization values',
          'URL query values and fragments',
          'Long tokens, email addresses and phone-like numbers in labels',
        ],
        retained: [
          'Document structure and visible bounds',
          'Interaction types without field values',
          'Request method, redacted URL, status, duration and MIME type',
          'Evidence certainty and timing',
        ],
      },
    };
    state = null;
    return trace;
  }

  function handlePageExit() {
    if (!state) return;
    const sessionId = state.sessionId;
    try {
      const trace = stop(true);
      if (trace) {
        void chrome.runtime.sendMessage({
          type: 'GLASSWEB_PARTIAL',
          sessionId,
          trace,
        });
      }
    } catch {
      // The background also preserves an interrupted status if teardown wins the race.
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (
      message?.type === 'GLASSWEB_CONTENT_START' &&
      typeof message.sessionId === 'string'
    ) {
      begin(message.sessionId);
      sendResponse({ ok: true });
      return;
    }
    if (
      message?.type === 'GLASSWEB_CONTENT_STOP' &&
      message.sessionId === state?.sessionId
    ) {
      try {
        sendResponse({ ok: true, trace: stop(true) });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    }
  });

  window[RECORDER_KEY] = { installed: true };
})();
