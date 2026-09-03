const startButton = document.querySelector('#start');
const stopButton = document.querySelector('#stop');
const screenshot = document.querySelector('#screenshot');
const statusDot = document.querySelector('#status-dot');
const statusTitle = document.querySelector('#status-title');
const statusCopy = document.querySelector('#status-copy');
const error = document.querySelector('#error');

function setStatus(state, message) {
  const active = Boolean(state?.active);
  const recoverable = Boolean(state?.recoverable);
  const interrupted = Boolean(state?.interrupted);
  statusDot.classList.toggle('active', active);
  statusDot.classList.toggle('recoverable', recoverable);
  statusTitle.textContent = active
    ? 'Watching this page'
    : recoverable
      ? 'Page changed — recording recovered'
      : interrupted
        ? 'Page changed — recording ended'
        : 'Ready to watch';
  statusCopy.textContent =
    message ||
    (active
      ? 'Do one thing, then return here and save.'
      : recoverable
        ? 'Save what GlassWeb captured before the page changed.'
        : interrupted
          ? 'GlassWeb could not recover this partial recording. Start again on the new page.'
          : 'One page. One action. Browser-visible evidence only.');
  startButton.disabled = active;
  stopButton.disabled = !active && !recoverable;
}

async function send(message) {
  error.textContent = '';
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok)
    throw new Error(
      response?.error || 'The recorder could not complete that action.',
    );
  return response;
}

startButton.addEventListener('click', async () => {
  try {
    const response = await send({ type: 'GLASSWEB_START' });
    setStatus(
      { active: true },
      `Recording ${response.host}. Values are discarded before storage.`,
    );
  } catch (failure) {
    error.textContent =
      failure instanceof Error ? failure.message : String(failure);
  }
});

stopButton.addEventListener('click', async () => {
  try {
    stopButton.disabled = true;
    statusCopy.textContent = 'Compiling and redacting the portable trace…';
    await send({
      type: 'GLASSWEB_STOP',
      includeScreenshot: screenshot.checked,
    });
    setStatus(
      {},
      'Recording saved. Return to GlassWeb and choose Open a recording.',
    );
  } catch (failure) {
    stopButton.disabled = false;
    error.textContent =
      failure instanceof Error ? failure.message : String(failure);
  }
});

chrome.runtime.sendMessage({ type: 'GLASSWEB_STATUS' }).then((response) => {
  setStatus(
    response,
    response?.active ? 'Do one thing, then return here and save.' : undefined,
  );
});
