import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { URL } from 'node:url'

const sourceUrl = new URL('../src/messageucolab.js', import.meta.url)

async function loadModule({ timer = setTimeout } = {}) {
  const source = (await readFile(sourceUrl, 'utf8')).replace('class AdminWidget {', 'export class AdminWidget {')
  const context = vm.createContext({
    URLSearchParams,
    AbortController,
    fetch: (...args) => globalThis.fetch(...args),
    setTimeout: timer,
    clearTimeout,
    FormData: class {
      constructor(form) { this.form = form }
      entries() { return Object.entries(this.form).filter(([key]) => key !== 'environmentIds') }
      getAll(name) { return name === 'environmentIds' ? this.form.environmentIds || [] : [] }
    }
  })
  const module = new vm.SourceTextModule(source, { context })
  await module.link(async (specifier) => new vm.SourceTextModule(
    await readFile(new URL(specifier, new URL('../src/', import.meta.url)), 'utf8'), { context }))
  await module.evaluate()
  return module.namespace
}

test('listMessages encodes every active filter, sort and application session header', async () => {
  const { createApi } = await loadModule()
  const previousFetch = globalThis.fetch
  let request
  globalThis.fetch = async (...args) => {
    request = args
    return { ok: true, status: 200, async text() { return JSON.stringify({ data: [{ data: [{ code: 'MSG_ONE' }], totalItems: 1, totalPages: 1 }] }) } }
  }
  try {
    const result = await createApi().listMessages('app-1', {
      page: 2, size: 20, environmentIds: ['dev', 'qa'], code: 'WELCOME', title: 'Hello world',
      statusId: 'active-1', functionalityId: 'feature-1', sort: 'DESC', columnSort: 'updatedAt'
    })
    const url = new URL(request[0], 'http://localhost')
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      page: '2', size: '20', sort: 'DESC', columnSort: 'updatedAt', filterEnvironments: 'dev,qa',
      filterCode: 'WELCOME', filterTitle: 'Hello world', filterStatusId: 'active-1', filterFunctionalityId: 'feature-1'
    })
    assert.equal(request[1].headers['X-Application-Id'], 'app-1')
    assert.equal(request[1].credentials, 'include')
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].code, 'MSG_ONE')
  } finally { globalThis.fetch = previousFetch }
})

test('editing requires an in-context environment and sends selected environment IDs in the PUT payload', async () => {
  const { AdminWidget } = await loadModule()
  const widget = Object.create(AdminWidget.prototype)
  const updates = []
  widget.state = {
    busy: false, context: { applicationId: 'app-1', environments: [{ id: 'dev' }, { id: 'qa' }] },
    editing: { code: 'MSG_EDIT' }, catalogs: { functionalities: [{ id: 'fn-1', active: true }], states: [{ id: 's-1', name: 'Activa' }] }
  }
  widget.api = { async updateMessage(...args) { updates.push(args) } }
  widget.set = patch => { widget.state = { ...widget.state, ...patch } }
  widget.emit = () => {}
  widget.loadMessages = async () => {}
  const submit = environmentIds => ({
    target: { dataset: { form: 'edit' }, code: 'MSG_EDIT', title: 'Título válido', content: 'Contenido válido',
      typeId: 'type-1', categoryId: 'category-1', statusId: 's-1', functionalityId: 'fn-1', environmentIds },
    preventDefault() {}
  })

  await widget.onSubmit(submit(['outside-app']))
  assert.equal(updates.length, 0)
  assert.match(widget.state.error, /únicamente ambientes de esta aplicación/)
  await widget.onSubmit(submit(['dev', 'qa']))
  assert.equal(updates.length, 1)
  assert.equal(updates[0][0], 'app-1')
  assert.equal(updates[0][1], 'MSG_EDIT')
  assert.deepEqual(updates[0][2].environmentIds, ['dev', 'qa'])
})

test('all-environments context blocks single-message consumption and instructs selecting an environment', async () => {
  const { AdminWidget } = await loadModule()
  const widget = Object.create(AdminWidget.prototype)
  widget.state = {
    busy: false, applications: [], detail: { code: 'MSG_ONE' }, context: { applicationId: 'app-1', environmentId: '', environment: '', environments: [{ id: 'dev', name: 'Develop' }, { id: 'qa', name: 'Testing' }] },
    catalogs: { types: [], categories: [], functionalities: [], states: [] }
  }
  widget.options = {}
  widget.renderAlerts = () => ''
  widget.options_ = () => ''
  widget.root = { querySelector() { return null } }
  const ctx = widget.renderContext({ application: 'Portal', environmentId: '', environment: '', environments: [{ id: 'dev', name: 'Develop' }, { id: 'qa', name: 'Testing' }] })
  assert.match(ctx, /Todos los ambientes/)
  assert.match(ctx, /value="" selected/)
  const detailHtml = widget.renderDetail()
  assert.match(detailHtml, /Selecciona un ambiente en la cabecera para consultar el mensaje/)
  assert.match(detailHtml, /data-action="consumer-view" disabled/)
  assert.doesNotMatch(detailHtml, /pública|public\/messages/)

  widget.openDetail = async () => {}
  widget.api = { consumerMessage: async () => assert.fail('public lookup must not run without one environment') }
  await widget.onClick({ target: { closest: () => ({ dataset: { action: 'consumer-view' } }) } })
  assert.equal(widget.state.busy, false)
})

test('consumer routes use the owner session, exact method/query/body and application/environment context', async () => {
  const { createApi } = await loadModule()
  const previousFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (...args) => {
    calls.push(args)
    return { ok: true, status: 200, async text() { return JSON.stringify({ code: 'MSG_HELLO', title: 'Hola', content: 'Mundo' }) } }
  }
  try {
    const api = createApi()
    await api.consumerMessage('owner-app', 'env-qa', 'Hola mundo')
    await api.consumerMessage('owner-app', 'env-qa', 'HELLO', 'español')
    await api.consumerMessages('owner-app', 'env-qa')

    assert.equal(calls[0][0], '/messageucolab/v1/messages/consumer?code=MSG_HOLA_MUNDO')
    assert.equal(calls[0][1].method, 'GET')
    assert.equal(calls[1][0], '/messageucolab/v1/messages/consumer/translations?code=MSG_HELLO')
    assert.equal(calls[1][1].method, 'POST')
    assert.equal(calls[1][1].body, JSON.stringify({ targetLanguage: 'español' }))
    assert.equal(calls[1][1].headers['Content-Type'], 'application/json')
    assert.equal(calls[2][0], '/messageucolab/v1/messages/consumer')
    assert.equal(calls[2][1].method, 'GET')
    for (const [url, options] of calls) {
      assert.equal(options.credentials, 'include')
      assert.equal(options.headers['X-Application-Id'], 'owner-app')
      assert.equal(options.headers['X-Environment-Id'], 'env-qa')
      assert.equal(options.headers.Authorization, undefined)
      assert.equal(options.headers.Token, undefined)
      assert.doesNotMatch(url, /\/public\/messages/)
    }
  } finally { globalThis.fetch = previousFetch }
})

test('consumer translation enforces the 60-second request timeout without waiting for it', async () => {
  const delays = []
  const { createApi } = await loadModule({ timer: (_callback, delay) => { delays.push(delay); return 1 } })
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, async text() { return '{"title":"Bonjour","content":"Salut"}' } })
  try {
    await createApi({ timeoutMs: 50 }).consumerMessage('app', 'dev', 'HELLO', 'fr')
    assert.deepEqual(delays, [60000])
  } finally { globalThis.fetch = previousFetch }
})

test('consumer 401/403 errors propagate and only 401 notifies the session-expired callback', async () => {
  const { createApi } = await loadModule()
  const previousFetch = globalThis.fetch
  const unauthorized = []
  globalThis.fetch = async () => {
    const status = unauthorized.length ? 403 : 401
    return { ok: false, status, async text() { return JSON.stringify({ message: `HTTP ${status}` }) } }
  }
  try {
    const api = createApi({ onUnauthorized: error => unauthorized.push(error.status) })
    await assert.rejects(api.consumerMessage('app', 'dev', 'LOGIN'), error => error.status === 401 && error.code === 'SESSION_EXPIRED')
    await assert.rejects(api.consumerMessages('app', 'dev'), error => error.status === 403)
    assert.deepEqual(unauthorized, [401])
  } finally { globalThis.fetch = previousFetch }
})

test('message client getStrict uses the consumer route and cache; get retains its configured fallback on session failure', async () => {
  const { createMessageClient } = await loadModule()
  const previousFetch = globalThis.fetch
  const requests = []
  let failWithUnauthorized = false
  globalThis.fetch = async (...args) => {
    requests.push(args)
    if (failWithUnauthorized) return { ok: false, status: 401, async text() { return '{"message":"expired"}' } }
    return { ok: true, status: 200, async text() { return '{"code":"MSG_HELLO","title":"Hello {name}","content":"Welcome {name}"}' } }
  }
  const errors = []
  try {
    const client = createMessageClient({ applicationId: 'app-owner', environmentId: 'env-1', fallbacks: { MSG_HELLO: { title: 'Fallback', content: 'Offline' } }, onError: error => errors.push(error.status) })
    const first = await client.getStrict('HELLO', { name: 'Ana' })
    const cached = await client.getStrict('HELLO', { name: 'Luis' })
    assert.equal(first.title, 'Hello Ana')
    assert.equal(first.source, 'api')
    assert.equal(cached.title, 'Hello Luis')
    assert.equal(cached.source, 'cache')
    assert.equal(requests.length, 1)
    assert.equal(requests[0][0], '/messageucolab/v1/messages/consumer?code=MSG_HELLO')

    client.clearCache()
    failWithUnauthorized = true
    const fallback = await client.get('HELLO')
    assert.equal(fallback.title, 'Fallback')
    assert.equal(fallback.content, 'Offline')
    assert.equal(fallback.source, 'fallback')
    assert.deepEqual(errors, [401])
    assert.ok(requests.every(([url]) => !url.includes('/public/messages')))
  } finally { globalThis.fetch = previousFetch }
})

test('silent loading forwards all active list criteria and refreshes result data without a full render', async () => {
  const { AdminWidget } = await loadModule()
  const widget = Object.create(AdminWidget.prototype)
  const listCalls = []
  let fullRenders = 0
  let liveRenders = 0
  widget.state = {
    context: { applicationId: 'app-1', environmentId: 'dev' },
    list: { items: [{ code: 'old' }], page: 2, size: 20, query: 'HELLO', title: 'welcome', statusId: 'active', functionalityId: 'fn', sort: 'DESC', columnSort: 'updatedAt' }
  }
  widget.contextVersion = 3
  widget.messagesVersion = 0
  widget.destroyed = false
  widget.sessionLost = false
  widget.api = { async listMessages(...args) { listCalls.push(args); return { items: [{ code: 'new' }], totalPages: 3, totalItems: 41 } } }
  widget.render = () => { fullRenders++ }
  widget.renderLiveData = () => { liveRenders++ }

  await widget.loadMessages(2, 'HELLO', { silent: true })
  assert.equal(listCalls.length, 1)
  assert.equal(listCalls[0][0], 'app-1')
  assert.deepEqual(JSON.parse(JSON.stringify(listCalls[0][1])), {
    page: 2, size: 20, environmentIds: ['dev'], code: 'MSG_HELLO', title: 'welcome', statusId: 'active',
    functionalityId: 'fn', sort: 'DESC', columnSort: 'updatedAt'
  })
  assert.equal(widget.state.list.items[0].code, 'new')
  assert.equal(widget.state.list.page, 2)
  assert.equal(widget.state.list.title, 'welcome')
  assert.equal(widget.state.list.functionalityId, 'fn')
  assert.equal(fullRenders, 0)
  assert.equal(liveRenders, 1)
})

test('live catalog refresh selects only the create/edit functionality field, not the search filter or editor draft', async () => {
  const { AdminWidget } = await loadModule()
  const widget = Object.create(AdminWidget.prototype)
  const draftText = { value: 'draft title', innerHTML: 'untouched' }
  const draftContent = { value: 'draft content', innerHTML: 'untouched' }
  const searchFilter = { value: 'filter-fn', dataset: { catalogVersion: '1' }, innerHTML: 'filter options' }
  const editorFunction = { value: 'editor-fn', dataset: { catalogVersion: '1' }, innerHTML: 'editor options' }
  const selectors = []
  widget.destroyed = false
  widget.catalogRevision = 2
  widget.state = {
    view: 'ready', tab: 'edit', busy: false, eventsStatus: 'connected',
    catalogs: { states: [], functionalities: [{ id: 'editor-fn', name: 'Current feature' }] }
  }
  widget.options_ = items => items.map(item => `<option value="${item.id}">${item.name}</option>`).join('')
  widget.renderListResults = () => '<table>new results</table>'
  widget.renderFunctionalityList = () => '<div>functionality list</div>'
  widget.renderAlertContents = () => ''
  widget.renderLiveStatus = () => {}
  widget.root = { querySelector(selector) {
    selectors.push(selector)
    if (selector.includes('[data-message-results]')) return { set innerHTML(value) { this.value = value } }
    if (selector.includes('select[name="statusId"]')) return null
    if (selector.includes('form[data-form="search"] select[name="functionalityId"]')) return searchFilter
    if (selector.includes('form[data-form="create"] select[name="functionalityId"') && selector.includes('form[data-form="edit"] select[name="functionalityId"')) return editorFunction
    if (selector.includes('form[data-form="create"] select[name="functionalityId"')) return null
    if (selector.includes('[data-feedback]')) return null
    return null
  } }
  // A title/content draft is deliberately outside the queried refresh targets.
  const before = [draftText.value, draftContent.value, searchFilter.value, editorFunction.value]
  widget.renderLiveData()
  assert.deepEqual([draftText.value, draftContent.value, searchFilter.value, editorFunction.value], before)
  assert.ok(selectors.includes('form[data-form="search"] select[name="functionalityId"]'))
  assert.ok(selectors.includes('form[data-form="create"] select[name="functionalityId"], form[data-form="edit"] select[name="functionalityId"]'))
  assert.match(searchFilter.innerHTML, /option value="editor-fn"/)
  assert.equal(searchFilter.value, 'filter-fn')
  assert.match(editorFunction.innerHTML, /Current feature/)
})

test('clear filters retains the selected environment, while sorting and paging reuse the remaining search criteria', async () => {
  const { AdminWidget } = await loadModule()
  const widget = Object.create(AdminWidget.prototype)
  const loads = []
  widget.state = { busy: false, context: { environmentId: 'qa', environment: 'Testing' }, list: {
    items: [], page: 3, size: 20, totalPages: 4, query: 'HELLO', title: 'welcome', statusId: 'active',
    functionalityId: 'fn', sort: 'DESC', columnSort: 'updatedAt', loading: false
  } }
  widget.loadMessages = async (...args) => { loads.push(args) }
  const click = action => widget.onClick({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action } }) } })

  await click('clear-filters')
  assert.deepEqual(loads[0], [1, ''])
  assert.equal(widget.state.context.environmentId, 'qa')
  assert.equal(widget.state.list.title, '')
  assert.equal(widget.state.list.statusId, '')
  assert.equal(widget.state.list.functionalityId, '')
  assert.equal(widget.state.list.query, 'HELLO')

  await click('sort-updated')
  assert.deepEqual(loads[1], [1])
  assert.equal(widget.state.list.sort, 'ASC')
  assert.equal(widget.state.list.columnSort, 'updatedAt')
  assert.equal(widget.state.list.query, 'HELLO')
  assert.equal(widget.state.list.title, '')

  await widget.onClick({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'page', arg: '2' } }) } })
  assert.deepEqual(loads[2], [2, 'HELLO'])
  assert.equal(widget.state.context.environmentId, 'qa')
})

test('editor drafts restore by application and message key, including checkbox selection and focus', async () => {
  const { AdminWidget } = await loadModule()
  const widget = Object.create(AdminWidget.prototype)
  const title = { name: 'title', type: 'text', value: 'draft title', checked: false, dataset: {}, focus() { this.focused = true }, setSelectionRange(start, end) { this.selection = [start, end] } }
  const checkboxA = { name: 'environmentIds', type: 'checkbox', value: 'dev', checked: true, dataset: {}, closest: () => ({ classList: { toggle(_name, value) { checkboxA.classOn = value } } }) }
  const checkboxB = { name: 'environmentIds', type: 'checkbox', value: 'qa', checked: false, dataset: {}, closest: () => ({ classList: { toggle(_name, value) { checkboxB.classOn = value } } }) }
  const editor = { dataset: { editorKey: 'app-1:edit:MSG_A' }, elements: [title, checkboxA, checkboxB], contains: field => field === title }
  widget.root = { activeElement: title, querySelector: () => editor }
  widget.state = { busy: false }
  widget.onInput = () => {}
  title.selectionStart = 3
  title.selectionEnd = 8
  const draft = widget.captureEditor()
  title.value = 'changed by rerender'
  checkboxA.checked = false
  checkboxB.checked = true
  widget.restoreEditor(draft)
  assert.equal(title.value, 'draft title')
  assert.equal(checkboxA.checked, true)
  assert.equal(checkboxB.checked, false)
  assert.equal(checkboxA.classOn, true)
  assert.equal(title.focused, true)
  assert.deepEqual(title.selection, [3, 8])

  title.value = 'another application'
  editor.dataset.editorKey = 'app-2:edit:MSG_A'
  widget.restoreEditor(draft)
  assert.equal(title.value, 'another application')
  editor.dataset.editorKey = 'app-1:edit:MSG_B'
  widget.restoreEditor(draft)
  assert.equal(title.value, 'another application')
})

test('edit form retains text and environment choices after validation and HTTP failures', async () => {
  const { AdminWidget } = await loadModule()
  const widget = Object.create(AdminWidget.prototype)
  const fields = [
    { name: 'title', type: 'text', value: 'Draft title', checked: false, dataset: {}, focus() { this.focused = true } },
    { name: 'content', type: 'textarea', value: 'Draft content', checked: false, dataset: {} },
    ...['dev', 'qa'].map((value, index) => ({ name: 'environmentIds', type: 'checkbox', value, checked: index === 0, dataset: {}, closest: () => ({ classList: { toggle(_name, selected) { this.selected = selected } } }) }))
  ]
  const editor = { dataset: { editorKey: 'app-1:edit:MSG_EDIT' }, elements: fields, contains: field => fields.includes(field) }
  widget.root = { activeElement: fields[0], querySelector: () => editor }
  widget.state = { busy: false, context: { applicationId: 'app-1', environments: [{ id: 'dev' }, { id: 'qa' }] }, editing: { code: 'MSG_EDIT' }, catalogs: { functionalities: [{ id: 'fn-1', active: true }], states: [{ id: 's-1', name: 'Activa' }] } }
  widget.set = patch => {
    const draft = widget.captureEditor()
    widget.state = { ...widget.state, ...patch }
    widget.restoreEditor(draft)
  }
  widget.fail = error => error.message
  widget.emit = () => {}
  widget.loadMessages = async () => {}
  widget.api = { async updateMessage() { throw new Error('HTTP 503') } }
  const form = environmentIds => ({
    dataset: { form: 'edit' }, title: fields[0].value, content: fields[1].value,
    typeId: 'type-1', categoryId: 'category-1', statusId: 's-1', functionalityId: 'fn-1', environmentIds
  })
  const submit = target => widget.onSubmit({ target, preventDefault() {} })

  fields[0].value = 'Keep this draft'
  fields[1].value = 'Keep this body'
  await submit(form([]))
  assert.match(widget.state.error, /Elige al menos un ambiente/)
  assert.equal(fields[0].value, 'Keep this draft')
  assert.equal(fields[1].value, 'Keep this body')
  assert.deepEqual(fields.slice(2).map(field => field.checked), [true, false])

  fields[2].checked = false
  fields[3].checked = true
  await submit(form(['qa']))
  assert.equal(widget.state.error, 'HTTP 503')
  assert.equal(widget.state.busy, false)
  assert.equal(fields[0].value, 'Keep this draft')
  assert.equal(fields[1].value, 'Keep this body')
  assert.deepEqual(fields.slice(2).map(field => field.checked), [false, true])
})

test('environment selector supports all environments, locks a chosen environment, and displays a safe empty-context label', async () => {
  const { AdminWidget } = await loadModule()
  const widget = Object.create(AdminWidget.prototype)
  widget.options = {}
  widget.state = { busy: false, applications: [] }
  const environments = [{ id: 'dev', name: 'Develop' }, { id: 'prod', name: 'Production' }]
  const unlocked = widget.renderContext({ application: 'Portal', environmentId: '', environment: '', environments })
  assert.match(unlocked, /Todos los ambientes/)
  assert.match(unlocked, /value="" selected/)
  widget.options.lockEnvironment = true
  const locked = widget.renderContext({ application: 'Portal', environmentId: 'dev', environment: 'Develop', environments })
  assert.doesNotMatch(locked, /<select/)
  assert.match(locked, /<b>Develop<\/b>/)
  const emptyLocked = widget.renderContext({ application: 'Portal', environmentId: '', environment: '', environments })
  assert.match(emptyLocked, /Sin ambiente/)
})
