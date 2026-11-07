/** Protected administrative SSE; never used automatically by the public message client. */
export function createMessageEventStream({ url, applicationId, credentials = 'include', onEvent, onStatus, onUnauthorized }) {
  let connection = null;
  let timer = null;
  let stopped = true;
  let attempt = 0;
  const status = (value) => onStatus?.(value);
  const current = (controller) => !stopped && connection === controller && !controller.signal.aborted;

  function dispatch(block, controller) {
    let event = 'message';
    let id = '';
    const lines = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const separator = line.indexOf(':');
      const field = separator < 0 ? line : line.slice(0, separator);
      const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      if (field === 'id') id = value;
      if (field === 'data') lines.push(value);
    }
    if (!lines.length || !current(controller)) return;
    let data = lines.join('\n');
    try { data = JSON.parse(data); } catch { /* SSE also permits plain text. */ }
    onEvent?.({ event, id, data });
  }

  async function consume(response, controller) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (current(controller)) {
        const { done, value } = await reader.read();
        if (done || !current(controller)) break;
        buffer = (buffer + decoder.decode(value, { stream: true }))
          .replace(/\r\n/g, '\n').replace(/\r(?!$)/g, '\n');
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1 && current(controller)) {
          dispatch(buffer.slice(0, boundary), controller);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  function reconnect() {
    if (stopped || timer !== null) return;
    const delay = Math.min(1000 * 2 ** attempt++, 30000);
    status('reconnecting');
    timer = setTimeout(() => { timer = null; connect(); }, delay);
  }

  async function connect() {
    if (stopped || connection) return;
    const controller = new AbortController();
    connection = controller;
    let retry = true;
    status('connecting');
    try {
      const response = await fetch(url, {
        headers: { Accept: 'text/event-stream', 'X-Application-Id': applicationId },
        credentials, cache: 'no-store', signal: controller.signal
      });
      if (!current(controller)) return;
      if (response.status === 401 || response.status === 403) {
        retry = false;
        status(response.status === 403 ? 'forbidden' : 'unauthorized');
        if (response.status === 401) onUnauthorized?.();
        return;
      }
      const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (!response.ok || type !== 'text/event-stream' || !response.body) {
        throw new Error('No se pudo abrir el canal SSE de MessageUcoLab.');
      }
      attempt = 0;
      status('connected');
      onEvent?.({ event: 'connected', id: '', data: { applicationId } });
      await consume(response, controller);
    } catch (error) {
      if (current(controller) && error.name !== 'AbortError') status('error');
    } finally {
      if (connection === controller) {
        connection = null;
        if (!stopped && retry) reconnect();
      }
    }
  }

  return {
    start() {
      if (!stopped || !applicationId) return;
      stopped = false;
      attempt = 0;
      connect();
    },
    stop() {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      const controller = connection;
      connection = null;
      controller?.abort();
      status('disconnected');
    }
  };
}
