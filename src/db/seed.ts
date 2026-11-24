import { addDays, addMonths, format, startOfWeek, subMonths } from 'date-fns'
import { newId, nowIso } from './api'
import { db } from './db'
import type {
  Appointment,
  BeautyPackage,
  LessonPlan,
  Student,
  Task,
  YogaSession,
} from './types'
import { buildRange, DAY_KEY } from '@/lib/dates'

const SEED_KEY = 'seeded'
const SEED_TABLES = [db.students, db.lessonPlans, db.sessions, db.tasks, db.packages, db.appointments, db.meta]

let inFlight: Promise<boolean> | null = null

/**
 * Fills the local database with realistic sample data the first time the app
 * runs. Dates are generated relative to the current week so the dashboard
 * always looks alive. Safe to call concurrently (React StrictMode runs effects
 * twice in development): the check and the writes share one transaction.
 */
export function seedIfEmpty(): Promise<boolean> {
  if (!inFlight) {
    inFlight = db
      .transaction('rw', SEED_TABLES, async () => {
        const already = await db.meta.get(SEED_KEY)
        if (already) return false
        await writeSeedData()
        return true
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

async function writeSeedData(): Promise<void> {
  const ts = nowIso()
  const stamp = () => ({ id: newId(), createdAt: ts, updatedAt: ts })
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const day = (offset: number) => format(addDays(monday, offset), DAY_KEY)
  const monthsAgo = (n: number) => format(subMonths(new Date(), n), DAY_KEY)
  const monthsAhead = (n: number) => format(addMonths(new Date(), n), DAY_KEY)
  const daysAhead = (n: number) => format(addDays(new Date(), n), DAY_KEY)

  /* Students -------------------------------------------------------- */
  const mei: Student = {
    ...stamp(),
    name: 'Mei Lin',
    focusAreas: ['lower back', 'posture', 'desk work'],
    goals: 'Ease lower-back stiffness from long office hours; build a short daily routine.',
    notes: 'Prefers morning sessions. Avoid deep backbends for now.',
    assignedPlanIds: [],
  }
  const daniel: Student = {
    ...stamp(),
    name: 'Daniel Ho',
    focusAreas: ['hamstrings', 'flexibility', 'running recovery', 'hips'],
    goals: 'Marathon in spring; wants better hamstring and hip mobility.',
    assignedPlanIds: [],
  }
  const priya: Student = {
    ...stamp(),
    name: 'Priya Nair',
    focusAreas: ['stress relief', 'sleep', 'breathing'],
    goals: 'Wind down after work and sleep through the night.',
    notes: 'Online sessions on weekdays.',
    assignedPlanIds: [],
  }
  const rose: Student = {
    ...stamp(),
    name: 'Aunty Rose',
    focusAreas: ['knees', 'balance', 'senior-friendly'],
    goals: 'Stay steady on her feet and keep the knees comfortable.',
    notes: 'Chair available. Keep transitions slow.',
    assignedPlanIds: [],
  }

  /* Lesson plans ---------------------------------------------------- */
  const plans: LessonPlan[] = [
    {
      ...stamp(),
      title: 'Gentle Lower Back Release',
      description:
        'Cat-cow, supported child pose, supine twists and a long bridge hold. Finish with legs-up-the-wall.',
      focusAreas: ['lower back', 'hips', 'posture', 'desk work'],
      level: 'beginner',
      durationMinutes: 60,
      imageIds: [],
    },
    {
      ...stamp(),
      title: 'Hip Opening Flow',
      description: 'Low lunge series, lizard, pigeon and bound angle with breath counts.',
      focusAreas: ['hips', 'flexibility', 'hamstrings'],
      level: 'all-levels',
      durationMinutes: 60,
      imageIds: [],
    },
    {
      ...stamp(),
      title: 'Calm Evening Wind-Down',
      description: 'Slow yin holds, 4-7-8 breathing and a 10-minute guided relaxation.',
      focusAreas: ['stress relief', 'sleep', 'breathing'],
      level: 'beginner',
      durationMinutes: 45,
      imageIds: [],
    },
    {
      ...stamp(),
      title: 'Core & Posture Builder',
      description: 'Plank variations, boat pose, locust and standing alignment drills.',
      focusAreas: ['core strength', 'posture', 'lower back'],
      level: 'intermediate',
      durationMinutes: 60,
      imageIds: [],
    },
    {
      ...stamp(),
      title: 'Balance for Everyday',
      description: 'Chair-supported tree pose, heel raises, gentle warrior shapes and slow walking meditation.',
      focusAreas: ['balance', 'knees', 'senior-friendly'],
      level: 'beginner',
      durationMinutes: 45,
      imageIds: [],
    },
    {
      ...stamp(),
      title: "Runner's Recovery Stretch",
      description: 'Calf and hamstring sequence, half splits, reclined figure-four and foam-roller cues.',
      focusAreas: ['hamstrings', 'flexibility', 'running recovery', 'hips'],
      level: 'all-levels',
      durationMinutes: 50,
      imageIds: [],
    },
  ]
  const [backRelease, , windDown, , balancePlan, runnerStretch] = plans
  mei.assignedPlanIds = [backRelease.id]
  daniel.assignedPlanIds = [runnerStretch.id]
  priya.assignedPlanIds = [windDown.id]
  rose.assignedPlanIds = [balancePlan.id]

  /* Yoga sessions --------------------------------------------------- */
  const session = (
    offset: number,
    time: string,
    minutes: number,
    rest: Omit<YogaSession, 'id' | 'createdAt' | 'updatedAt' | 'start' | 'end'>,
  ): YogaSession => ({ ...stamp(), ...buildRange(day(offset), time, minutes), ...rest })

  const sessions: YogaSession[] = [
    session(-5, '10:00', 60, {
      title: '1-on-1 with Mei Lin',
      kind: 'one-on-one',
      studentId: mei.id,
      lessonPlanId: backRelease.id,
      location: 'Home studio',
      status: 'done',
    }),
    session(-3, '18:30', 75, {
      title: 'Evening Vinyasa',
      kind: 'group-class',
      location: 'Lotus Studio, Room B',
      status: 'done',
    }),
    session(-1, '07:00', 30, { title: 'Self practice', kind: 'self-practice', status: 'done' }),
    session(0, '09:00', 60, {
      title: '1-on-1 with Mei Lin',
      kind: 'one-on-one',
      studentId: mei.id,
      lessonPlanId: backRelease.id,
      location: 'Home studio',
      notes: 'Check in on the morning routine; add a standing forward fold if the back feels fine.',
      status: 'planned',
    }),
    session(1, '18:30', 75, {
      title: 'Evening Vinyasa',
      kind: 'group-class',
      location: 'Lotus Studio, Room B',
      notes: '12 signed up so far.',
      status: 'planned',
    }),
    session(2, '10:00', 60, {
      title: '1-on-1 with Daniel',
      kind: 'one-on-one',
      studentId: daniel.id,
      lessonPlanId: runnerStretch.id,
      location: 'Home studio',
      status: 'planned',
    }),
    session(2, '19:30', 60, {
      title: 'Hatha with Teacher Anna',
      kind: 'group-class',
      role: 'attending',
      location: 'Pelangi Yoga',
      status: 'planned',
    }),
    session(3, '19:00', 60, {
      title: 'Yin & Restore',
      kind: 'group-class',
      location: 'Lotus Studio, Room A',
      status: 'planned',
    }),
    session(4, '08:00', 60, {
      title: 'Online 1-on-1 with Priya',
      kind: 'one-on-one',
      studentId: priya.id,
      lessonPlanId: windDown.id,
      location: 'Online (Zoom)',
      status: 'planned',
    }),
    session(5, '08:00', 120, {
      title: 'Weekend Flow Workshop',
      kind: 'workshop',
      location: 'Community Hall',
      notes: 'Bring 6 spare blocks and the playlist.',
      status: 'planned',
    }),
    session(7, '09:00', 60, {
      title: '1-on-1 with Aunty Rose',
      kind: 'one-on-one',
      studentId: rose.id,
      lessonPlanId: balancePlan.id,
      location: "Client's home",
      status: 'planned',
    }),
    session(8, '18:30', 75, {
      title: 'Evening Vinyasa',
      kind: 'group-class',
      location: 'Lotus Studio, Room B',
      status: 'planned',
    }),
    session(10, '19:00', 60, {
      title: 'Yin & Restore',
      kind: 'group-class',
      location: 'Lotus Studio, Room A',
      status: 'planned',
    }),
  ]

  /* Tasks ----------------------------------------------------------- */
  const task = (order: number, rest: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Task => ({
    ...stamp(),
    order,
    ...rest,
  })
  const tasks: Task[] = [
    task(0, {
      title: 'Design 6-week beginner course outline',
      description: 'Theme per week, one peak pose each, homework sheet.',
      column: 'todo',
      priority: 'medium',
      area: 'yoga',
    }),
    task(1, {
      title: 'Record short demo videos for the lesson plans',
      column: 'todo',
      priority: 'low',
      area: 'yoga',
    }),
    task(2, {
      title: 'Buy 6 new yoga blocks for the workshop',
      column: 'todo',
      priority: 'high',
      area: 'yoga',
      dueDate: day(4),
    }),
    task(3, {
      title: 'Send Mei Lin her homework stretches',
      column: 'todo',
      priority: 'medium',
      area: 'yoga',
      dueDate: day(1),
    }),
    task(4, {
      title: 'Ask Glow Studio how many facial sessions are left',
      column: 'todo',
      priority: 'medium',
      area: 'appointments',
      dueDate: day(3),
    }),
    task(5, {
      title: 'Prepare a prenatal-safe sequence for Priya',
      description: 'Priya mentioned a friend who may join; keep an alternative for each pose.',
      column: 'doing',
      priority: 'high',
      area: 'yoga',
      dueDate: day(4),
    }),
    task(6, {
      title: 'Renew studio insurance',
      column: 'done',
      priority: 'high',
      area: 'yoga',
    }),
    task(7, {
      title: 'Update the class playlist',
      column: 'done',
      priority: 'low',
      area: 'yoga',
    }),
  ]

  /* Packages -------------------------------------------------------- */
  const pkg = (rest: Omit<BeautyPackage, 'id' | 'createdAt' | 'updatedAt'>): BeautyPackage => ({
    ...stamp(),
    ...rest,
  })
  const facialPkg = pkg({
    name: 'Hydra Glow Facial x10',
    provider: 'Glow Studio',
    category: 'facial',
    totalPrice: 1280,
    currency: 'MYR',
    sessionsTotal: 10,
    sessionsUsed: 4,
    purchasedAt: monthsAgo(2),
    expiresAt: monthsAhead(8),
    notes: 'Includes one free LED add-on per visit. Ask for Jen.',
  })
  const massagePkg = pkg({
    name: 'Deep Tissue Massage x5',
    provider: 'Serenity Spa',
    category: 'massage',
    totalPrice: 450,
    currency: 'MYR',
    sessionsTotal: 5,
    sessionsUsed: 5,
    purchasedAt: monthsAgo(6),
    expiresAt: monthsAhead(2),
  })
  const keratinPkg = pkg({
    name: 'Keratin Treatment x3',
    provider: 'Salon Mira',
    category: 'hair',
    totalPrice: 690,
    currency: 'MYR',
    sessionsTotal: 3,
    sessionsUsed: 1,
    purchasedAt: monthsAgo(5),
    expiresAt: daysAhead(20),
    notes: 'Signed during the anniversary promo. Non-transferable.',
  })
  const lashPkg = pkg({
    name: 'Lash Lift x6',
    provider: 'Lash Bar',
    category: 'body',
    totalPrice: 360,
    currency: 'MYR',
    sessionsTotal: 6,
    sessionsUsed: 2,
    purchasedAt: monthsAgo(10),
    expiresAt: monthsAgo(1),
  })
  const nailPkg = pkg({
    name: 'Gel Manicure x8',
    provider: 'Nail Loft',
    category: 'nails',
    totalPrice: 320,
    currency: 'MYR',
    sessionsTotal: 8,
    sessionsUsed: 3,
    purchasedAt: monthsAgo(1),
    expiresAt: monthsAhead(11),
  })
  // Package with incomplete data to demonstrate "incomplete" status
  const incompletePkg = pkg({
    name: 'Trial Facial Package',
    provider: 'New Spa',
    category: 'facial',
    // Missing: totalPrice, currency, sessionsTotal, sessionsUsed, purchasedAt
    expiresAt: monthsAhead(3),
    notes: 'Still need to confirm pricing and sessions.',
  })
  const packages = [facialPkg, massagePkg, keratinPkg, lashPkg, nailPkg, incompletePkg]

  /* Appointments ---------------------------------------------------- */
  const appt = (
    offset: number,
    time: string,
    minutes: number,
    rest: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'start' | 'end'>,
  ): Appointment => ({ ...stamp(), ...buildRange(day(offset), time, minutes), ...rest })

  const appointments: Appointment[] = [
    appt(-9, '10:00', 60, {
      title: 'Dental check-up',
      category: 'medical',
      provider: 'Smile Clinic',
      status: 'done',
    }),
    appt(-4, '14:00', 60, {
      title: 'Hydra Glow Facial',
      category: 'facial',
      provider: 'Glow Studio',
      packageId: facialPkg.id,
      status: 'done',
    }),
    appt(4, '14:00', 60, {
      title: 'Hydra Glow Facial',
      category: 'facial',
      provider: 'Glow Studio',
      packageId: facialPkg.id,
      notes: 'Ask about the new collagen mask.',
      status: 'upcoming',
    }),
    appt(8, '11:00', 120, {
      title: 'Keratin treatment',
      category: 'hair',
      provider: 'Salon Mira',
      packageId: keratinPkg.id,
      status: 'upcoming',
    }),
    appt(10, '17:30', 90, {
      title: 'Deep tissue massage',
      category: 'massage',
      provider: 'Serenity Spa',
      notes: 'Package is used up. Decide whether to renew.',
      status: 'upcoming',
    }),
    appt(12, '15:00', 45, {
      title: 'Gel manicure',
      category: 'nails',
      provider: 'Nail Loft',
      packageId: nailPkg.id,
      status: 'upcoming',
    }),
  ]

  await db.students.bulkAdd([mei, daniel, priya, rose])
  await db.lessonPlans.bulkAdd(plans)
  await db.sessions.bulkAdd(sessions)
  await db.tasks.bulkAdd(tasks)
  await db.packages.bulkAdd(packages)
  await db.appointments.bulkAdd(appointments)
  await db.meta.put({ key: SEED_KEY, value: ts })
}

/** Wipes every table and re-seeds. Used by the "Reset sample data" action. */
export async function resetAndReseed(): Promise<void> {
  await db.transaction('rw', [...SEED_TABLES, db.media], async () => {
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
    await writeSeedData()
  })
}
