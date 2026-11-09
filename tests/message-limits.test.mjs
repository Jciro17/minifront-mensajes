import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { URL } from 'node:url'

const sourceUrl = new URL('../src/messageucolab.js', import.meta.url)

async function widgetHarness() {
  const source = (await readFile(sourceUrl, 'utf8')).replace('class AdminWidget {', 'export class AdminWidget {')
  const context = vm.createContext({
    FormData: class {
      constructor(form) { this.form = form }
      entries() { return Object.entries(this.form).filter(([key]) => key !== 'environmentIds') }
      getAll(name) { return name === 'environmentIds' ? this.form.environmentIds || [] : [] }
    }
  })
  const module = new vm.SourceTextModule(source, { context })
  await module.link(async (specifier) => {
    if (specifier !== './message-events.js') throw new Error(`unexpected source import: ${specifier}`)
    const eventsSource = await readFile(new URL('../src/message-events.js', import.meta.url), 'utf8')
    return new vm.SourceTextModule(eventsSource, { context })
  })
  await module.evaluate()
  const widget = Object.create(module.namespace.AdminWidget.prototype)
  const calls = { create: [], update: [] }
  widget.state = {
    context: { applicationId: 'app-1' },
    editing: { code: 'MSG_EDIT' },
    list: { page: 1 },
    catalogs: { functionalities: [{ id: 'fn-1', active: true }], states: [{ id: 'status-1', name: 'Activa' }] }
  }
  widget.api = {
    async createMessage(...args) { calls.create.push(args) },
    async updateMessage(...args) { calls.update.push(args) }
  }
  widget.set = (patch) => { widget.state = { ...widget.state, ...patch } }
  widget.emit = () => {}
  widget.loadMessages = async () => {}
  return { widget, calls }
}

function submit(kind, values) {
  return {
    target: { ...values, dataset: { form: kind } },
    preventDefault() {}
  }
}

function values({ code = 'CODE', title = 't'.repeat(5), content = 'c'.repeat(5) } = {}) {
  return { code, title, content, functionalityId: 'fn-1', typeId: 'type-1', categoryId: 'category-1', statusId: 'status-1', environmentIds: ['dev'] }
}

test('AdminWidget creation enforces code and text boundaries before calling the simulated API', async () => {
  const { widget, calls } = await widgetHarness()
  for (const [form, ok] of [[values({ code: '' }), false], [values({ code: 'A' }), true], [values({ code: 'A'.repeat(500), title: 't'.repeat(1000), content: 'c'.repeat(2000) }), true], [values({ code: 'A'.repeat(501) }), false], [values({ title: 't'.repeat(4) }), false], [values({ title: 't'.repeat(1001) }), false], [values({ content: 'c'.repeat(4) }), false], [values({ content: 'c'.repeat(2001) }), false]]) {
    await widget.onSubmit(submit('create', form))
    if (!ok) assert.notEqual(widget.state.error, '')
  }
  assert.equal(calls.create.length, 2)
  assert.equal(calls.create[1][1].code, 'A'.repeat(500))
  assert.equal(calls.create[1][1].title.length, 1000)
  assert.equal(calls.create[1][1].content.length, 2000)
})

test('AdminWidget creation accepts the optional MSG_ prefix and trims payload values', async () => {
  const { widget, calls } = await widgetHarness()
  await widget.onSubmit(submit('create', values({ code: ` MSG_${'A'.repeat(500)} `, title: ` ${'t'.repeat(5)} `, content: ` ${'c'.repeat(5)} ` })))
  assert.equal(calls.create.length, 1)
  assert.equal(calls.create[0][1].code, 'A'.repeat(500))
  assert.equal(calls.create[0][1].title, 't'.repeat(5))
  assert.equal(calls.create[0][1].content, 'c'.repeat(5))
})

test('AdminWidget editing applies matching title/content bounds and does not call API for invalid values', async () => {
  const { widget, calls } = await widgetHarness()
  for (const form of [values({ title: 't'.repeat(4) }), values({ title: 't'.repeat(1001) }), values({ content: 'c'.repeat(4) }), values({ content: 'c'.repeat(2001) })]) {
    await widget.onSubmit(submit('edit', form))
    assert.equal(calls.update.length, 0)
    assert.notEqual(widget.state.error, '')
  }
  await widget.onSubmit(submit('edit', values({ title: 't'.repeat(1000), content: 'c'.repeat(2000) })))
  assert.equal(calls.update.length, 1)
  assert.equal(calls.update[0][1], 'MSG_EDIT')
  assert.equal(calls.update[0][2].title.length, 1000)
  assert.equal(calls.update[0][2].content.length, 2000)
})

test('AdminWidget renders matching input caps and counts the 500-character suffix without MSG_', async () => {
  const { widget } = await widgetHarness()
  widget.state.catalogs = { functionalities: [{ id: 'fn-1', active: true }], types: [], categories: [], states: [] }
  widget.state.context = { application: 'App', environmentId: 'dev', environments: [] }
  widget.renderAlerts = () => ''
  widget.options_ = () => ''
  const html = widget.renderCreate()
  assert.match(html, /name="code" maxlength="504"[^>]*data-count="1-500"/)
  assert.match(html, /name="title" minlength="5" maxlength="1000"/)
  assert.match(html, /name="content" minlength="5" maxlength="2000"/)

  const output = { textContent: '', classList: { toggled: null, toggle(_name, value) { this.toggled = value } } }
  widget.root = { querySelector() { return output } }
  widget.onInput({ target: { name: 'code', value: `MSG_${'A'.repeat(500)}`, dataset: { count: '1-500' } } })
  assert.equal(output.textContent, `500/500 · se guardará como MSG_${'A'.repeat(500)}`)
  assert.equal(output.classList.toggled, false)
})
