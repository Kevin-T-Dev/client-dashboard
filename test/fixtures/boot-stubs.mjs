export const state = { empty: false }

const tableNames = ['students', 'lessonPlans', 'sessions', 'tasks', 'packages', 'appointments', 'media', 'meta']

export const db = {
  async transaction(_mode, _tables, callback) {
    await callback()
  },
}

for (const name of tableNames) {
  db[name] = {
    rows: [],
    hook() {},
    async toArray() {
      return this.rows
    },
    async clear() {
      state.checkLocalWrite()
      state.localWrites.push(name)
      this.rows = []
    },
    async bulkAdd(rows) {
      state.checkLocalWrite()
      this.rows.push(...rows)
    },
  }
}

const cloudRows = {
  tasks: [{ id: 'existing-task', title: 'Cloud task', board_column: 'todo' }],
  media: [{ id: 'existing-media', storage_path: 'existing-image', byte_size: 14 }],
}

export function getSupabase() {
  return {
    from(table) {
      return {
        async select() {
          state.requests.push(`select:${table}`)
          return { data: state.empty ? [] : cloudRows[table] ?? [], error: state.error }
        },
      }
    },
    storage: {
      from(bucket) {
        assertMediaBucket(bucket)
        return {
          async download(path) {
            state.requests.push(`download:${path}`)
            return { data: new Blob(['existing image']), error: null }
          },
        }
      },
    },
  }
}

function assertMediaBucket(bucket) {
  if (bucket !== 'media') throw new Error(`Unexpected storage bucket: ${bucket}`)
}

export function isSupabaseConfigured() {
  return state.configured
}

export async function seedIfEmpty() {
  state.seedCalls += 1
}

export function notify() {
  throw new Error('Unexpected notification')
}

export default { t: (key) => key }
