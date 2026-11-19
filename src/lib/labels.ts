import { useTranslation } from 'react-i18next'
import type { SelectItem } from '@/components/ui/Select'
import type {
  AppointmentCategory,
  AppointmentStatus,
  PlanLevel,
  SessionKind,
  SessionRole,
  SessionStatus,
  TaskArea,
  TaskColumn,
  TaskPriority,
} from '@/db/types'
import type { PackageStatus } from '@/lib/packages'

export const TASK_COLUMN_ORDER: TaskColumn[] = ['todo', 'doing', 'done']

const KIND_KEY: Record<SessionKind, string> = {
  'one-on-one': 'kind.oneOnOne',
  'group-class': 'kind.group',
  workshop: 'kind.workshop',
  'self-practice': 'kind.self',
}
const ROLE_KEY: Record<SessionRole, string> = {
  teaching: 'role.teaching',
  attending: 'role.attending',
}
const SESSION_STATUS_KEY: Record<SessionStatus, string> = {
  planned: 'sessionStatus.planned',
  tbc: 'sessionStatus.tbc',
  done: 'sessionStatus.done',
  cancelled: 'sessionStatus.cancelled',
}
const CATEGORY_KEY: Record<AppointmentCategory, string> = {
  facial: 'categoryLabel.facial',
  hair: 'categoryLabel.hair',
  nails: 'categoryLabel.nails',
  massage: 'categoryLabel.massage',
  body: 'categoryLabel.body',
  medical: 'categoryLabel.medical',
  other: 'categoryLabel.other',
}
const APPOINTMENT_STATUS_KEY: Record<AppointmentStatus, string> = {
  upcoming: 'appointmentStatus.upcoming',
  tbc: 'appointmentStatus.tbc',
  done: 'appointmentStatus.done',
  cancelled: 'appointmentStatus.cancelled',
}
const LEVEL_KEY: Record<PlanLevel, string> = {
  beginner: 'level.beginner',
  intermediate: 'level.intermediate',
  advanced: 'level.advanced',
  'all-levels': 'level.all',
}
const PRIORITY_KEY: Record<TaskPriority, string> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
}
const AREA_KEY: Record<TaskArea, string> = {
  yoga: 'area.yoga',
  appointments: 'area.appointments',
}
const COLUMN_TITLE: Record<TaskColumn, string> = {
  todo: 'column.todo',
  doing: 'column.doing',
  done: 'column.done',
}
const COLUMN_HINT: Record<TaskColumn, string> = {
  todo: 'column.todoHint',
  doing: 'column.doingHint',
  done: 'column.doneHint',
}
const PACKAGE_STATUS_KEY: Record<PackageStatus, string> = {
  active: 'packageStatus.active',
  completed: 'packageStatus.completed',
  expired: 'packageStatus.expired',
  expiring: 'packageStatus.expiring',
}
const DURATION_KEY: Record<string, string> = {
  '30': 'duration.m30',
  '45': 'duration.m45',
  '60': 'duration.m60',
  '75': 'duration.m75',
  '90': 'duration.m90',
  '120': 'duration.m120',
  '180': 'duration.m180',
}

function items<V extends string>(map: Record<V, string>, t: (key: string) => string): SelectItem<V>[] {
  return (Object.keys(map) as V[]).map((value) => ({ value, label: t(map[value]) }))
}

function dictionary<V extends string>(list: SelectItem<V>[]): Record<V, string> {
  return Object.fromEntries(list.map((item) => [item.value, item.label])) as Record<V, string>
}

/** Translated dropdowns and badges. Call inside a component so the language switch updates them. */
export function useAppLabels() {
  const { t } = useTranslation()
  const sessionKinds = items(KIND_KEY, t)
  const categories = items(CATEGORY_KEY, t)
  const planLevels = items(LEVEL_KEY, t)
  const taskAreas = items(AREA_KEY, t)
  const durations = items(DURATION_KEY, t)
  return {
    sessionKinds,
    sessionKindLabel: dictionary(sessionKinds),
    sessionRoles: items(ROLE_KEY, t),
    sessionStatuses: items(SESSION_STATUS_KEY, t),
    categories,
    categoryLabel: dictionary(categories),
    appointmentStatuses: items(APPOINTMENT_STATUS_KEY, t),
    planLevels,
    planLevelLabel: dictionary(planLevels),
    taskColumnItems: TASK_COLUMN_ORDER.map((value) => ({ value, label: t(COLUMN_TITLE[value]) })),
    columnTitle: Object.fromEntries(TASK_COLUMN_ORDER.map((id) => [id, t(COLUMN_TITLE[id])])) as Record<TaskColumn, string>,
    columnHint: Object.fromEntries(TASK_COLUMN_ORDER.map((id) => [id, t(COLUMN_HINT[id])])) as Record<TaskColumn, string>,
    taskPriorities: items(PRIORITY_KEY, t),
    taskAreas,
    durations,
    packageStatusLabel: Object.fromEntries(
      (Object.keys(PACKAGE_STATUS_KEY) as PackageStatus[]).map((status) => [status, t(PACKAGE_STATUS_KEY[status])]),
    ) as Record<PackageStatus, string>,
  }
}
