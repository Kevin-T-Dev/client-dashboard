import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

const stub = new URL('./fixtures/boot-stubs.mjs', import.meta.url).href
const remote = new URL('../src/db/remote.ts', import.meta.url).href

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/db/remote') return nextResolve(remote, context)
    if (specifier.startsWith('@/')) return nextResolve(stub, context)
    return nextResolve(specifier, context)
  },
})

const { db, state } = await import(stub)
const { isRemoteMuted } = await import(remote)
let importCount = 0

async function loadBoot() {
  state.configured = true
  state.error = null
  state.requests = []
  state.seedCalls = 0
  state.localWrites = []
  state.checkLocalWrite = () => assert.equal(isRemoteMuted(), true)
  db.tasks.rows = [{ id: 'old-local-task' }]
  db.media.rows = []
  return import(`../src/db/boot.ts?test=${++importCount}`)
}

test.after(() => hooks.deregister())

test('cloud startup loads existing rows and media without marker queries or remote writes', async () => {
  const { bootDatabase } = await loadBoot()
  const first = bootDatabase()
  assert.equal(bootDatabase(), first)
  await first
  assert.equal(state.seedCalls, 0)
  assert.equal(state.requests.length, 10)
  assert.ok(state.requests.every((request) => /^(select|download):/.test(request)))
  assert.ok(!state.requests.includes('select:sync_state'))
  assert.deepEqual(db.tasks.rows.map(({ id, title }) => [id, title]), [
    ['existing-task', 'Cloud task'],
  ])
  assert.equal(await db.media.rows[0].blob.text(), 'existing image')
})

test('an empty cloud stays empty and startup does not seed or write markers', async () => {
  const { bootDatabase } = await loadBoot()
  state.empty = true
  try {
    await bootDatabase()
    assert.deepEqual(db.tasks.rows, [])
    assert.equal(state.seedCalls, 0)
    assert.equal(state.requests.length, 9)
    assert.ok(state.requests.every((request) => request.startsWith('select:')))
  } finally {
    state.empty = false
  }
})

test('a cloud read failure leaves the existing local cache alone', async () => {
  const { bootDatabase } = await loadBoot()
  state.error = { message: 'Connection failed' }
  await assert.rejects(bootDatabase(), /Connection failed/)
  assert.deepEqual(state.localWrites, [])
  assert.deepEqual(db.tasks.rows, [{ id: 'old-local-task' }])
})

test('offline startup still seeds once and never contacts Supabase', async () => {
  const { bootDatabase } = await loadBoot()
  state.configured = false
  await bootDatabase()
  await bootDatabase()
  assert.equal(state.seedCalls, 1)
  assert.deepEqual(state.requests, [])
})
