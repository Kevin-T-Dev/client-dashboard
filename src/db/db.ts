import Dexie, { type EntityTable } from 'dexie'
import type {
  Appointment,
  BeautyPackage,
  LessonPlan,
  MediaItem,
  MetaEntry,
  Student,
  Task,
  YogaSession,
} from './types'

export const db = new Dexie('client-dashboard') as Dexie & {
  sessions: EntityTable<YogaSession, 'id'>
  students: EntityTable<Student, 'id'>
  tasks: EntityTable<Task, 'id'>
  lessonPlans: EntityTable<LessonPlan, 'id'>
  media: EntityTable<MediaItem, 'id'>
  appointments: EntityTable<Appointment, 'id'>
  packages: EntityTable<BeautyPackage, 'id'>
  meta: EntityTable<MetaEntry, 'key'>
}

db.version(1).stores({
  sessions: 'id, start, studentId, lessonPlanId, status',
  students: 'id, name',
  tasks: 'id, column, order, area, dueDate',
  lessonPlans: 'id, title',
  media: 'id',
  appointments: 'id, start, packageId, provider, status',
  packages: 'id, provider',
  meta: 'key',
})
