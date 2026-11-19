import { notify } from '@/components/ui/Toaster'
import i18n from '@/lib/i18n'
import { db } from '@/db/db'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type {
  Appointment,
  BeautyPackage,
  LessonPlan,
  MediaItem,
  Student,
  Task,
  YogaSession,
} from '@/db/types'

const BUCKET = 'media'

let muted = 0

/** Ignore Dexie writes that are only mirroring Supabase back into the local cache. */
export function setRemoteMuted(on: boolean): void {
  muted += on ? 1 : -1
}

export function isRemoteMuted(): boolean {
  return muted > 0
}

let queue: Promise<void> = Promise.resolve()

function enqueue(task: () => Promise<void>): void {
  queue = queue
    .then(task)
    .catch((err: unknown) => {
      console.error('Supabase sync failed', err)
      notify(i18n.t('sync.failed'), explain(err), 'error')
    })
}

function explain(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String(err.message)
  return 'Sync failed'
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** Saves a row. If the location column is not in Supabase yet, the rest of the row still saves. */
async function upsert(table: string, row: Record<string, unknown>): Promise<void> {
  const first = await getSupabase().from(table).upsert(row)
  if (!first.error) return
  const missingLocation = 'location' in row && /location does not exist/i.test(first.error.message)
  if (!missingLocation) fail(first.error)
  const rest = { ...row }
  delete rest.location
  fail((await getSupabase().from(table).upsert(rest)).error)
  if (row.location) {
    notify(i18n.t('sync.locationTitle'), i18n.t('sync.locationBody'), 'info')
  }
}

function empty(value: string | undefined): string | null {
  return value ?? null
}

export class SupabaseSchemaError extends Error {
  constructor() {
    super(
      'The Supabase project has no dashboard tables yet. In the Supabase SQL editor, run supabase/migrations/20251116000000_initial_schema.sql, then reload this app.',
    )
    this.name = 'SupabaseSchemaError'
  }
}

function assertSchema(error: { code?: string; message: string } | null): void {
  if (!error) return
  if (error.code === 'PGRST205' || error.message.includes('schema cache')) throw new SupabaseSchemaError()
  throw new Error(error.message)
}

/** True after a full upload has finished. A partial upload stays false and can be retried. */
export async function remoteIsReady(): Promise<boolean> {
  const { data, error } = await getSupabase().from('sync_state').select('ready').eq('id', 'device').maybeSingle()
  assertSchema(error)
  return Boolean((data as { ready?: boolean } | null)?.ready)
}

export async function markRemoteReady(): Promise<void> {
  fail(
    (
      await getSupabase()
        .from('sync_state')
        .upsert({ id: 'device', ready: true, updated_at: new Date().toISOString() })
    ).error,
  )
}

/** True after the one-time removal of the on-device sample rows. */
export async function isFreshStart(): Promise<boolean> {
  const { data, error } = await getSupabase().from('sync_state').select('ready').eq('id', 'fresh-start').maybeSingle()
  assertSchema(error)
  return Boolean((data as { ready?: boolean } | null)?.ready)
}

export async function markFreshStart(): Promise<void> {
  fail(
    (
      await getSupabase()
        .from('sync_state')
        .upsert({ id: 'fresh-start', ready: true, updated_at: new Date().toISOString() })
    ).error,
  )
}

/** Deletes every dashboard row in Supabase. Junction tables have no `id` column. */
export async function discardStoredData(): Promise<void> {
  const supabase = getSupabase()
  const byId = [
    'appointments',
    'yoga_sessions',
    'tasks',
    'media',
    'students',
    'lesson_plans',
    'beauty_packages',
  ]
  for (const table of byId) {
    fail((await supabase.from(table).delete().not('id', 'is', null)).error)
  }
  fail((await supabase.from('student_assigned_plans').delete().not('student_id', 'is', null)).error)
  fail((await supabase.from('lesson_plan_images').delete().not('lesson_plan_id', 'is', null)).error)
  const listed = await supabase.storage.from(BUCKET).list()
  if (!listed.error && listed.data?.length) {
    await supabase.storage.from(BUCKET).remove(listed.data.map((file) => file.name))
  }
}

export async function pushStudent(row: Student): Promise<void> {
  const supabase = getSupabase()
  fail(
    (
      await supabase.from('students').upsert({
        id: row.id,
        name: row.name,
        focus_areas: row.focusAreas ?? [],
        goals: empty(row.goals),
        notes: empty(row.notes),
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      })
    ).error,
  )
  fail((await supabase.from('student_assigned_plans').delete().eq('student_id', row.id)).error)
  if (row.assignedPlanIds.length) {
    fail(
      (
        await supabase.from('student_assigned_plans').insert(
          row.assignedPlanIds.map((lessonPlanId) => ({
            student_id: row.id,
            lesson_plan_id: lessonPlanId,
          })),
        )
      ).error,
    )
  }
}

async function upsertLessonPlan(row: LessonPlan): Promise<void> {
  const supabase = getSupabase()
  fail(
    (
      await supabase.from('lesson_plans').upsert({
        id: row.id,
        title: row.title,
        description: empty(row.description),
        focus_areas: row.focusAreas ?? [],
        level: row.level,
        duration_minutes: row.durationMinutes,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      })
    ).error,
  )
}

async function replacePlanImages(row: LessonPlan): Promise<void> {
  const supabase = getSupabase()
  fail((await supabase.from('lesson_plan_images').delete().eq('lesson_plan_id', row.id)).error)
  if (!row.imageIds.length) return
  fail(
    (
      await supabase.from('lesson_plan_images').insert(
        row.imageIds.map((mediaId, index) => ({
          lesson_plan_id: row.id,
          media_id: mediaId,
          sort_order: index,
        })),
      )
    ).error,
  )
}

export async function pushLessonPlan(row: LessonPlan): Promise<void> {
  await upsertLessonPlan(row)
  await replacePlanImages(row)
}

export async function pushMedia(row: MediaItem): Promise<void> {
  const supabase = getSupabase()
  const path = row.id
  const uploaded = await supabase.storage.from(BUCKET).upload(path, row.blob, {
    contentType: row.type || 'application/octet-stream',
    upsert: true,
  })
  if (uploaded.error) {
    console.warn('Image stayed on this device. Create a private Storage bucket named "media" to sync files.', uploaded.error.message)
  }
  fail(
    (
      await supabase.from('media').upsert({
        id: row.id,
        name: row.name,
        mime_type: row.type,
        byte_size: row.size,
        storage_path: path,
        created_at: row.createdAt,
      })
    ).error,
  )
}

export async function pushSession(row: YogaSession): Promise<void> {
  fail(
    (
      await getSupabase().from('yoga_sessions').upsert({
        id: row.id,
        title: row.title,
        kind: row.kind,
        role: row.role ?? 'teaching',
        start_at: row.start,
        end_at: row.end,
        student_id: empty(row.studentId),
        lesson_plan_id: empty(row.lessonPlanId),
        location: empty(row.location),
        notes: empty(row.notes),
        status: row.status,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      })
    ).error,
  )
}

export async function pushTask(row: Task): Promise<void> {
  fail(
    (
      await getSupabase().from('tasks').upsert({
        id: row.id,
        title: row.title,
        description: empty(row.description),
        board_column: row.column,
        priority: row.priority,
        area: row.area,
        due_date: empty(row.dueDate),
        sort_order: row.order,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      })
    ).error,
  )
}

export async function pushPackage(row: BeautyPackage): Promise<void> {
  await upsert('beauty_packages', {
    id: row.id,
    name: row.name,
    provider: row.provider,
    location: empty(row.location),
    category: row.category,
    total_price: row.totalPrice,
    currency: row.currency,
    sessions_total: row.sessionsTotal,
    sessions_used: row.sessionsUsed,
    purchased_at: row.purchasedAt,
    expires_at: empty(row.expiresAt),
    notes: empty(row.notes),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  })
}

export async function pushAppointment(row: Appointment): Promise<void> {
  await upsert('appointments', {
    id: row.id,
    title: row.title,
    category: row.category,
    provider: row.provider,
    location: empty(row.location),
    start_at: row.start,
    end_at: row.end,
    package_id: empty(row.packageId),
    notes: empty(row.notes),
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  })
}

async function deleteById(table: string, id: string): Promise<void> {
  fail((await getSupabase().from(table).delete().eq('id', id)).error)
}

export async function deleteMedia(id: string): Promise<void> {
  await deleteById('media', id)
  const removed = await getSupabase().storage.from(BUCKET).remove([id])
  if (removed.error) console.warn('Could not remove stored image', removed.error.message)
}

/** Uploads whatever is already in the on-device database. Parents go before rows that point at them. */
export async function pushAllLocal(): Promise<void> {
  const [plans, media, students, sessions, tasks, packages, appointments] = await Promise.all([
    db.lessonPlans.toArray(),
    db.media.toArray(),
    db.students.toArray(),
    db.sessions.toArray(),
    db.tasks.toArray(),
    db.packages.toArray(),
    db.appointments.toArray(),
  ])
  for (const plan of plans) await upsertLessonPlan(plan)
  for (const item of media) await pushMedia(item)
  for (const plan of plans) await replacePlanImages(plan)
  for (const student of students) await pushStudent(student)
  for (const session of sessions) await pushSession(session)
  for (const task of tasks) await pushTask(task)
  for (const pkg of packages) await pushPackage(pkg)
  for (const appointment of appointments) await pushAppointment(appointment)
}

type StudentRow = {
  id: string
  name: string
  focus_areas: string[] | null
  goals: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type PlanRow = {
  id: string
  title: string
  description: string | null
  focus_areas: string[] | null
  level: LessonPlan['level']
  duration_minutes: number
  created_at: string
  updated_at: string
}

type MediaRow = {
  id: string
  name: string
  mime_type: string
  byte_size: number
  storage_path: string
  created_at: string
}

type SessionRow = {
  id: string
  title: string
  kind: YogaSession['kind']
  role?: string | null
  start_at: string
  end_at: string
  student_id: string | null
  lesson_plan_id: string | null
  location: string | null
  notes: string | null
  status: YogaSession['status']
  created_at: string
  updated_at: string
}

type TaskRow = {
  id: string
  title: string
  description: string | null
  board_column: Task['column']
  priority: Task['priority']
  area: Task['area']
  due_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

type PackageRow = {
  id: string
  name: string
  provider: string
  location: string | null
  category: BeautyPackage['category']
  total_price: number | string
  currency: string
  sessions_total: number
  sessions_used: number
  purchased_at: string
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type AppointmentRow = {
  id: string
  title: string
  category: Appointment['category']
  provider: string
  location: string | null
  start_at: string
  end_at: string
  package_id: string | null
  notes: string | null
  status: Appointment['status']
  created_at: string
  updated_at: string
}

function idsByParent(rows: { parent: string; child: string; sort: number }[]): Map<string, string[]> {
  const grouped = new Map<string, { child: string; sort: number }[]>()
  for (const row of rows) {
    const list = grouped.get(row.parent) ?? []
    list.push({ child: row.child, sort: row.sort })
    grouped.set(row.parent, list)
  }
  const result = new Map<string, string[]>()
  for (const [parent, list] of grouped) {
    result.set(
      parent,
      list.sort((a, b) => a.sort - b.sort).map((item) => item.child),
    )
  }
  return result
}

/** Replaces the on-device cache with the current Supabase rows. */
export async function replaceLocalFromRemote(): Promise<void> {
  const supabase = getSupabase()
  const [
    students,
    plans,
    assignments,
    media,
    planImages,
    sessions,
    tasks,
    packages,
    appointments,
    localMedia,
  ] = await Promise.all([
    supabase.from('students').select('*'),
    supabase.from('lesson_plans').select('*'),
    supabase.from('student_assigned_plans').select('student_id, lesson_plan_id'),
    supabase.from('media').select('*'),
    supabase.from('lesson_plan_images').select('lesson_plan_id, media_id, sort_order'),
    supabase.from('yoga_sessions').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('beauty_packages').select('*'),
    supabase.from('appointments').select('*'),
    db.media.toArray(),
  ])
  for (const result of [students, plans, assignments, media, planImages, sessions, tasks, packages, appointments]) {
    assertSchema(result.error)
  }

  const plansByStudent = idsByParent(
    ((assignments.data ?? []) as { student_id: string; lesson_plan_id: string }[]).map((row) => ({
      parent: row.student_id,
      child: row.lesson_plan_id,
      sort: 0,
    })),
  )
  const imagesByPlan = idsByParent(
    ((planImages.data ?? []) as { lesson_plan_id: string; media_id: string; sort_order: number }[]).map((row) => ({
      parent: row.lesson_plan_id,
      child: row.media_id,
      sort: row.sort_order,
    })),
  )
  const localBlobs = new Map(localMedia.map((item) => [item.id, item.blob]))

  const mediaItems: MediaItem[] = []
  for (const row of (media.data ?? []) as MediaRow[]) {
    let blob = localBlobs.get(row.id)
    const downloaded = await supabase.storage.from(BUCKET).download(row.storage_path)
    if (downloaded.data) blob = downloaded.data
    if (!blob) continue
    mediaItems.push({
      id: row.id,
      name: row.name,
      type: row.mime_type,
      size: Number(row.byte_size),
      blob,
      createdAt: row.created_at,
    })
  }
  const mediaIds = new Set(mediaItems.map((item) => item.id))

  const nextStudents: Student[] = ((students.data ?? []) as StudentRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    focusAreas: row.focus_areas ?? [],
    goals: row.goals ?? undefined,
    notes: row.notes ?? undefined,
    assignedPlanIds: plansByStudent.get(row.id) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  const nextPlans: LessonPlan[] = ((plans.data ?? []) as PlanRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    focusAreas: row.focus_areas ?? [],
    level: row.level,
    durationMinutes: row.duration_minutes,
    imageIds: (imagesByPlan.get(row.id) ?? []).filter((id) => mediaIds.has(id)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  const nextSessions: YogaSession[] = ((sessions.data ?? []) as SessionRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    role: row.role === 'attending' ? 'attending' : 'teaching',
    start: row.start_at,
    end: row.end_at,
    studentId: row.student_id ?? undefined,
    lessonPlanId: row.lesson_plan_id ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  const nextTasks: Task[] = ((tasks.data ?? []) as TaskRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    column: row.board_column,
    priority: row.priority,
    area: row.area,
    dueDate: row.due_date ?? undefined,
    order: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  const nextPackages: BeautyPackage[] = ((packages.data ?? []) as PackageRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    provider: row.provider,
    location: row.location ?? undefined,
    category: row.category,
    totalPrice: Number(row.total_price),
    currency: row.currency,
    sessionsTotal: row.sessions_total,
    sessionsUsed: row.sessions_used,
    purchasedAt: row.purchased_at,
    expiresAt: row.expires_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  const nextAppointments: Appointment[] = ((appointments.data ?? []) as AppointmentRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    provider: row.provider,
    location: row.location ?? undefined,
    start: row.start_at,
    end: row.end_at,
    packageId: row.package_id ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  setRemoteMuted(true)
  try {
    await db.transaction(
      'rw',
      [db.students, db.lessonPlans, db.sessions, db.tasks, db.packages, db.appointments, db.media],
      async () => {
        await Promise.all([
          db.students.clear(),
          db.lessonPlans.clear(),
          db.sessions.clear(),
          db.tasks.clear(),
          db.packages.clear(),
          db.appointments.clear(),
          db.media.clear(),
        ])
        if (nextStudents.length) await db.students.bulkAdd(nextStudents)
        if (nextPlans.length) await db.lessonPlans.bulkAdd(nextPlans)
        if (nextSessions.length) await db.sessions.bulkAdd(nextSessions)
        if (nextTasks.length) await db.tasks.bulkAdd(nextTasks)
        if (nextPackages.length) await db.packages.bulkAdd(nextPackages)
        if (nextAppointments.length) await db.appointments.bulkAdd(nextAppointments)
        if (mediaItems.length) await db.media.bulkAdd(mediaItems)
      },
    )
  } finally {
    setRemoteMuted(false)
  }
}

function watch<T extends { id: string }>(
  table: {
    hook(
      event: 'creating',
      callback: (this: { onsuccess?: (key: string) => void }, key: string, obj: T) => void,
    ): void
    hook(
      event: 'updating',
      callback: (this: { onsuccess?: (obj: T) => void }, mods: Partial<T>, key: string, obj: T) => void,
    ): void
    hook(
      event: 'deleting',
      callback: (this: { onsuccess?: () => void }, key: string) => void,
    ): void
  },
  push: (row: T) => Promise<void>,
  remove: (id: string) => Promise<void>,
): void {
  const skip = () => isRemoteMuted() || !isSupabaseConfigured()
  table.hook('creating', function (_key, obj) {
    if (skip()) return
    const row = structuredClone(obj)
    this.onsuccess = () => enqueue(() => push(row))
  })
  table.hook('updating', function (mods, _key, obj) {
    if (skip()) return
    const row = structuredClone({ ...obj, ...mods })
    this.onsuccess = () => enqueue(() => push(row))
  })
  table.hook('deleting', function (key) {
    if (skip()) return
    const id = String(key)
    this.onsuccess = () => enqueue(() => remove(id))
  })
}

let installed = false

/** Mirrors later local edits to Supabase. Safe to call more than once. */
export function installSync(): void {
  if (installed) return
  installed = true
  watch<Student>(db.students, pushStudent, (id) => deleteById('students', id))
  watch<LessonPlan>(db.lessonPlans, pushLessonPlan, (id) => deleteById('lesson_plans', id))
  watch<MediaItem>(db.media, pushMedia, deleteMedia)
  watch<YogaSession>(db.sessions, pushSession, (id) => deleteById('yoga_sessions', id))
  watch<Task>(db.tasks, pushTask, (id) => deleteById('tasks', id))
  watch<BeautyPackage>(db.packages, pushPackage, (id) => deleteById('beauty_packages', id))
  watch<Appointment>(db.appointments, pushAppointment, (id) => deleteById('appointments', id))
}
