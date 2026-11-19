export type ID = string

/** Fields every stored record carries. */
export interface Stamped {
  id: ID
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Yoga                                                                */
/* ------------------------------------------------------------------ */

export type SessionKind = 'one-on-one' | 'group-class' | 'workshop' | 'self-practice'
export type SessionStatus = 'planned' | 'done' | 'cancelled'
/** Whether Kelly teaches the session or attends it as a student. */
export type SessionRole = 'teaching' | 'attending'

export interface YogaSession extends Stamped {
  title: string
  kind: SessionKind
  /** Missing on rows saved before roles existed; those are teaching. */
  role?: SessionRole
  /** ISO date-time */
  start: string
  /** ISO date-time */
  end: string
  studentId?: ID
  lessonPlanId?: ID
  location?: string
  notes?: string
  status: SessionStatus
}

export interface Student extends Stamped {
  name: string
  /** Body conditions / goals as tags, e.g. "lower back", "flexibility". */
  focusAreas: string[]
  goals?: string
  notes?: string
  assignedPlanIds: ID[]
}

export type TaskColumn = 'todo' | 'doing' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskArea = 'yoga' | 'appointments'

export interface Task extends Stamped {
  title: string
  description?: string
  column: TaskColumn
  priority: TaskPriority
  area: TaskArea
  /** yyyy-MM-dd */
  dueDate?: string
  order: number
}

export type PlanLevel = 'beginner' | 'intermediate' | 'advanced' | 'all-levels'

export interface LessonPlan extends Stamped {
  title: string
  description?: string
  focusAreas: string[]
  level: PlanLevel
  durationMinutes: number
  imageIds: ID[]
}

export interface MediaItem {
  id: ID
  name: string
  type: string
  size: number
  blob: Blob
  createdAt: string
}

/* ------------------------------------------------------------------ */
/* Appointments                                                        */
/* ------------------------------------------------------------------ */

export type AppointmentCategory =
  | 'facial'
  | 'hair'
  | 'nails'
  | 'massage'
  | 'body'
  | 'medical'
  | 'other'
export type AppointmentStatus = 'upcoming' | 'done' | 'cancelled'

export interface Appointment extends Stamped {
  title: string
  category: AppointmentCategory
  /** Store, salon or clinic name */
  provider: string
  /** Address or room, when the store name is not the place itself */
  location?: string
  start: string
  end: string
  packageId?: ID
  notes?: string
  status: AppointmentStatus
}

export interface BeautyPackage extends Stamped {
  name: string
  provider: string
  /** Address or room, when the store name is not the place itself */
  location?: string
  category: AppointmentCategory
  totalPrice: number
  currency: string
  sessionsTotal: number
  sessionsUsed: number
  /** yyyy-MM-dd */
  purchasedAt: string
  /** yyyy-MM-dd */
  expiresAt?: string
  notes?: string
}

export interface MetaEntry {
  key: string
  value: string
}
