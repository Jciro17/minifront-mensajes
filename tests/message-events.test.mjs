import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { URL } from 'node:url'

const sourceUrl = new URL('../src/message-events.js', import.meta.url)

async function loadFactory() {
  const source = await readFile(sourceUrl, 'utf8')
  const context = vm.createContext({ AbortController, TextDecoder, setTimeout, clearTimeout, fetch: (...args) => globalThis.fetch(...args) })
  const module = new vm.SourceTextModule(source, { context })
  await module.link(() => { throw new Error('unexpected source import') })
  await module.evaluate()
  return module.namespace.createMessageEventStream
}

function response(chunks, { status = 200, type = 'text/event-stream' } = {}) {
  let index = 0
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => type },
    body: { getReader: () => ({
      async read() { return index < chunks.length ? { done: false, value: new TextEncoder().encode(chunks[index++]) } : { done: true } },
      releaseLock() {}
    }) }
  }
}

test('SSE sends request credentials and headers, then parses JSON, multiline data and CRLF across chunks', async () => {
  const create = await loadFactory()
  const priorFetch = globalThis.fetch
  const events = []
  let request
  let stream
  globalThis.fetch = async (...args) => { request = args; return response(['event: MessageUpdated\r', '\nid: 17\r\ndata: {"title":\r\ndata: "hello"}\r\n\r\n']) }
  try {
    stream = create({ url: '/v1/messages/events', applicationId: 'app-7', onEvent: event => events.push(event) })
    stream.start()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(request[0], '/v1/messages/events')
    assert.equal(request[1].headers.Accept, 'text/event-stream')
    assert.equal(request[1].headers['X-Application-Id'], 'app-7')
    assert.equal(request[1].credentials, 'include')
    assert.deepEqual(events.map(({ event }) => event), ['connected', 'MessageUpdated'])
    assert.equal(events[1].id, '17')
    assert.equal(JSON.stringify(events[1].data), JSON.stringify({ title: 'hello' }))
  } finally {
    stream?.stop()
    globalThis.fetch = priorFetch
  }
})

test('401 is terminal and invokes unauthorized callback once; 403 is terminal without logout callback', async () => {
  const create = await loadFactory()
  const priorFetch = globalThis.fetch
  try {
    for (const [status, expected, unauthorized] of [[401, 'unauthorized', 1], [403, 'forbidden', 0]]) {
      let callbackCount = 0
      const statuses = []
      globalThis.fetch = async () => response([], { status })
      const stream = create({ url: '/events', applicationId: 'app', onStatus: value => statuses.push(value), onUnauthorized: () => callbackCount++ })
      stream.start()
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(statuses.at(-1), expected)
      assert.equal(callbackCount, unauthorized)
      stream.stop()
    }
  } finally { globalThis.fetch = priorFetch }
})

test('stop aborts an in-flight request and prevents late events', async () => {
  const create = await loadFactory()
  const priorFetch = globalThis.fetch
  let resolveFetch
  const events = []
  let signal
  globalThis.fetch = (_url, options) => { signal = options.signal; return new Promise(resolve => { resolveFetch = resolve }) }
  try {
    const stream = create({ url: '/events', applicationId: 'app', onEvent: event => events.push(event) })
    stream.start()
    stream.stop()
    assert.equal(signal.aborted, true)
    resolveFetch(response(['data: {"late":true}\n\n']))
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(events, [])
  } finally { globalThis.fetch = priorFetch }
})

test('HTML response is treated as an error rather than a connected stream', async () => {
  const create = await loadFactory()
  const priorFetch = globalThis.fetch
  const statuses = []
  let stream
  globalThis.fetch = async () => response([], { type: 'text/html' })
  try {
    stream = create({ url: '/events', applicationId: 'app', onStatus: status => statuses.push(status) })
    stream.start()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(statuses.includes('connected'), false)
    assert.equal(statuses.includes('error'), true)
  } finally {
    stream?.stop()
    globalThis.fetch = priorFetch
  }
})
