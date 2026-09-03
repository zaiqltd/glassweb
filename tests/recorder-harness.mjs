import vm from 'node:vm';

class FakeElement {
  constructor(label = 'Start Pro') {
    this.tagName = 'BUTTON';
    this.id = 'start-pro';
    this.classList = [];
    this.parentElement = null;
    this.children = [];
    this.textContent = label;
  }

  closest() {
    return this;
  }

  getAttribute(name) {
    return name === 'aria-label' ? this.textContent : null;
  }

  getBoundingClientRect() {
    return { x: 24, y: 32, width: 140, height: 44 };
  }

  matches() {
    return false;
  }
}

export function createContentHarness(source) {
  let clock = 0;
  let timerId = 0;
  const timers = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  let runtimeListener;

  const setTimer = (callback, delay = 0) => {
    const id = ++timerId;
    timers.set(id, { callback, due: clock + Number(delay) });
    return id;
  };
  const clearTimer = (id) => timers.delete(id);
  const addListener = (map, type, listener) => {
    map.set(type, [...(map.get(type) ?? []), listener]);
  };
  const removeListener = (map, type, listener) => {
    map.set(
      type,
      (map.get(type) ?? []).filter((candidate) => candidate !== listener),
    );
  };

  const documentElement = new FakeElement('Document');
  const document = {
    title: 'Harness page',
    documentElement,
    addEventListener(type, listener) {
      addListener(documentListeners, type, listener);
    },
    removeEventListener(type, listener) {
      removeListener(documentListeners, type, listener);
    },
  };
  const location = {
    href: 'https://harness.example/page',
    hostname: 'harness.example',
    origin: 'https://harness.example',
  };
  const window = {
    addEventListener(type, listener) {
      addListener(windowListeners, type, listener);
    },
    removeEventListener(type, listener) {
      removeListener(windowListeners, type, listener);
    },
    postMessage() {},
    setTimeout: setTimer,
  };
  const context = {
    CSS: { escape: (value) => String(value) },
    Date,
    Element: FakeElement,
    Map,
    Math,
    MutationObserver: class {
      disconnect() {}
      observe() {}
    },
    Number,
    PerformanceObserver: class {
      disconnect() {}
      observe() {}
    },
    Set,
    String,
    URL,
    WeakMap,
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) {
            runtimeListener = listener;
          },
        },
        sendMessage: async () => undefined,
      },
    },
    clearTimeout: clearTimer,
    crypto: { randomUUID: () => `uuid-${Math.random()}` },
    devicePixelRatio: 1,
    document,
    innerHeight: 720,
    innerWidth: 1280,
    location,
    performance: { now: () => clock },
    setTimeout: setTimer,
    window,
  };
  window.window = window;
  window.document = document;
  window.location = location;

  vm.runInNewContext(source, context, { filename: 'extension/content.js' });

  const runDueTimers = () => {
    let ran = true;
    while (ran) {
      ran = false;
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.due <= clock)
        .sort((left, right) => left[1].due - right[1].due)[0];
      if (due) {
        timers.delete(due[0]);
        due[1].callback();
        ran = true;
      }
    }
  };

  return {
    advance(milliseconds) {
      const target = clock + milliseconds;
      while (true) {
        const next = [...timers.values()]
          .map((timer) => timer.due)
          .filter((due) => due <= target)
          .sort((left, right) => left - right)[0];
        if (next === undefined) break;
        clock = next;
        runDueTimers();
      }
      clock = target;
      runDueTimers();
    },
    click(element = new FakeElement()) {
      for (const listener of documentListeners.get('click') ?? []) {
        listener({ isTrusted: true, target: element, type: 'click' });
      }
    },
    endRequest(payload) {
      this.pageMessage({ type: 'request-end', ...payload });
    },
    pageMessage(payload) {
      for (const listener of windowListeners.get('message') ?? []) {
        listener({
          data: {
            payload,
            sessionId: 'session-1',
            source: 'glassweb-page-probe',
          },
          origin: location.origin,
          source: window,
        });
      }
    },
    start() {
      let response;
      runtimeListener(
        { sessionId: 'session-1', type: 'GLASSWEB_CONTENT_START' },
        null,
        (value) => {
          response = value;
        },
      );
      return response;
    },
    startRequest(payload) {
      this.pageMessage({ type: 'request-start', ...payload });
    },
    stop() {
      let response;
      const async = runtimeListener(
        { sessionId: 'session-1', type: 'GLASSWEB_CONTENT_STOP' },
        null,
        (value) => {
          response = value;
        },
      );
      return { async, response: () => response };
    },
  };
}

export function createPageProbeHarness(backgroundSource) {
  const backgroundContext = {
    URL,
    chrome: {
      downloads: { download: async () => undefined },
      runtime: { onMessage: { addListener() {} } },
      scripting: { executeScript: async () => undefined },
      storage: {
        session: {
          get: async () => ({}),
          remove: async () => undefined,
          set: async () => undefined,
        },
      },
      tabs: {
        captureVisibleTab: async () => '',
        onRemoved: { addListener() {} },
        onUpdated: { addListener() {} },
        query: async () => [],
        sendMessage: async () => ({}),
      },
    },
    encodeURIComponent,
  };
  vm.runInNewContext(backgroundSource, backgroundContext, {
    filename: 'extension/background.js',
  });
  const installPageProbe = backgroundContext.installPageProbe;
  if (typeof installPageProbe !== 'function') {
    throw new Error('The page probe was not defined.');
  }

  let uuid = 0;
  let clock = 0;
  const posted = [];
  const windowListeners = new Map();
  class FakeRequest {
    constructor(url, method = 'GET') {
      this.url = url;
      this.method = method;
    }
  }
  class FakeXHR {
    constructor(mode = 'load', status = 0) {
      this.mode = mode;
      this.status = status;
      this.responseURL = 'https://api.example/xhr';
      this.listeners = new Map();
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    dispatch(type) {
      this.listeners.get(type)?.();
    }

    getResponseHeader() {
      return '';
    }

    open() {}

    send() {
      if (this.mode === 'throw') throw new Error('send failed');
      this.dispatch(this.mode);
    }
  }
  const originalFetch = async (input) => {
    if (String(input).includes('reject')) throw new Error('fetch failed');
    return {
      headers: { get: () => '' },
      status: 0,
      url: '',
    };
  };
  const window = {
    fetch: originalFetch,
    location: { origin: 'https://harness.example' },
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    removeEventListener(type) {
      windowListeners.delete(type);
    },
    postMessage(message) {
      posted.push(message.payload);
    },
  };
  const pageContext = {
    Error,
    Map,
    Request: FakeRequest,
    String,
    WeakMap,
    XMLHttpRequest: FakeXHR,
    crypto: { randomUUID: () => `request-${++uuid}` },
    performance: { now: () => ++clock },
    window,
  };
  vm.runInNewContext(
    `(${installPageProbe.toString()})('session-1')`,
    pageContext,
    { filename: 'install-page-probe.js' },
  );

  return {
    async fetch(url) {
      try {
        await window.fetch(url);
      } catch {
        // The emitted terminal payload is what the harness inspects.
      }
      return posted.filter((payload) => payload.type === 'request-end').at(-1);
    },
    xhr(mode, status = 0) {
      const request = new FakeXHR(mode, status);
      request.open('GET', 'https://api.example/xhr');
      try {
        request.send();
      } catch {
        // Synchronous send failures are expected in the throw case.
      }
      return posted.filter((payload) => payload.type === 'request-end').at(-1);
    },
  };
}
