const STATUS_PREFIX = 'glassweb-recording:';

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error('Open a normal website tab first.');
  if (!/^https?:\/\//i.test(tab.url)) {
    throw new Error(
      'Chrome does not allow capture on this page. Open a normal HTTP or HTTPS website.',
    );
  }
  return tab;
}

const statusKey = (tabId) => `${STATUS_PREFIX}${tabId}`;

async function readStatus(tabId) {
  const key = statusKey(tabId);
  const stored = await chrome.storage.session.get(key);
  return stored[key] || null;
}

async function writeStatus(tabId, value) {
  await chrome.storage.session.set({ [statusKey(tabId)]: value });
}

async function clearStatus(tabId) {
  await chrome.storage.session.remove(statusKey(tabId));
}

function installPageProbe(sessionId) {
  const marker = '__GLASSWEB_PAGE_PROBE__';
  const previous = window[marker];
  if (previous?.sessionId === sessionId) return;
  if (previous?.stop) previous.stop();

  const originalFetch = window.fetch;
  // Browser prototype methods must later be restored and invoked with their live instance.
  // eslint-disable-next-line typescript/unbound-method
  const originalOpen = XMLHttpRequest.prototype.open;
  // eslint-disable-next-line typescript/unbound-method
  const originalSend = XMLHttpRequest.prototype.send;
  const xhrMetadata = new WeakMap();

  const emit = (payload) => {
    window.postMessage(
      { source: 'glassweb-page-probe', sessionId, payload },
      window.location.origin,
    );
  };

  window.fetch = async function glassWebFetch(...args) {
    const [input, init] = args;
    const requestId = crypto.randomUUID();
    const method = String(
      init?.method || (input instanceof Request ? input.method : 'GET'),
    ).toUpperCase();
    const url = String(input instanceof Request ? input.url : input);
    const startedAt = performance.now();
    emit({
      type: 'request-start',
      requestId,
      transport: 'fetch',
      method,
      url,
      startedAt,
    });
    try {
      const response = await originalFetch.apply(this, args);
      emit({
        type: 'request-end',
        requestId,
        transport: 'fetch',
        method,
        url: response.url || url,
        status: response.status,
        mime: response.headers.get('content-type') || '',
        durationMs: performance.now() - startedAt,
      });
      return response;
    } catch (error) {
      emit({
        type: 'request-end',
        requestId,
        transport: 'fetch',
        method,
        url,
        status: 0,
        mime: '',
        durationMs: performance.now() - startedAt,
        failed: true,
      });
      throw error;
    }
  };

  XMLHttpRequest.prototype.open = function glassWebOpen(...args) {
    const [method, url] = args;
    xhrMetadata.set(this, {
      requestId: crypto.randomUUID(),
      method: String(method || 'GET').toUpperCase(),
      url: String(url),
    });
    return originalOpen.apply(this, args);
  };

  XMLHttpRequest.prototype.send = function glassWebSend(...args) {
    const metadata = xhrMetadata.get(this) || {
      requestId: crypto.randomUUID(),
      method: 'GET',
      url: '',
    };
    const startedAt = performance.now();
    emit({
      type: 'request-start',
      requestId: metadata.requestId,
      transport: 'xhr',
      method: metadata.method,
      url: metadata.url,
      startedAt,
    });
    this.addEventListener(
      'loadend',
      () => {
        emit({
          type: 'request-end',
          requestId: metadata.requestId,
          transport: 'xhr',
          method: metadata.method,
          url: this.responseURL || metadata.url,
          status: this.status,
          mime: this.getResponseHeader('content-type') || '',
          durationMs: performance.now() - startedAt,
        });
      },
      { once: true },
    );
    return originalSend.apply(this, args);
  };

  const stop = () => {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
    window.removeEventListener('message', control);
    delete window[marker];
  };

  const control = (event) => {
    if (
      event.source === window &&
      event.data?.source === 'glassweb-recorder-control' &&
      event.data?.sessionId === sessionId &&
      event.data?.type === 'stop'
    ) {
      stop();
    }
  };

  window.addEventListener('message', control);
  Object.defineProperty(window, marker, {
    configurable: true,
    value: { sessionId, stop },
  });
}

async function startCapture() {
  const tab = await getActiveTab();
  const sessionId = crypto.randomUUID();

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
  await chrome.tabs.sendMessage(tab.id, {
    type: 'GLASSWEB_CONTENT_START',
    sessionId,
  });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: 'MAIN',
    func: installPageProbe,
    args: [sessionId],
  });

  const host = new URL(tab.url).hostname;
  await writeStatus(tab.id, {
    active: true,
    sessionId,
    host,
    startedAt: Date.now(),
  });
  return { ok: true, host };
}

function downloadName(trace) {
  const host = new URL(trace.page.origin).hostname
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `glassweb-${host || 'trace'}-${new Date().toISOString().slice(0, 10)}.glassweb.json`;
}

async function stopCapture(includeScreenshot) {
  const tab = await getActiveTab();
  const status = await readStatus(tab.id);
  if (!status?.active)
    throw new Error('No active GlassWeb capture was found in this tab.');

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'GLASSWEB_CONTENT_STOP',
    sessionId: status.sessionId,
  });
  if (!response?.ok || !response.trace) {
    throw new Error(
      response?.error || 'The page recorder did not return a trace.',
    );
  }

  const trace = response.trace;
  if (includeScreenshot) {
    try {
      trace.page.screenshotDataUrl = await chrome.tabs.captureVisibleTab(
        tab.windowId,
        {
          format: 'jpeg',
          quality: 72,
        },
      );
      trace.redaction.retained.push('Opt-in visible screenshot');
    } catch {
      trace.redaction.removed.push('Screenshot capture failed and was omitted');
    }
  }

  const encoded = encodeURIComponent(`${JSON.stringify(trace, null, 2)}\n`);
  await chrome.downloads.download({
    url: `data:application/json;charset=utf-8,${encoded}`,
    filename: downloadName(trace),
    saveAs: true,
  });
  await clearStatus(tab.id);
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === 'GLASSWEB_START') return startCapture();
    if (message?.type === 'GLASSWEB_STOP') {
      return stopCapture(Boolean(message.includeScreenshot));
    }
    if (message?.type === 'GLASSWEB_STATUS') {
      try {
        const tab = await getActiveTab();
        return {
          ok: true,
          active: Boolean((await readStatus(tab.id))?.active),
        };
      } catch {
        return { ok: true, active: false };
      }
    }
    return { ok: false, error: 'Unknown GlassWeb command.' };
  })()
    .then(sendResponse)
    .catch((error) =>
      sendResponse({ ok: false, error: error?.message || String(error) }),
    );
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') void clearStatus(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => void clearStatus(tabId));
