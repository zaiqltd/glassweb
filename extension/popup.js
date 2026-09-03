const startButton = document.querySelector('#start');
const stopButton = document.querySelector('#stop');
const screenshot = document.querySelector('#screenshot');
const statusDot = document.querySelector('#status-dot');
const statusTitle = document.querySelector('#status-title');
const statusCopy = document.querySelector('#status-copy');
const error = document.querySelector('#error');

function setStatus(active, message) {
  statusDot.classList.toggle('active', active);
  statusTitle.textContent = active ? 'Capturing this tab' : 'Ready to capture';
  statusCopy.textContent =
    message ||
    (active
      ? 'Use the page normally, then return here to export.'
      : 'One tab. One journey. Browser-visible evidence only.');
  startButton.disabled = active;
  stopButton.disabled = !active;
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
      true,
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
    setStatus(false, 'Trace exported. Drop it into the GlassWeb viewer.');
  } catch (failure) {
    stopButton.disabled = false;
    error.textContent =
      failure instanceof Error ? failure.message : String(failure);
  }
});

chrome.runtime.sendMessage({ type: 'GLASSWEB_STATUS' }).then((response) => {
  setStatus(
    Boolean(response?.active),
    response?.active
      ? 'Use the page normally, then return here to export.'
      : undefined,
  );
});
