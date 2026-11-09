import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { URL } from 'node:url'

const sourceUrl = new URL('../src/messageucolab.js', import.meta.url)

async function loadWidget() {
  const source = (await readFile(sourceUrl, 'utf8')).replace('class AdminWidget {', 'export class AdminWidget {')
  const context = vm.createContext({
    FormData: class { entries() { return [] } },
    fetch: (...args) => globalThis.fetch(...args),
    AbortController,
    setTimeout,
    clearTimeout
  })
  const module = new vm.SourceTextModule(source, { context })
  await module.link(async (specifier) => {
    if (specifier !== './message-events.js') throw new Error(`unexpected source import: ${specifier}`)
    const eventsSource = await readFile(new URL('../src/message-events.js', import.meta.url), 'utf8')
    return new vm.SourceTextModule(eventsSource, { context })
  })
  await module.evaluate()
  return module.namespace
}

function widgetFor(AdminWidget, options = {}) {
  const widget = Object.create(AdminWidget.prototype)
  widget.options = options
  widget.state = {
    busy: false,
    destroyed: false,
    sessionLost: false,
    context: { application: 'Portal' },
    applications: [{ id: 'app-1', name: 'Portal', organization: { name: 'Org' } }],
    catalogs: { functionalities: [{ id: 'fn-1', name: 'Inventario', active: true }], types: [], categories: [], states: [] },
    list: { items: [], page: 1, size: 10, totalItems: 0, totalPages: 0, query: '' }
  }
  widget.seeds = { functionalityStates: [{ id: 'active', name: 'Activa' }] }
  widget.renderAlerts = () => ''
  widget.options_ = () => '<option value="active">Activa</option>'
  return widget
}

test('application selection stays available but never renders an application creation form', async () => {
  const { AdminWidget } = await loadWidget()
  for (const options of [{ allowApplicationCreation: true }, { allowApplicationCreation: false }, {}]) {
    const widget = widgetFor(AdminWidget, options)
    let applicationRequests = 0
    widget.api = { createApplication: async () => { applicationRequests++ } }
    await widget.onSubmit({
      target: { dataset: { form: 'application' } },
      preventDefault() {}
    })
    assert.equal(applicationRequests, 0, 'legacy application form submissions must not call the API')
    const selection = widget.renderApplications()
    assert.match(selection, /data-action="pick-app"/)
    assert.match(selection, /Portal/)
    assert.doesNotMatch(selection, /data-form="application"|Registrar otra aplicación/)
  }
})

test('settings keeps functionality list and creation form with its dedicated spacing rule', async () => {
  const { AdminWidget } = await loadWidget()
  const widget = widgetFor(AdminWidget)
  const settings = widget.renderConfig()
  assert.match(settings, /data-functionalities>[\s\S]*Inventario/)
  assert.match(settings, /<form data-form="functionality" class="grid functionality-form">[\s\S]*Crear funcionalidad/)

  const source = await readFile(sourceUrl, 'utf8')
  const styleRule = source.match(/\.functionality-form\s*\{([^}]+)\}/)?.[1]
  assert.ok(styleRule, 'expected a CSS rule scoped to functionality-form')
  assert.match(styleRule, /margin-top:\s*24px/)
  assert.match(styleRule, /gap:\s*16px/)
  assert.match(styleRule, /align-items:\s*end/)
  assert.doesNotMatch(styleRule, /\.grid\s*\{/)
})

test('application creation remains exposed through the public API client contract', async () => {
  const { createApi } = await loadWidget()
  const priorFetch = globalThis.fetch
  let request
  globalThis.fetch = async (...args) => {
    request = args
    return { ok: true, status: 200, async text() { return '{"id":"app-2"}' } }
  }
  try {
    const payload = { name: 'Portal' }
    assert.equal(JSON.stringify(await createApi().createApplication(payload)), JSON.stringify({ id: 'app-2' }))
    assert.equal(request[0], '/messageucolab/v1/application')
    assert.equal(request[1].method, 'POST')
    assert.equal(request[1].body, JSON.stringify(payload))
  } finally {
    globalThis.fetch = priorFetch
  }
})
