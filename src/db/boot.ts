import { db } from '@/db/db'
import { installSync, replaceLocalFromRemote, setRemoteMuted } from '@/db/remote'
import { seedIfEmpty } from '@/db/seed'
import { isSupabaseConfigured } from '@/lib/supabase'

let boot: Promise<void> | null = null

/**
 * Opens the dashboard database.
 * With Supabase configured, the cloud copy is the only source of truth.
 * Cloud startup only reads Supabase, including on the first launch.
 */
export function bootDatabase(): Promise<void> {
  if (!boot) {
    boot = (async () => {
      installSync()
      if (!isSupabaseConfigured()) {
        await seedIfEmpty()
        return
      }
      await replaceLocalFromRemote()
    })()
  }
  return boot
}

/** Drops the on-device cache without echoing those deletes back to Supabase. Also used at sign-out. */
export async function clearLocalCache(): Promise<void> {
  setRemoteMuted(true)
  try {
    await db.transaction(
      'rw',
      [db.students, db.lessonPlans, db.sessions, db.tasks, db.packages, db.appointments, db.media, db.meta],
      async () => {
        await Promise.all([
          db.students.clear(),
          db.lessonPlans.clear(),
          db.sessions.clear(),
          db.tasks.clear(),
          db.packages.clear(),
          db.appointments.clear(),
          db.media.clear(),
          db.meta.clear(),
        ])
      },
    )
  } finally {
    setRemoteMuted(false)
  }
}
