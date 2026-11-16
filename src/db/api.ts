import type { EntityTable, IDType, InsertType, UpdateSpec } from 'dexie'
import { db } from './db'
import type { ID, Stamped } from './types'

export function newId(): ID {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export type CreateInput<T extends Stamped> = Omit<T, keyof Stamped>

/** Small CRUD wrapper that stamps ids and timestamps. */
function makeApi<T extends Stamped>(table: EntityTable<T, 'id'>) {
  return {
    async create(input: CreateInput<T>): Promise<ID> {
      const id = newId()
      const ts = nowIso()
      const record = { ...input, id, createdAt: ts, updatedAt: ts } as unknown as InsertType<T, 'id'>
      await table.add(record)
      return id
    },
    update(id: ID, patch: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<number> {
      const spec = { ...patch, updatedAt: nowIso() } as unknown as UpdateSpec<InsertType<T, 'id'>>
      return table.update(id as IDType<T, 'id'>, spec)
    },
    remove(id: ID): Promise<void> {
      return table.delete(id as IDType<T, 'id'>)
    },
  }
}

export const sessionsApi = makeApi(db.sessions)
export const studentsApi = makeApi(db.students)
export const tasksApi = makeApi(db.tasks)
export const lessonPlansApi = makeApi(db.lessonPlans)
export const appointmentsApi = makeApi(db.appointments)
export const packagesApi = makeApi(db.packages)

/** Deletes a lesson plan together with its uploaded images and student assignments. */
export async function deleteLessonPlanDeep(id: ID): Promise<void> {
  await db.transaction('rw', [db.lessonPlans, db.media, db.students, db.sessions], async () => {
    const plan = await db.lessonPlans.get(id)
    if (plan?.imageIds.length) await db.media.bulkDelete(plan.imageIds)
    const students = await db.students.toArray()
    for (const s of students) {
      if (s.assignedPlanIds.includes(id)) {
        await db.students.update(s.id, {
          assignedPlanIds: s.assignedPlanIds.filter((p) => p !== id),
          updatedAt: nowIso(),
        })
      }
    }
    await db.sessions.where('lessonPlanId').equals(id).modify({ lessonPlanId: undefined })
    await db.lessonPlans.delete(id)
  })
}

/** Deletes a student and detaches them from their sessions. */
export async function deleteStudentDeep(id: ID): Promise<void> {
  await db.transaction('rw', [db.students, db.sessions], async () => {
    await db.sessions.where('studentId').equals(id).modify({ studentId: undefined })
    await db.students.delete(id)
  })
}

/** Deletes a package and detaches it from its appointments. */
export async function deletePackageDeep(id: ID): Promise<void> {
  await db.transaction('rw', [db.packages, db.appointments], async () => {
    await db.appointments.where('packageId').equals(id).modify({ packageId: undefined })
    await db.packages.delete(id)
  })
}

/** Stores an image blob and returns its id. */
export async function addMedia(blob: Blob, name: string): Promise<ID> {
  const id = newId()
  await db.media.add({ id, name, type: blob.type, size: blob.size, blob, createdAt: nowIso() })
  return id
}
